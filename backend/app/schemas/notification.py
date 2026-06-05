from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PushTokenRegisterRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=255)
    platform: str | None = Field(default=None, max_length=20)
    device_id: str | None = Field(default=None, max_length=128)


class PushTokenUnregisterRequest(BaseModel):
    token: str | None = Field(default=None, max_length=255)


class NotificationTestRequest(BaseModel):
    title: str | None = Field(default=None, max_length=120)
    body: str | None = Field(default=None, max_length=240)


class NotificationStatusDTO(BaseModel):
    enabled: bool
    active_token_count: int
    latest_registered_at: datetime | None = None


class NotificationItemDTO(BaseModel):
    id: int
    notification_type: str
    title: str
    body: str
    data: dict[str, Any] | None = None
    read_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationSendResultDTO(BaseModel):
    sent: int
    failed: int
    tickets: list[dict[str, Any]] = Field(default_factory=list)


class NotificationStatusEnvelope(BaseModel):
    success: bool
    message: str
    data: NotificationStatusDTO


class NotificationSendEnvelope(BaseModel):
    success: bool
    message: str
    data: NotificationSendResultDTO


class NotificationListData(BaseModel):
    items: list[NotificationItemDTO]
    unread_count: int


class NotificationListEnvelope(BaseModel):
    success: bool
    message: str
    data: NotificationListData


class NotificationItemEnvelope(BaseModel):
    success: bool
    message: str
    data: NotificationItemDTO | None = None
