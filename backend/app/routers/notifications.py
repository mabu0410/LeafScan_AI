from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.domain import Notification, User
from app.schemas.notification import (
    NotificationItemDTO,
    NotificationItemEnvelope,
    NotificationListData,
    NotificationListEnvelope,
    NotificationSendEnvelope,
    NotificationSendResultDTO,
    NotificationStatusDTO,
    NotificationStatusEnvelope,
    NotificationTestRequest,
    PushTokenRegisterRequest,
    PushTokenUnregisterRequest,
)
from app.services.notification_service import (
    notification_status,
    register_push_token,
    send_push_to_user,
    unregister_push_token,
)

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


def _status_envelope(db: Session, user_id: int, message: str = "Thành công") -> NotificationStatusEnvelope:
    return NotificationStatusEnvelope(
        success=True,
        message=message,
        data=NotificationStatusDTO(**notification_status(db, user_id=user_id)),
    )


@router.get("", response_model=NotificationListEnvelope)
def list_my_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(desc(Notification.created_at))
        .limit(80)
        .all()
    )
    unread_count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.read_at.is_(None))
        .count()
    )
    return NotificationListEnvelope(
        success=True,
        message="Thành công",
        data=NotificationListData(
            items=[NotificationItemDTO.model_validate(row) for row in rows],
            unread_count=int(unread_count or 0),
        ),
    )


@router.patch("/{notification_id}/read", response_model=NotificationItemEnvelope)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông báo.")
    if row.read_at is None:
        row.read_at = datetime.utcnow()
        db.commit()
        db.refresh(row)
    return NotificationItemEnvelope(success=True, message="Đã đánh dấu đã đọc.", data=NotificationItemDTO.model_validate(row))


@router.patch("/read-all", response_model=NotificationListEnvelope)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.utcnow()
    db.query(Notification).filter(Notification.user_id == current_user.id, Notification.read_at.is_(None)).update(
        {Notification.read_at: now},
        synchronize_session=False,
    )
    db.commit()
    return list_my_notifications(db=db, current_user=current_user)


@router.get("/status", response_model=NotificationStatusEnvelope)
def get_my_notification_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _status_envelope(db, current_user.id)


@router.post("/register", response_model=NotificationStatusEnvelope)
def register_my_push_token(
    payload: PushTokenRegisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        register_push_token(
            db,
            user_id=current_user.id,
            token=payload.token,
            platform=payload.platform,
            device_id=payload.device_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    db.commit()
    return _status_envelope(db, current_user.id, message="Đã bật thông báo.")


@router.post("/unregister", response_model=NotificationStatusEnvelope)
def unregister_my_push_token(
    payload: PushTokenUnregisterRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unregister_push_token(db, user_id=current_user.id, token=payload.token)
    db.commit()
    return _status_envelope(db, current_user.id, message="Đã tắt thông báo.")


@router.post("/test", response_model=NotificationSendEnvelope)
def send_test_notification(
    payload: NotificationTestRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    title = payload.title if payload and payload.title else "LeafScan AI"
    body = payload.body if payload and payload.body else "Thông báo thử đã được gửi thành công."
    result = send_push_to_user(
        db,
        user_id=current_user.id,
        title=title,
        body=body,
        data={"type": "test_notification"},
    )
    db.commit()
    sent = int(result.get("sent", 0))
    return NotificationSendEnvelope(
        success=True,
        message="Đã gửi thông báo thử." if sent else "Chưa có thiết bị nhận thông báo.",
        data=NotificationSendResultDTO(
            sent=sent,
            failed=int(result.get("failed", 0)),
            tickets=list(result.get("tickets", [])),
        ),
    )
