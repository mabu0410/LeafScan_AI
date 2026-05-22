"""
User subscription and daily scan quota helpers.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import (
    FREE_DAILY_SCAN_LIMIT,
    PERSONAL_DAILY_SCAN_LIMIT,
    PERSONAL_MONTHLY_PRICE_VND,
    PERSONAL_YEARLY_PRICE_VND,
    PRO_DAILY_SCAN_LIMIT,
    PRO_MONTHLY_PRICE_VND,
    PRO_YEARLY_PRICE_VND,
    USER_MONTHLY_PLAN_DURATION_DAYS,
    USER_YEARLY_PLAN_DURATION_DAYS,
)
from app.models.domain import ScanConsumption, ScanQuota, Subscription


@dataclass(frozen=True)
class UserPlanSpec:
    key: str
    tier: str
    label: str
    price_vnd: int
    duration_days: int
    daily_scan_limit: int


USER_PLAN_SPECS: dict[str, UserPlanSpec] = {
    "personal_monthly": UserPlanSpec(
        key="personal_monthly",
        tier="personal",
        label="Cá nhân tháng",
        price_vnd=PERSONAL_MONTHLY_PRICE_VND,
        duration_days=USER_MONTHLY_PLAN_DURATION_DAYS,
        daily_scan_limit=PERSONAL_DAILY_SCAN_LIMIT,
    ),
    "personal_yearly": UserPlanSpec(
        key="personal_yearly",
        tier="personal",
        label="Cá nhân năm",
        price_vnd=PERSONAL_YEARLY_PRICE_VND,
        duration_days=USER_YEARLY_PLAN_DURATION_DAYS,
        daily_scan_limit=PERSONAL_DAILY_SCAN_LIMIT,
    ),
    "pro_monthly": UserPlanSpec(
        key="pro_monthly",
        tier="pro",
        label="Pro tháng",
        price_vnd=PRO_MONTHLY_PRICE_VND,
        duration_days=USER_MONTHLY_PLAN_DURATION_DAYS,
        daily_scan_limit=PRO_DAILY_SCAN_LIMIT,
    ),
    "pro_yearly": UserPlanSpec(
        key="pro_yearly",
        tier="pro",
        label="Pro năm",
        price_vnd=PRO_YEARLY_PRICE_VND,
        duration_days=USER_YEARLY_PLAN_DURATION_DAYS,
        daily_scan_limit=PRO_DAILY_SCAN_LIMIT,
    ),
}


def now_utc() -> datetime:
    return datetime.utcnow()


def as_naive_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def get_user_plan_spec(plan_key: str) -> UserPlanSpec:
    spec = USER_PLAN_SPECS.get(plan_key)
    if not spec:
        raise HTTPException(status_code=400, detail="Gói người dùng không hợp lệ.")
    return spec


def get_effective_subscription(db: Session, user_id: int) -> tuple[str, datetime | None]:
    subscription = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    if not subscription:
        return "free", None

    if subscription.tier in {"personal", "pro"} and subscription.expires_at:
        expires_at = as_naive_utc(subscription.expires_at)
        if expires_at > now_utc():
            return subscription.tier, expires_at

    return "free", None


def daily_limit_for_tier(tier: str) -> int:
    if tier == "personal":
        return PERSONAL_DAILY_SCAN_LIMIT
    if tier == "pro":
        return PRO_DAILY_SCAN_LIMIT
    return FREE_DAILY_SCAN_LIMIT


def today_start() -> datetime:
    current = now_utc()
    return current.replace(hour=0, minute=0, second=0, microsecond=0)


def count_today_consumptions(db: Session, user_id: int) -> int:
    return (
        db.query(func.count(ScanConsumption.id))
        .filter(
            ScanConsumption.user_id == user_id,
            ScanConsumption.consumed_at >= today_start(),
        )
        .scalar()
        or 0
    )


def sync_scan_quota(db: Session, user_id: int) -> dict:
    tier, expires_at = get_effective_subscription(db, user_id)
    daily_limit = daily_limit_for_tier(tier)
    used_today = count_today_consumptions(db, user_id)
    remaining = max(daily_limit - used_today, 0)

    quota = db.query(ScanQuota).filter(ScanQuota.user_id == user_id).first()
    if not quota:
        quota = ScanQuota(user_id=user_id, remaining_scans=remaining, last_reset_at=now_utc())
        db.add(quota)
    else:
        quota.remaining_scans = remaining
        quota.last_reset_at = today_start()
        quota.updated_at = now_utc()
    db.flush()

    return {
        "tier": tier,
        "remaining_scans": remaining,
        "daily_scan_limit": daily_limit,
        "used_scans_today": used_today,
        "expires_at": expires_at,
    }


def ensure_can_scan(db: Session, user_id: int) -> dict:
    status = sync_scan_quota(db, user_id)
    if status["remaining_scans"] <= 0:
        raise HTTPException(
            status_code=402,
            detail={
                "error_code": "QUOTA_EXCEEDED",
                "message": "Bạn đã hết lượt quét hôm nay. Vui lòng nâng cấp gói để tiếp tục quét.",
                "subscription": _serializable_status(status),
            },
        )
    return status


def record_scan_consumption(db: Session, user_id: int, scan_id: int | None) -> dict:
    db.add(ScanConsumption(user_id=user_id, scan_id=scan_id, consumed_at=now_utc()))
    db.flush()
    return sync_scan_quota(db, user_id)


def activate_user_subscription(db: Session, user_id: int, spec: UserPlanSpec, source_transaction_id: int | None = None) -> Subscription:
    subscription = db.query(Subscription).filter(Subscription.user_id == user_id).first()
    current_tier, current_expires_at = get_effective_subscription(db, user_id)
    start_at = current_expires_at if current_tier != "free" and current_expires_at else now_utc()

    if not subscription:
        subscription = Subscription(user_id=user_id)
        db.add(subscription)

    subscription.tier = spec.tier
    subscription.started_at = start_at
    subscription.expires_at = start_at + timedelta(days=spec.duration_days)
    subscription.updated_at = now_utc()
    db.flush()
    sync_scan_quota(db, user_id)
    return subscription


def _serializable_status(status: dict) -> dict:
    expires_at = status.get("expires_at")
    return {
        **status,
        "expires_at": expires_at.isoformat() if isinstance(expires_at, datetime) else expires_at,
    }
