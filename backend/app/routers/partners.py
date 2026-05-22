"""
Partner marketplace, admin moderation and VNPAY payment endpoints.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import and_, desc, func, or_
from sqlalchemy.orm import Session

from app.config import (
    ALLOWED_EXTENSIONS,
    MAX_FILE_SIZE,
    PARTNER_PLAN_MAX_ACTIVE_PRODUCTS,
    PARTNER_MONTHLY_PLAN_DURATION_DAYS,
    PARTNER_MONTHLY_PLAN_PRICE_VND,
    PARTNER_YEARLY_PLAN_DURATION_DAYS,
    PARTNER_YEARLY_PLAN_PRICE_VND,
    UPLOAD_DIR,
)
from app.database import get_db
from app.dependencies.admin import require_admin
from app.dependencies.auth import get_current_user
from app.models.domain import (
    Partner,
    PartnerMembership,
    PartnerProduct,
    PaymentTransaction,
    ProductImpression,
    User,
)
from app.schemas.subscription import (
    AdminStatusUpdateDTO,
    PartnerEnvelope,
    PartnerListEnvelope,
    PartnerProductResponse,
    PartnerRegistrationDTO,
    PartnerResponse,
    PartnerUpdateDTO,
    PaymentCreateEnvelope,
    PaymentCreateRequestDTO,
    PaymentCreateResponseDTO,
    PaymentStatusEnvelope,
    ProductCreateDTO,
    ProductEnvelope,
    ProductListEnvelope,
    ProductUpdateDTO,
)
from app.services.vnpay_service import build_vnpay_payment_url, verify_vnpay_signature


router = APIRouter(prefix="/api/v1", tags=["Partners"])

PARTNER_STATUSES = {"pending_review", "active", "suspended", "rejected"}
PRODUCT_STATUSES = {"pending_review", "approved", "rejected"}
LICENSE_ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS | {"pdf"}
PARTNER_PLAN_SPECS = {
    "monthly": {
        "price_vnd": PARTNER_MONTHLY_PLAN_PRICE_VND,
        "duration_days": PARTNER_MONTHLY_PLAN_DURATION_DAYS,
        "max_active_products": PARTNER_PLAN_MAX_ACTIVE_PRODUCTS,
    },
    "yearly": {
        "price_vnd": PARTNER_YEARLY_PLAN_PRICE_VND,
        "duration_days": PARTNER_YEARLY_PLAN_DURATION_DAYS,
        "max_active_products": PARTNER_PLAN_MAX_ACTIVE_PRODUCTS,
    },
}


def _now() -> datetime:
    return datetime.utcnow()


def _active_membership(db: Session, partner_id: int) -> PartnerMembership | None:
    return (
        db.query(PartnerMembership)
        .filter(
            PartnerMembership.partner_id == partner_id,
            PartnerMembership.status == "active",
            PartnerMembership.expires_at > _now(),
        )
        .order_by(desc(PartnerMembership.expires_at))
        .first()
    )


def _active_product_count(db: Session, partner_id: int) -> int:
    return (
        db.query(func.count(PartnerProduct.id))
        .filter(
            PartnerProduct.partner_id == partner_id,
            PartnerProduct.is_active == True,  # noqa: E712
        )
        .scalar()
        or 0
    )


def _approved_active_product_count(db: Session, partner_id: int) -> int:
    return (
        db.query(func.count(PartnerProduct.id))
        .filter(
            PartnerProduct.partner_id == partner_id,
            PartnerProduct.is_active == True,  # noqa: E712
            PartnerProduct.moderation_status == "approved",
        )
        .scalar()
        or 0
    )


def _partner_response(db: Session, partner: Partner) -> PartnerResponse:
    data = PartnerResponse.model_validate(partner)
    data.active_membership = _active_membership(db, partner.id)
    data.active_product_count = _active_product_count(db, partner.id)
    return data


def _product_response(product: PartnerProduct) -> PartnerProductResponse:
    data = PartnerProductResponse.model_validate(product)
    if product.partner:
        data.partner_name = product.partner.store_name or product.partner.company_name
        data.partner_status = product.partner.status
    return data


def _get_my_partner(db: Session, user_id: int) -> Partner:
    partner = db.query(Partner).filter(Partner.user_id == user_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Bạn chưa đăng ký kênh đại lý.")
    return partner


def _ensure_can_activate_product(db: Session, partner: Partner, product_id: int | None = None) -> None:
    membership = _active_membership(db, partner.id)
    if membership is None:
        raise HTTPException(status_code=402, detail="Gói đại lý đã hết hạn hoặc chưa được thanh toán.")

    query = db.query(func.count(PartnerProduct.id)).filter(
        PartnerProduct.partner_id == partner.id,
        PartnerProduct.is_active == True,  # noqa: E712
    )
    if product_id is not None:
        query = query.filter(PartnerProduct.id != product_id)
    active_count = query.scalar() or 0
    if active_count >= membership.max_active_products:
        raise HTTPException(
            status_code=400,
            detail=f"Gói hiện tại chỉ cho phép tối đa {membership.max_active_products} sản phẩm đang active.",
        )


def _validate_status(value: str, allowed: set[str]) -> str:
    clean = value.strip()
    if clean not in allowed:
        raise HTTPException(status_code=400, detail=f"Trạng thái không hợp lệ: {value}")
    return clean


def _partner_plan_spec(plan_type: str) -> dict[str, int]:
    spec = PARTNER_PLAN_SPECS.get(plan_type)
    if not spec:
        raise HTTPException(status_code=400, detail="Gói đối tác không hợp lệ.")
    return spec


def _partner_plan_from_amount(amount_vnd: int) -> dict[str, int]:
    for spec in PARTNER_PLAN_SPECS.values():
        if spec["price_vnd"] == amount_vnd:
            return spec
    return {
        "price_vnd": amount_vnd,
        "duration_days": PARTNER_MONTHLY_PLAN_DURATION_DAYS,
        "max_active_products": PARTNER_PLAN_MAX_ACTIVE_PRODUCTS,
    }


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "127.0.0.1"


def _clean_required(value: str | None, label: str) -> str:
    clean = (value or "").strip()
    if not clean:
        raise HTTPException(status_code=400, detail=f"Thiếu thông tin bắt buộc: {label}.")
    return clean


def _missing_partner_review_fields(partner: Partner) -> list[str]:
    checks = [
        ("tên cửa hàng/công ty", bool((partner.store_name or partner.company_name or "").strip())),
        ("email liên hệ", bool((partner.contact_email or "").strip())),
        ("số điện thoại", bool((partner.phone or "").strip())),
        ("địa chỉ", bool((partner.address or "").strip())),
        ("người đại diện", bool((partner.representative_name or "").strip())),
        ("vai trò người đại diện", bool((partner.representative_role or "").strip())),
        ("khu vực phục vụ", bool((partner.service_area or "").strip())),
        ("sản phẩm chính", bool((partner.main_products or "").strip())),
        ("mã số thuế/giấy phép", bool((partner.business_license or "").strip())),
        ("file giấy phép kinh doanh", bool((partner.business_license_file_url or "").strip())),
        ("ảnh cửa hàng", bool((partner.cover_url or "").strip())),
        ("cam kết nội dung quảng cáo", bool(partner.advertising_commitment_accepted)),
    ]
    return [label for label, ok in checks if not ok]


def _ensure_partner_review_ready(partner: Partner) -> None:
    missing = _missing_partner_review_fields(partner)
    if missing:
        raise HTTPException(
            status_code=400,
            detail="Hồ sơ thiếu thông tin xét duyệt: " + ", ".join(missing) + ".",
        )


def _mark_partner_pending_if_rejected(partner: Partner) -> None:
    if partner.status == "rejected":
        partner.status = "pending_review"
        partner.rejection_reason = None


def _save_upload_file(
    content: bytes,
    filename: str | None,
    prefix: str,
    allowed_extensions: set[str] | None = None,
) -> str:
    extension = filename.rsplit(".", 1)[-1].lower() if filename and "." in filename else "jpg"
    allowed = allowed_extensions or ALLOWED_EXTENSIONS
    if extension not in allowed:
        raise HTTPException(status_code=400, detail="Định dạng file không hỗ trợ.")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File quá lớn.")

    unique_name = f"{prefix}_{uuid.uuid4().hex}.{extension}"
    save_path = os.path.join(UPLOAD_DIR, unique_name)
    with open(save_path, "wb") as handle:
        handle.write(content)
    return f"/uploads/{unique_name}"


# ──────────────────────────────────────────────
# Partner self-service
# ──────────────────────────────────────────────

@router.post("/partners/register", response_model=PartnerEnvelope)
def register_partner(
    payload: PartnerRegistrationDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(Partner).filter(Partner.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tài khoản này đã đăng ký kênh đại lý.")

    email_in_use = db.query(Partner).filter(Partner.contact_email == str(payload.contact_email)).first()
    if email_in_use:
        raise HTTPException(status_code=400, detail="Email liên hệ này đã được đại lý khác sử dụng.")

    if not payload.advertising_commitment_accepted:
        raise HTTPException(status_code=400, detail="Bạn cần xác nhận cam kết nội dung quảng cáo.")

    company_name = _clean_required(payload.company_name, "tên công ty/cửa hàng")
    store_name = _clean_required(payload.store_name or payload.company_name, "tên cửa hàng hiển thị")
    address = _clean_required(payload.address, "địa chỉ")
    phone = _clean_required(payload.phone, "số điện thoại")
    business_license = _clean_required(payload.business_license, "mã số thuế/giấy phép kinh doanh")
    representative_name = _clean_required(payload.representative_name, "người đại diện")
    representative_role = _clean_required(payload.representative_role, "vai trò người đại diện")
    service_area = _clean_required(payload.service_area, "khu vực phục vụ")
    main_products = _clean_required(payload.main_products, "sản phẩm chính")
    if not payload.product_categories:
        raise HTTPException(status_code=400, detail="Thiếu thông tin bắt buộc: nhóm sản phẩm.")

    partner = Partner(
        user_id=current_user.id,
        company_name=company_name,
        store_name=store_name,
        description=payload.description,
        address=address,
        contact_email=str(payload.contact_email),
        phone=phone,
        business_license=business_license,
        representative_name=representative_name,
        representative_role=representative_role,
        service_area=service_area,
        main_products=main_products,
        advertising_commitment_accepted=True,
        advertising_commitment_at=_now(),
        product_categories=payload.product_categories,
        website_url=payload.website_url,
        contact_url=payload.contact_url,
        status="pending_review",
    )
    db.add(partner)
    db.commit()
    db.refresh(partner)
    return PartnerEnvelope(success=True, message="Đã gửi hồ sơ đại lý để admin duyệt.", data=_partner_response(db, partner))


@router.get("/partners/me", response_model=PartnerEnvelope)
def get_my_partner(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    partner = _get_my_partner(db, current_user.id)
    return PartnerEnvelope(success=True, message="Thành công", data=_partner_response(db, partner))


@router.put("/partners/me", response_model=PartnerEnvelope)
def update_my_partner(
    payload: PartnerUpdateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    partner = _get_my_partner(db, current_user.id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        if isinstance(value, str):
            value = value.strip()
        if field == "advertising_commitment_accepted":
            partner.advertising_commitment_at = _now() if value else None
        setattr(partner, field, value)
    _mark_partner_pending_if_rejected(partner)
    partner.updated_at = _now()
    db.commit()
    db.refresh(partner)
    return PartnerEnvelope(success=True, message="Đã cập nhật hồ sơ đại lý.", data=_partner_response(db, partner))


@router.post("/partners/me/logo", response_model=PartnerEnvelope)
async def upload_partner_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    partner = _get_my_partner(db, current_user.id)
    partner.logo_url = _save_upload_file(await file.read(), file.filename, f"partner_logo_{partner.id}")
    _mark_partner_pending_if_rejected(partner)
    partner.updated_at = _now()
    db.commit()
    db.refresh(partner)
    return PartnerEnvelope(success=True, message="Upload logo thành công.", data=_partner_response(db, partner))


@router.post("/partners/me/cover", response_model=PartnerEnvelope)
async def upload_partner_cover(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    partner = _get_my_partner(db, current_user.id)
    partner.cover_url = _save_upload_file(await file.read(), file.filename, f"partner_cover_{partner.id}")
    _mark_partner_pending_if_rejected(partner)
    partner.updated_at = _now()
    db.commit()
    db.refresh(partner)
    return PartnerEnvelope(success=True, message="Upload ảnh cửa hàng thành công.", data=_partner_response(db, partner))


@router.post("/partners/me/business-license", response_model=PartnerEnvelope)
async def upload_partner_business_license(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    partner = _get_my_partner(db, current_user.id)
    partner.business_license_file_url = _save_upload_file(
        await file.read(),
        file.filename,
        f"partner_license_{partner.id}",
        LICENSE_ALLOWED_EXTENSIONS,
    )
    _mark_partner_pending_if_rejected(partner)
    partner.updated_at = _now()
    db.commit()
    db.refresh(partner)
    return PartnerEnvelope(success=True, message="Upload giấy phép kinh doanh thành công.", data=_partner_response(db, partner))


@router.get("/partners/me/products", response_model=ProductListEnvelope)
def get_my_products(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    partner = _get_my_partner(db, current_user.id)
    products = (
        db.query(PartnerProduct)
        .filter(PartnerProduct.partner_id == partner.id)
        .order_by(desc(PartnerProduct.created_at))
        .all()
    )
    return ProductListEnvelope(success=True, message="Thành công", data=[_product_response(item) for item in products])


@router.post("/partners/me/products", response_model=ProductEnvelope)
def create_my_product(
    payload: ProductCreateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    partner = _get_my_partner(db, current_user.id)
    if payload.image_url and partner.status != "active":
        raise HTTPException(status_code=400, detail="Cửa hàng cần được admin duyệt trước khi đăng sản phẩm.")
    if partner.status != "active":
        raise HTTPException(status_code=400, detail="Cửa hàng cần được admin duyệt trước khi đăng sản phẩm.")
    _ensure_can_activate_product(db, partner)

    product = PartnerProduct(
        partner_id=partner.id,
        name=payload.name.strip(),
        description=payload.description,
        image_url=payload.image_url,
        price_range=payload.price_range,
        target_diseases=payload.target_diseases,
        target_categories=payload.target_categories,
        product_url=payload.product_url,
        is_active=True,
        moderation_status="pending_review",
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return ProductEnvelope(success=True, message="Đã tạo sản phẩm, chờ admin duyệt.", data=_product_response(product))


@router.put("/partners/me/products/{product_id}", response_model=ProductEnvelope)
def update_my_product(
    product_id: int,
    payload: ProductUpdateDTO,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    partner = _get_my_partner(db, current_user.id)
    product = (
        db.query(PartnerProduct)
        .filter(PartnerProduct.id == product_id, PartnerProduct.partner_id == partner.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm.")

    update_fields = payload.model_dump(exclude_unset=True)
    if update_fields.get("is_active") is True and not product.is_active:
        _ensure_can_activate_product(db, partner, product_id=product.id)

    content_fields = {"name", "description", "image_url", "price_range", "target_diseases", "target_categories", "product_url"}
    if content_fields.intersection(update_fields):
        product.moderation_status = "pending_review"
        product.rejection_reason = None

    for field, value in update_fields.items():
        setattr(product, field, value)
    product.updated_at = _now()
    db.commit()
    db.refresh(product)
    return ProductEnvelope(success=True, message="Đã cập nhật sản phẩm.", data=_product_response(product))


@router.delete("/partners/me/products/{product_id}")
def delete_my_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    partner = _get_my_partner(db, current_user.id)
    product = (
        db.query(PartnerProduct)
        .filter(PartnerProduct.id == product_id, PartnerProduct.partner_id == partner.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm.")
    db.delete(product)
    db.commit()
    return {"success": True, "message": "Đã xóa sản phẩm."}


@router.post("/partners/me/products/{product_id}/image", response_model=ProductEnvelope)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    partner = _get_my_partner(db, current_user.id)
    product = (
        db.query(PartnerProduct)
        .filter(PartnerProduct.id == product_id, PartnerProduct.partner_id == partner.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm.")
    product.image_url = _save_upload_file(await file.read(), file.filename, f"partner_product_{product.id}")
    product.moderation_status = "pending_review"
    product.rejection_reason = None
    db.commit()
    db.refresh(product)
    return ProductEnvelope(success=True, message="Upload ảnh sản phẩm thành công.", data=_product_response(product))


# ──────────────────────────────────────────────
# Marketplace
# ──────────────────────────────────────────────

@router.get("/marketplace/partners", response_model=PartnerListEnvelope)
def list_public_partners(db: Session = Depends(get_db)):
    partners = db.query(Partner).filter(Partner.status == "active").order_by(desc(Partner.created_at)).all()
    public_partners = [partner for partner in partners if _active_membership(db, partner.id) is not None]
    return PartnerListEnvelope(success=True, message="Thành công", data=[_partner_response(db, item) for item in public_partners])


@router.get("/marketplace/partners/{partner_id}", response_model=PartnerEnvelope)
def get_public_partner(partner_id: int, db: Session = Depends(get_db)):
    partner = db.query(Partner).filter(Partner.id == partner_id, Partner.status == "active").first()
    if not partner or _active_membership(db, partner.id) is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy cửa hàng.")
    return PartnerEnvelope(success=True, message="Thành công", data=_partner_response(db, partner))


@router.get("/marketplace/products", response_model=ProductListEnvelope)
def list_public_products(
    partner_id: int | None = None,
    disease_key: str | None = None,
    category: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
):
    query = (
        db.query(PartnerProduct)
        .join(Partner)
        .filter(
            Partner.status == "active",
            PartnerProduct.is_active == True,  # noqa: E712
            PartnerProduct.moderation_status == "approved",
        )
        .order_by(desc(PartnerProduct.created_at))
    )
    if partner_id is not None:
        query = query.filter(PartnerProduct.partner_id == partner_id)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(PartnerProduct.name.ilike(like), PartnerProduct.description.ilike(like)))

    products = []
    per_partner_counts: dict[int, int] = {}
    for product in query.all():
        membership = _active_membership(db, product.partner_id)
        if membership is None:
            continue
        if disease_key and disease_key not in (product.target_diseases or []):
            continue
        if category and category not in (product.target_categories or []):
            continue
        shown_count = per_partner_counts.get(product.partner_id, 0)
        if shown_count >= membership.max_active_products:
            continue
        per_partner_counts[product.partner_id] = shown_count + 1
        products.append(_product_response(product))

    return ProductListEnvelope(success=True, message="Thành công", data=products)


@router.post("/marketplace/products/{product_id}/click")
def track_product_click(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(PartnerProduct).filter(PartnerProduct.id == product_id).first()
    if not product or not product.partner or product.partner.status != "active":
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm.")
    if not product.is_active or product.moderation_status != "approved" or _active_membership(db, product.partner_id) is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm.")
    db.add(ProductImpression(partner_product_id=product.id, user_id=current_user.id, scan_id=None, clicked=True))
    db.commit()
    return {"success": True, "message": "Đã ghi nhận lượt bấm."}


# ──────────────────────────────────────────────
# VNPAY payment
# ──────────────────────────────────────────────

@router.post("/partner-payments/vnpay/create", response_model=PaymentCreateEnvelope)
def create_vnpay_payment(
    request: Request,
    payload: PaymentCreateRequestDTO | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    partner = _get_my_partner(db, current_user.id)
    if partner.status != "active":
        raise HTTPException(status_code=400, detail="Cửa hàng cần được admin duyệt trước khi thanh toán gói.")

    plan_type = payload.plan_type if payload else "monthly"
    plan = _partner_plan_spec(plan_type)
    txn_ref = f"PARTNER{partner.id}{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:6].upper()}"
    tx = PaymentTransaction(
        partner_id=partner.id,
        provider="vnpay",
        txn_ref=txn_ref,
        amount_vnd=plan["price_vnd"],
        status="pending",
    )
    db.add(tx)
    db.flush()

    try:
        payment_url = build_vnpay_payment_url(
            txn_ref=txn_ref,
            amount_vnd=plan["price_vnd"],
            order_info=f"Thanh toan goi {plan_type} dai ly LeafScan {txn_ref}",
            client_ip=_client_ip(request),
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    tx.payment_url = payment_url
    db.commit()
    return PaymentCreateEnvelope(
        success=True,
        message="Đã tạo URL thanh toán VNPAY.",
        data=PaymentCreateResponseDTO(
            txn_ref=txn_ref,
            amount_vnd=plan["price_vnd"],
            payment_url=payment_url,
            status=tx.status,
            plan_type=plan_type,
            duration_days=plan["duration_days"],
            max_active_products=plan["max_active_products"],
        ),
    )


@router.get("/partner-payments/vnpay/ipn")
def vnpay_ipn(request: Request, db: Session = Depends(get_db)):
    params = dict(request.query_params)
    if not verify_vnpay_signature(params):
        return {"RspCode": "97", "Message": "Invalid signature"}

    txn_ref = params.get("vnp_TxnRef")
    tx = db.query(PaymentTransaction).filter(PaymentTransaction.txn_ref == txn_ref).first()
    if not tx:
        return {"RspCode": "01", "Message": "Order not found"}

    try:
        amount_vnd = int(params.get("vnp_Amount", "0")) // 100
    except ValueError:
        return {"RspCode": "04", "Message": "Invalid amount"}
    if amount_vnd != tx.amount_vnd:
        return {"RspCode": "04", "Message": "Invalid amount"}

    if tx.status == "success":
        return {"RspCode": "02", "Message": "Order already confirmed"}

    response_code = params.get("vnp_ResponseCode")
    transaction_status = params.get("vnp_TransactionStatus")
    success = response_code == "00" and transaction_status == "00"

    tx.provider_response_code = response_code
    tx.provider_transaction_status = transaction_status
    tx.vnp_transaction_no = params.get("vnp_TransactionNo")
    tx.raw_payload = params
    tx.status = "success" if success else "failed"
    tx.updated_at = _now()
    if success:
        tx.paid_at = _now()
        partner = tx.partner
        plan = _partner_plan_from_amount(tx.amount_vnd)
        current_membership = _active_membership(db, partner.id)
        start_at = current_membership.expires_at if current_membership else _now()
        db.add(
            PartnerMembership(
                partner_id=partner.id,
                price_vnd=plan["price_vnd"],
                duration_days=plan["duration_days"],
                max_active_products=plan["max_active_products"],
                status="active",
                started_at=start_at,
                expires_at=start_at + timedelta(days=plan["duration_days"]),
                source_transaction_id=tx.id,
            )
        )

    db.commit()
    return {"RspCode": "00", "Message": "Confirm Success"}


@router.get("/partner-payments/vnpay/return")
def vnpay_return(request: Request):
    params = dict(request.query_params)
    txn_ref = params.get("vnp_TxnRef", "")
    response_code = params.get("vnp_ResponseCode", "")
    return {
        "success": response_code == "00",
        "message": "Đã nhận kết quả từ VNPAY. App sẽ kiểm tra trạng thái giao dịch từ server.",
        "txn_ref": txn_ref,
        "response_code": response_code,
    }


@router.get("/partner-payments/status/{txn_ref}", response_model=PaymentStatusEnvelope)
def get_payment_status(
    txn_ref: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    partner = _get_my_partner(db, current_user.id)
    tx = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.txn_ref == txn_ref, PaymentTransaction.partner_id == partner.id)
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch.")
    return PaymentStatusEnvelope(success=True, message="Thành công", data=tx)


# ──────────────────────────────────────────────
# Admin moderation
# ──────────────────────────────────────────────

@router.get("/admin/partners", response_model=PartnerListEnvelope)
def admin_list_partners(
    status: str | None = "pending_review",
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(Partner).order_by(desc(Partner.created_at))
    if status:
        query = query.filter(Partner.status == _validate_status(status, PARTNER_STATUSES))
    return PartnerListEnvelope(success=True, message="Thành công", data=[_partner_response(db, item) for item in query.all()])


@router.patch("/admin/partners/{partner_id}/status", response_model=PartnerEnvelope)
def admin_update_partner_status(
    partner_id: int,
    payload: AdminStatusUpdateDTO,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    partner = db.query(Partner).filter(Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Không tìm thấy đại lý.")
    next_status = _validate_status(payload.status, PARTNER_STATUSES)
    if next_status == "active":
        _ensure_partner_review_ready(partner)
    partner.status = next_status
    partner.rejection_reason = payload.rejection_reason if partner.status == "rejected" else None
    partner.updated_at = _now()
    db.commit()
    db.refresh(partner)
    return PartnerEnvelope(success=True, message="Đã cập nhật trạng thái đại lý.", data=_partner_response(db, partner))


@router.get("/admin/products", response_model=ProductListEnvelope)
def admin_list_products(
    status: str | None = "pending_review",
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(PartnerProduct).join(Partner).order_by(desc(PartnerProduct.created_at))
    if status:
        query = query.filter(PartnerProduct.moderation_status == _validate_status(status, PRODUCT_STATUSES))
    return ProductListEnvelope(success=True, message="Thành công", data=[_product_response(item) for item in query.all()])


@router.patch("/admin/products/{product_id}/status", response_model=ProductEnvelope)
def admin_update_product_status(
    product_id: int,
    payload: AdminStatusUpdateDTO,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    product = db.query(PartnerProduct).filter(PartnerProduct.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm.")
    product.moderation_status = _validate_status(payload.status, PRODUCT_STATUSES)
    product.rejection_reason = payload.rejection_reason if product.moderation_status == "rejected" else None
    product.updated_at = _now()
    db.commit()
    db.refresh(product)
    return ProductEnvelope(success=True, message="Đã cập nhật trạng thái sản phẩm.", data=_product_response(product))
