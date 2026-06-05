from __future__ import annotations

import logging
import threading
from datetime import datetime, timedelta
from typing import Any

import httpx
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import (
    ADMIN_EMAILS,
    EXPO_PUSH_URL,
    NOTIFICATION_SCHEDULER_ENABLED,
    NOTIFICATION_SCHEDULER_INITIAL_DELAY_SECONDS,
    NOTIFICATION_SCHEDULER_INTERVAL_SECONDS,
    NOTIFICATION_TASK_LOOKAHEAD_MINUTES,
    NOTIFICATION_TASK_PAST_DUE_GRACE_MINUTES,
)
from app.database import SessionLocal
from app.models.domain import CareTask, Notification, NotificationDelivery, PushToken, User

logger = logging.getLogger("leafscan.notifications")

_scheduler_thread: threading.Thread | None = None
_scheduler_stop = threading.Event()


def _now() -> datetime:
    return datetime.utcnow()


def _is_expo_push_token(token: str) -> bool:
    return token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")


def register_push_token(
    db: Session,
    *,
    user_id: int,
    token: str,
    platform: str | None = None,
    device_id: str | None = None,
) -> PushToken:
    cleaned_token = token.strip()
    if not _is_expo_push_token(cleaned_token):
        raise ValueError("Expo push token không hợp lệ.")

    row = db.query(PushToken).filter(PushToken.token == cleaned_token).first()
    if row is None:
        row = PushToken(user_id=user_id, token=cleaned_token)
        db.add(row)

    row.user_id = user_id
    row.platform = platform
    row.device_id = device_id
    row.is_active = True
    row.last_registered_at = _now()
    row.updated_at = _now()
    db.flush()
    return row


def unregister_push_token(db: Session, *, user_id: int, token: str | None = None) -> int:
    query = db.query(PushToken).filter(PushToken.user_id == user_id, PushToken.is_active == True)  # noqa: E712
    if token:
        query = query.filter(PushToken.token == token.strip())

    rows = query.all()
    for row in rows:
        row.is_active = False
        row.updated_at = _now()
    db.flush()
    return len(rows)


def notification_status(db: Session, *, user_id: int) -> dict[str, Any]:
    rows = (
        db.query(PushToken)
        .filter(PushToken.user_id == user_id, PushToken.is_active == True)  # noqa: E712
        .order_by(PushToken.last_registered_at.desc())
        .all()
    )
    latest = rows[0].last_registered_at if rows else None
    return {
        "enabled": bool(rows),
        "active_token_count": len(rows),
        "latest_registered_at": latest,
    }


def create_notification(
    db: Session,
    *,
    user_id: int,
    notification_type: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
    event_key: str | None = None,
) -> Notification | None:
    if event_key:
        existing = db.query(Notification).filter(Notification.event_key == event_key).first()
        if existing:
            return existing
    row = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        body=body,
        data=data or {},
        event_key=event_key,
    )
    db.add(row)
    db.flush()
    return row


def notify_admins(
    db: Session,
    *,
    notification_type: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
    event_key_prefix: str | None = None,
) -> int:
    admin_emails = [email.strip().lower() for email in ADMIN_EMAILS if email.strip()]
    if not admin_emails:
        return 0
    admins = db.query(User).filter(User.email.in_(admin_emails)).all()
    created = 0
    for admin in admins:
        event_key = f"{event_key_prefix}:admin:{admin.id}" if event_key_prefix else None
        if create_notification(
            db,
            user_id=admin.id,
            notification_type=notification_type,
            title=title,
            body=body,
            data=data,
            event_key=event_key,
        ):
            created += 1
    return created


def _active_tokens(db: Session, user_id: int) -> list[PushToken]:
    return (
        db.query(PushToken)
        .filter(PushToken.user_id == user_id, PushToken.is_active == True)  # noqa: E712
        .order_by(PushToken.last_registered_at.desc())
        .all()
    )


def _post_expo_push(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not messages:
        return []

    response = httpx.post(
        EXPO_PUSH_URL,
        json=messages,
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        timeout=12.0,
    )
    response.raise_for_status()
    payload = response.json()
    if isinstance(payload, dict) and isinstance(payload.get("data"), list):
        return payload["data"]
    if isinstance(payload, list):
        return payload
    return [{"status": "error", "message": "Unexpected Expo push response", "raw": payload}]


def _disable_device_not_registered_tokens(db: Session, tokens: list[PushToken], tickets: list[dict[str, Any]]) -> None:
    for token_row, ticket in zip(tokens, tickets):
        details = ticket.get("details") if isinstance(ticket, dict) else None
        if isinstance(details, dict) and details.get("error") == "DeviceNotRegistered":
            token_row.is_active = False
            token_row.updated_at = _now()


def send_push_to_user(
    db: Session,
    *,
    user_id: int,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
    event_key: str | None = None,
) -> dict[str, Any]:
    if event_key:
        existing = db.query(NotificationDelivery).filter(NotificationDelivery.event_key == event_key).first()
        if existing:
            return {"sent": 0, "failed": 0, "tickets": [], "skipped": True}

    tokens = _active_tokens(db, user_id)
    if not tokens:
        return {"sent": 0, "failed": 0, "tickets": []}

    messages = [
        {
            "to": token_row.token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
        }
        for token_row in tokens
    ]

    try:
        tickets = _post_expo_push(messages)
    except Exception as exc:
        logger.exception("expo_push_failed user_id=%s event_key=%s", user_id, event_key)
        tickets = [{"status": "error", "message": str(exc)}]

    _disable_device_not_registered_tokens(db, tokens, tickets)
    sent = sum(1 for ticket in tickets if isinstance(ticket, dict) and ticket.get("status") == "ok")
    failed = max(len(tokens) - sent, 0)

    if event_key:
        db.add(
            NotificationDelivery(
                user_id=user_id,
                push_token_id=tokens[0].id if tokens else None,
                event_key=event_key,
                title=title,
                body=body,
                data=data or {},
                status="sent" if sent else "failed",
                provider_response={"tickets": tickets},
                sent_at=_now() if sent else None,
            )
        )

    db.flush()
    return {"sent": sent, "failed": failed, "tickets": tickets}


def _task_reminder_body(task: CareTask) -> str:
    plant_name = task.plant.name if task.plant else None
    if plant_name:
        return f"{task.title} cho {plant_name} đang đến hạn."
    return f"{task.title} đang đến hạn trong lịch chăm sóc."


def run_scheduled_notifications(db: Session | None = None, *, now: datetime | None = None) -> int:
    owns_session = db is None
    session = db or SessionLocal()
    current = now or _now()
    window_start = current - timedelta(minutes=NOTIFICATION_TASK_PAST_DUE_GRACE_MINUTES)
    window_end = current + timedelta(minutes=NOTIFICATION_TASK_LOOKAHEAD_MINUTES)
    sent_count = 0

    try:
        tasks = (
            session.query(CareTask)
            .filter(CareTask.due_at.isnot(None))
            .filter(CareTask.due_at >= window_start, CareTask.due_at <= window_end)
            .filter(or_(CareTask.status.is_(None), CareTask.status != "completed"))
            .order_by(CareTask.due_at.asc())
            .limit(100)
            .all()
        )

        for task in tasks:
            event_key = f"care_task_due:{task.id}"
            create_notification(
                session,
                user_id=task.user_id,
                notification_type="care_task",
                title="Nhắc việc chăm sóc cây",
                body=_task_reminder_body(task),
                data={
                    "type": "care_task",
                    "taskId": task.id,
                    "plantId": task.plant_id,
                    "dueAt": task.due_at.isoformat() if task.due_at else None,
                },
                event_key=f"in_app:{event_key}",
            )
            result = send_push_to_user(
                session,
                user_id=task.user_id,
                title="Nhắc việc chăm sóc cây",
                body=_task_reminder_body(task),
                data={
                    "type": "care_task",
                    "taskId": task.id,
                    "plantId": task.plant_id,
                    "dueAt": task.due_at.isoformat() if task.due_at else None,
                },
                event_key=event_key,
            )
            sent_count += int(result.get("sent", 0))

        if owns_session:
            session.commit()
        return sent_count
    except Exception:
        if owns_session:
            session.rollback()
        logger.exception("scheduled_notifications_failed")
        return sent_count
    finally:
        if owns_session:
            session.close()


def _scheduler_loop() -> None:
    if _scheduler_stop.wait(max(0, NOTIFICATION_SCHEDULER_INITIAL_DELAY_SECONDS)):
        return

    while not _scheduler_stop.is_set():
        run_scheduled_notifications()
        if _scheduler_stop.wait(max(30, NOTIFICATION_SCHEDULER_INTERVAL_SECONDS)):
            return


def start_notification_scheduler() -> None:
    global _scheduler_thread
    if not NOTIFICATION_SCHEDULER_ENABLED:
        logger.info("notification_scheduler_disabled")
        return
    if _scheduler_thread and _scheduler_thread.is_alive():
        return

    _scheduler_stop.clear()
    _scheduler_thread = threading.Thread(target=_scheduler_loop, name="notification-scheduler", daemon=True)
    _scheduler_thread.start()
    logger.info(
        "notification_scheduler_started interval_seconds=%s lookahead_minutes=%s",
        NOTIFICATION_SCHEDULER_INTERVAL_SECONDS,
        NOTIFICATION_TASK_LOOKAHEAD_MINUTES,
    )


def stop_notification_scheduler() -> None:
    _scheduler_stop.set()
