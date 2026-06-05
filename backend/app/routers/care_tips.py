from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.admin import require_admin
from app.models.domain import CareTip, User
from app.schemas.care_tip import (
    CareTipAdminListResponse,
    CareTipCreate,
    CareTipDetailItem,
    CareTipDetailResponse,
    CareTipListItem,
    CareTipListResponse,
    CareTipUpdate,
)
from app.services.care_tip_service import (
    build_unique_slug,
    get_today_tip,
    validate_related_disease_exists,
)

router = APIRouter(tags=["Care Tips"])


def _to_list_item(tip: CareTip) -> CareTipListItem:
    return CareTipListItem.model_validate(tip)


def _to_detail_item(tip: CareTip) -> CareTipDetailItem:
    return CareTipDetailItem.model_validate(tip)


@router.get("/api/care-tips/today", response_model=CareTipDetailResponse)
@router.get("/api/v1/care-tips/today", response_model=CareTipDetailResponse, include_in_schema=False)
def get_today_care_tip(db: Session = Depends(get_db)):
    tip = get_today_tip(db)
    if not tip:
        raise HTTPException(status_code=404, detail="Không có mẹo chăm sóc phù hợp cho hôm nay.")

    return CareTipDetailResponse(
        success=True,
        message="Thành công",
        data=_to_detail_item(tip),
    )


@router.get("/api/care-tips", response_model=CareTipListResponse)
@router.get("/api/v1/care-tips", response_model=CareTipListResponse, include_in_schema=False)
def list_care_tips(
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    query = db.query(CareTip)
    if active_only:
        today = date.today()
        query = (
            query.filter(CareTip.is_active.is_(True))
            .filter((CareTip.start_date.is_(None)) | (CareTip.start_date <= today))
            .filter((CareTip.end_date.is_(None)) | (CareTip.end_date >= today))
        )

    tips = query.order_by(desc(CareTip.priority), desc(CareTip.created_at)).all()
    return CareTipListResponse(
        success=True,
        message="Thành công",
        data=[_to_list_item(tip) for tip in tips],
    )


@router.get("/api/care-tips/{tip_id}", response_model=CareTipDetailResponse)
@router.get("/api/v1/care-tips/{tip_id}", response_model=CareTipDetailResponse, include_in_schema=False)
def get_care_tip_detail(
    tip_id: int,
    db: Session = Depends(get_db),
):
    tip = db.query(CareTip).filter(CareTip.id == tip_id).first()
    if not tip:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẹo chăm sóc.")

    return CareTipDetailResponse(
        success=True,
        message="Thành công",
        data=_to_detail_item(tip),
    )


@router.get("/api/admin/care-tips", response_model=CareTipAdminListResponse)
@router.get("/api/v1/admin/care-tips", response_model=CareTipAdminListResponse, include_in_schema=False)
def list_admin_care_tips(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    tips = db.query(CareTip).order_by(desc(CareTip.priority), desc(CareTip.created_at)).all()
    return CareTipAdminListResponse(
        success=True,
        message="Thành công",
        data=[_to_detail_item(tip) for tip in tips],
    )


@router.post("/api/admin/care-tips", response_model=CareTipDetailResponse)
@router.post("/api/v1/admin/care-tips", response_model=CareTipDetailResponse, include_in_schema=False)
def create_care_tip(
    payload: CareTipCreate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    if not validate_related_disease_exists(db, payload.related_disease_id):
        raise HTTPException(status_code=400, detail="related_disease_id không tồn tại.")

    payload_data = payload.model_dump()
    payload_data["slug"] = build_unique_slug(
        db=db,
        title=payload.title,
        requested_slug=payload.slug,
    )
    tip = CareTip(**payload_data)
    db.add(tip)
    db.commit()
    db.refresh(tip)

    return CareTipDetailResponse(
        success=True,
        message="Tạo mẹo chăm sóc thành công",
        data=_to_detail_item(tip),
    )


@router.put("/api/admin/care-tips/{tip_id}", response_model=CareTipDetailResponse)
@router.put("/api/v1/admin/care-tips/{tip_id}", response_model=CareTipDetailResponse, include_in_schema=False)
def update_care_tip(
    tip_id: int,
    payload: CareTipUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    tip = db.query(CareTip).filter(CareTip.id == tip_id).first()
    if not tip:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẹo chăm sóc.")

    update_data = payload.model_dump(exclude_unset=True)
    related_disease_id = update_data.get("related_disease_id")
    if related_disease_id is not None and not validate_related_disease_exists(db, related_disease_id):
        raise HTTPException(status_code=400, detail="related_disease_id không tồn tại.")

    if "slug" in update_data:
        update_data["slug"] = build_unique_slug(
            db=db,
            title=update_data.get("title") or tip.title,
            requested_slug=update_data["slug"],
            exclude_id=tip.id,
        )

    for key, value in update_data.items():
        setattr(tip, key, value)

    db.commit()
    db.refresh(tip)

    return CareTipDetailResponse(
        success=True,
        message="Cập nhật mẹo chăm sóc thành công",
        data=_to_detail_item(tip),
    )


@router.delete("/api/admin/care-tips/{tip_id}")
@router.delete("/api/v1/admin/care-tips/{tip_id}", include_in_schema=False)
def delete_care_tip(
    tip_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_admin),
):
    tip = db.query(CareTip).filter(CareTip.id == tip_id).first()
    if not tip:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẹo chăm sóc.")

    db.delete(tip)
    db.commit()
    return {"success": True, "message": "Đã xóa mẹo chăm sóc."}
