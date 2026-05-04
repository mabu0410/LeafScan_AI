from __future__ import annotations

from datetime import date
from typing import Optional
import re
import unicodedata

from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from app.models.domain import CareTip


def get_today_tip(db: Session, target_date: Optional[date] = None) -> Optional[CareTip]:
    """Lấy mẹo chăm sóc hợp lệ trong ngày theo priority cao nhất."""
    today = target_date or date.today()

    return (
        db.query(CareTip)
        .filter(CareTip.is_active.is_(True))
        .filter(or_(CareTip.start_date.is_(None), CareTip.start_date <= today))
        .filter(or_(CareTip.end_date.is_(None), CareTip.end_date >= today))
        .order_by(desc(CareTip.priority), desc(CareTip.created_at))
        .first()
    )


def get_active_tips_query(db: Session, target_date: Optional[date] = None):
    """Query các care tip active, hợp lệ theo khoảng ngày."""
    today = target_date or date.today()
    return (
        db.query(CareTip)
        .filter(CareTip.is_active.is_(True))
        .filter(or_(CareTip.start_date.is_(None), CareTip.start_date <= today))
        .filter(or_(CareTip.end_date.is_(None), CareTip.end_date >= today))
    )


def validate_related_disease_exists(db: Session, disease_id: Optional[int]) -> bool:
    """Kiểm tra related disease tồn tại, nullable thì luôn hợp lệ."""
    if disease_id is None:
        return True
    from app.models.domain import Disease

    exists = db.query(Disease.id).filter(Disease.id == disease_id).first()
    return exists is not None


def slugify_text(value: str) -> str:
    """Chuẩn hóa text tiếng Việt thành slug ASCII an toàn cho URL."""
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text).strip("-").lower()
    slug = re.sub(r"-{2,}", "-", slug)
    return slug or "care-tip"


def build_unique_slug(
    db: Session,
    title: str,
    requested_slug: Optional[str] = None,
    exclude_id: Optional[int] = None,
) -> str:
    """Tạo slug duy nhất theo title/slug đầu vào."""
    base_slug = slugify_text(requested_slug or title)
    candidate = base_slug
    suffix = 2

    while True:
        query = db.query(CareTip.id).filter(CareTip.slug == candidate)
        if exclude_id is not None:
            query = query.filter(CareTip.id != exclude_id)
        if query.first() is None:
            return candidate
        candidate = f"{base_slug}-{suffix}"
        suffix += 1
