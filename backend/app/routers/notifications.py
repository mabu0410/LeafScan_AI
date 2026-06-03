from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.domain import User
from app.schemas.notification import (
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
