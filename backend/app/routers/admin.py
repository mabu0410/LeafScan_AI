from __future__ import annotations

import csv
import io
import unicodedata
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import case, desc, func, or_
from sqlalchemy.orm import Session

from app.config import VNPAY_FEE_FIXED_VND, VNPAY_FEE_PERCENT
from app.database import get_db
from app.dependencies.admin import require_admin
from app.models.domain import (
    Disease,
    CareTip,
    Notification,
    NotificationDelivery,
    Partner,
    PartnerMembership,
    PartnerOutlet,
    PartnerProduct,
    PaymentTransaction,
    Plant,
    ProductImpression,
    PushToken,
    ScanHistory,
    Subscription,
    User,
    UserPaymentTransaction,
)
from app.schemas.admin import (
    AdminCountBreakdown,
    AdminContentStats,
    AdminDashboardData,
    AdminDashboardEnvelope,
    AdminDiseaseEnvelope,
    AdminDiseaseItem,
    AdminDiseaseListEnvelope,
    AdminDiseasePayload,
    AdminMarketplaceStats,
    AdminPaymentItem,
    AdminPaymentListData,
    AdminPaymentListEnvelope,
    AdminPayerRevenueItem,
    AdminPaymentStatusStats,
    AdminPartnerRevenueItem,
    AdminRefundEnvelope,
    AdminRefundRequest,
    AdminRevenueStats,
    AdminRevenueReportData,
    AdminRevenueReportEnvelope,
    AdminRevenueSeriesItem,
    AdminRecentTransactionItem,
    AdminScanActivityStats,
    AdminScanItem,
    AdminScanListData,
    AdminScanListEnvelope,
    AdminScanSeriesItem,
    AdminTopDiseaseItem,
    AdminTopProductItem,
    AdminUserEnvelope,
    AdminUserItem,
    AdminUserListData,
    AdminUserListEnvelope,
    AdminUserStatusUpdate,
)


router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])
USER_STATUSES = {"active", "suspended"}
PAYMENT_STATUSES = {"pending", "success", "failed", "invalid", "refunded"}


def _as_naive(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.replace(tzinfo=None)


def _report_window(start_date: date | None, end_date: date | None) -> tuple[date, date, datetime, datetime]:
    end_day = end_date or date.today()
    start_day = start_date or (end_day - timedelta(days=29))
    if start_day > end_day:
        raise HTTPException(status_code=400, detail="Ngày bắt đầu không được lớn hơn ngày kết thúc.")
    start_at = datetime.combine(start_day, datetime.min.time())
    end_exclusive = datetime.combine(end_day + timedelta(days=1), datetime.min.time())
    return start_day, end_day, start_at, end_exclusive


def _payment_report_date(transaction) -> datetime:
    if transaction.status in {"success", "refunded"} and transaction.paid_at:
        return _as_naive(transaction.paid_at)
    return _as_naive(transaction.created_at)


def _payment_in_window(transaction, start_at: datetime, end_exclusive: datetime) -> bool:
    value = _payment_report_date(transaction)
    return start_at <= value < end_exclusive


def _vnpay_fee(amount_vnd: int) -> int:
    if amount_vnd <= 0:
        return 0
    return int(round((amount_vnd * VNPAY_FEE_PERCENT / 100) + VNPAY_FEE_FIXED_VND))


def _period_key(value: datetime, period: str) -> str:
    if period == "monthly":
        return f"{value.year:04d}-{value.month:02d}"
    return value.date().isoformat()


def _period_keys(start_day: date, end_day: date, period: str) -> list[str]:
    if period == "monthly":
        keys: list[str] = []
        current = date(start_day.year, start_day.month, 1)
        end_month = date(end_day.year, end_day.month, 1)
        while current <= end_month:
            keys.append(f"{current.year:04d}-{current.month:02d}")
            if current.month == 12:
                current = date(current.year + 1, 1, 1)
            else:
                current = date(current.year, current.month + 1, 1)
        return keys
    return [(start_day + timedelta(days=offset)).isoformat() for offset in range((end_day - start_day).days + 1)]


def _page_bounds(total: int, page: int, page_size: int) -> tuple[int, int, int]:
    safe_size = min(max(page_size, 1), 100)
    page_count = max(1, (total + safe_size - 1) // safe_size)
    safe_page = min(max(page, 1), page_count)
    return safe_page, safe_size, page_count


def _count(db: Session, model, *criteria) -> int:
    query = db.query(func.count(model.id))
    if criteria:
        query = query.filter(*criteria)
    return int(query.scalar() or 0)


def _sum_amount(db: Session, model, *criteria) -> int:
    query = db.query(func.coalesce(func.sum(model.amount_vnd), 0))
    if criteria:
        query = query.filter(*criteria)
    return int(query.scalar() or 0)


def _scan_activity(db: Session) -> AdminScanActivityStats:
    today_start = datetime.combine(date.today(), datetime.min.time())
    seven_days_ago = datetime.now() - timedelta(days=7)
    thirty_days_ago = datetime.now() - timedelta(days=30)
    average_confidence = db.query(func.avg(ScanHistory.confidence)).scalar()

    return AdminScanActivityStats(
        today=_count(db, ScanHistory, ScanHistory.scan_date >= today_start),
        last_7d=_count(db, ScanHistory, ScanHistory.scan_date >= seven_days_ago),
        last_30d=_count(db, ScanHistory, ScanHistory.scan_date >= thirty_days_ago),
        average_confidence=round(float(average_confidence), 1) if average_confidence is not None else None,
        low_confidence=_count(db, ScanHistory, ScanHistory.confidence < 70),
        with_plant=_count(db, ScanHistory, ScanHistory.plant_id.isnot(None)),
        without_plant=_count(db, ScanHistory, ScanHistory.plant_id.is_(None)),
    )


def _payment_stats(db: Session) -> AdminPaymentStatusStats:
    return AdminPaymentStatusStats(
        user_pending_count=_count(db, UserPaymentTransaction, UserPaymentTransaction.status == "pending"),
        user_success_count=_count(db, UserPaymentTransaction, UserPaymentTransaction.status == "success"),
        user_failed_count=_count(db, UserPaymentTransaction, UserPaymentTransaction.status.in_(["failed", "invalid"])),
        partner_pending_count=_count(db, PaymentTransaction, PaymentTransaction.status == "pending"),
        partner_success_count=_count(db, PaymentTransaction, PaymentTransaction.status == "success"),
        partner_failed_count=_count(db, PaymentTransaction, PaymentTransaction.status.in_(["failed", "invalid"])),
        pending_amount_vnd=_sum_amount(db, UserPaymentTransaction, UserPaymentTransaction.status == "pending")
        + _sum_amount(db, PaymentTransaction, PaymentTransaction.status == "pending"),
        failed_amount_vnd=_sum_amount(db, UserPaymentTransaction, UserPaymentTransaction.status.in_(["failed", "invalid"]))
        + _sum_amount(db, PaymentTransaction, PaymentTransaction.status.in_(["failed", "invalid"])),
    )


def _marketplace_stats(db: Session) -> AdminMarketplaceStats:
    impressions_total = _count(db, ProductImpression)
    clicks_total = _count(db, ProductImpression, ProductImpression.clicked == True)  # noqa: E712

    return AdminMarketplaceStats(
        stores_total=_count(db, PartnerOutlet),
        stores_active=_count(db, PartnerOutlet, PartnerOutlet.is_active == True),  # noqa: E712
        memberships_total=_count(db, PartnerMembership),
        memberships_active=_count(
            db,
            PartnerMembership,
            PartnerMembership.status == "active",
            PartnerMembership.expires_at >= func.now(),
        ),
        memberships_expired=_count(db, PartnerMembership, PartnerMembership.expires_at < func.now()),
        impressions_total=impressions_total,
        clicks_total=clicks_total,
        click_rate=round((clicks_total / impressions_total) * 100, 1) if impressions_total else 0.0,
    )


def _content_stats(db: Session) -> AdminContentStats:
    care_tips_total = _count(db, CareTip)
    care_tips_active = _count(db, CareTip, CareTip.is_active == True)  # noqa: E712
    return AdminContentStats(
        diseases_total=_count(db, Disease),
        care_tips_total=care_tips_total,
        care_tips_active=care_tips_active,
        care_tips_hidden=max(care_tips_total - care_tips_active, 0),
    )


def _scan_series(db: Session, days: int = 14) -> list[AdminScanSeriesItem]:
    start_day = date.today() - timedelta(days=days - 1)
    rows = (
        db.query(func.date(ScanHistory.scan_date), func.count(ScanHistory.id))
        .filter(ScanHistory.scan_date >= datetime.combine(start_day, datetime.min.time()))
        .group_by(func.date(ScanHistory.scan_date))
        .order_by(func.date(ScanHistory.scan_date))
        .all()
    )
    counts: dict[date, int] = {}
    for day_value, count in rows:
        if isinstance(day_value, date):
            day = day_value
        else:
            day = date.fromisoformat(str(day_value))
        counts[day] = int(count or 0)

    return [
        AdminScanSeriesItem(date=start_day + timedelta(days=offset), scans=counts.get(start_day + timedelta(days=offset), 0))
        for offset in range(days)
    ]


def _top_diseases(db: Session) -> list[AdminTopDiseaseItem]:
    scan_count_expr = func.count(ScanHistory.id)
    rows = (
        db.query(
            ScanHistory.disease_key,
            Disease.name,
            scan_count_expr.label("scan_count"),
            func.avg(ScanHistory.confidence).label("avg_confidence"),
        )
        .outerjoin(Disease, Disease.disease_key == ScanHistory.disease_key)
        .filter(ScanHistory.disease_key.isnot(None))
        .group_by(ScanHistory.disease_key, Disease.name)
        .order_by(scan_count_expr.desc())
        .limit(8)
        .all()
    )
    return [
        AdminTopDiseaseItem(
            disease_key=str(disease_key),
            disease_name=disease_name,
            scans=int(scan_count or 0),
            avg_confidence=round(float(avg_confidence), 1) if avg_confidence is not None else None,
        )
        for disease_key, disease_name, scan_count, avg_confidence in rows
    ]


def _top_products(db: Session) -> list[AdminTopProductItem]:
    impression_count_expr = func.count(ProductImpression.id)
    rows = (
        db.query(
            PartnerProduct.id,
            PartnerProduct.name,
            Partner.store_name,
            Partner.company_name,
            impression_count_expr.label("impressions"),
            func.coalesce(func.sum(case((ProductImpression.clicked == True, 1), else_=0)), 0).label("clicks"),  # noqa: E712
        )
        .join(Partner, Partner.id == PartnerProduct.partner_id)
        .outerjoin(ProductImpression, ProductImpression.partner_product_id == PartnerProduct.id)
        .group_by(PartnerProduct.id, PartnerProduct.name, Partner.store_name, Partner.company_name)
        .order_by(impression_count_expr.desc())
        .limit(8)
        .all()
    )
    items: list[AdminTopProductItem] = []
    for product_id, product_name, store_name, company_name, impressions, clicks in rows:
        impression_count = int(impressions or 0)
        click_count = int(clicks or 0)
        items.append(
            AdminTopProductItem(
                product_id=int(product_id),
                product_name=product_name,
                partner_name=store_name or company_name,
                impressions=impression_count,
                clicks=click_count,
                click_rate=round((click_count / impression_count) * 100, 1) if impression_count else 0.0,
            )
        )
    return items


def _recent_transactions(db: Session, limit: int = 8) -> list[AdminRecentTransactionItem]:
    user_rows = (
        db.query(UserPaymentTransaction, User)
        .join(User, User.id == UserPaymentTransaction.user_id)
        .order_by(desc(UserPaymentTransaction.created_at))
        .limit(limit)
        .all()
    )
    partner_rows = (
        db.query(PaymentTransaction, Partner)
        .join(Partner, Partner.id == PaymentTransaction.partner_id)
        .order_by(desc(PaymentTransaction.created_at))
        .limit(limit)
        .all()
    )

    items: list[AdminRecentTransactionItem] = []
    for transaction, user in user_rows:
        items.append(
            AdminRecentTransactionItem(
                id=int(transaction.id),
                kind="user",
                owner_name=user.name or user.email,
                plan_label=transaction.plan_key or transaction.tier,
                amount_vnd=int(transaction.amount_vnd or 0),
                status=transaction.status,
                created_at=transaction.created_at,
                paid_at=transaction.paid_at,
            )
        )

    for transaction, partner in partner_rows:
        items.append(
            AdminRecentTransactionItem(
                id=int(transaction.id),
                kind="partner",
                owner_name=partner.store_name or partner.company_name,
                plan_label="Gói đại lý",
                amount_vnd=int(transaction.amount_vnd or 0),
                status=transaction.status,
                created_at=transaction.created_at,
                paid_at=transaction.paid_at,
            )
        )

    return sorted(items, key=lambda item: item.created_at, reverse=True)[:limit]


def _admin_user_item(db: Session, user: User) -> AdminUserItem:
    return AdminUserItem(
        id=int(user.id),
        name=user.name,
        email=user.email,
        phone=user.phone,
        role=user.role,
        status=getattr(user, "status", "active"),
        plant_count=_count(db, Plant, Plant.user_id == user.id),
        scan_count=_count(db, ScanHistory, ScanHistory.user_id == user.id),
        created_at=user.created_at,
    )


@router.get("/users", response_model=AdminUserListEnvelope)
def admin_list_users(
    q: str | None = None,
    role: str | None = None,
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(User).order_by(desc(User.created_at))
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(User.name.ilike(like), User.email.ilike(like), User.phone.ilike(like)))
    if role:
        query = query.filter(User.role == role.strip())
    if status:
        clean_status = status.strip()
        if clean_status not in USER_STATUSES:
            raise HTTPException(status_code=400, detail="Trạng thái người dùng không hợp lệ.")
        query = query.filter(User.status == clean_status)

    total = int(query.count() or 0)
    safe_page, safe_size, page_count = _page_bounds(total, page, page_size)
    rows = query.offset((safe_page - 1) * safe_size).limit(safe_size).all()
    return AdminUserListEnvelope(
        success=True,
        message="Thành công",
        data=AdminUserListData(
            items=[_admin_user_item(db, user) for user in rows],
            total=total,
            page=safe_page,
            page_size=safe_size,
            page_count=page_count,
        ),
    )


@router.patch("/users/{user_id}/status", response_model=AdminUserEnvelope)
def admin_update_user_status(
    user_id: int,
    payload: AdminUserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng.")

    next_status = payload.status.strip()
    if next_status not in USER_STATUSES:
        raise HTTPException(status_code=400, detail="Trạng thái người dùng không hợp lệ.")
    if user.id == current_admin.id and next_status == "suspended":
        raise HTTPException(status_code=400, detail="Không thể tự khóa tài khoản admin đang đăng nhập.")

    user.status = next_status
    db.commit()
    db.refresh(user)
    return AdminUserEnvelope(success=True, message="Đã cập nhật trạng thái người dùng.", data=_admin_user_item(db, user))


def _user_payment_item(transaction: UserPaymentTransaction, user: User) -> AdminPaymentItem:
    return AdminPaymentItem(
        id=int(transaction.id),
        kind="user",
        owner_id=int(user.id),
        owner_name=user.name or user.email,
        owner_email=user.email,
        provider=transaction.provider,
        txn_ref=transaction.txn_ref,
        plan_label=transaction.plan_key or transaction.tier,
        amount_vnd=int(transaction.amount_vnd or 0),
        status=transaction.status,
        payment_url=transaction.payment_url,
        vnp_transaction_no=transaction.vnp_transaction_no,
        provider_response_code=transaction.provider_response_code,
        provider_transaction_status=transaction.provider_transaction_status,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
        paid_at=transaction.paid_at,
    )


def _partner_payment_item(transaction: PaymentTransaction, partner: Partner) -> AdminPaymentItem:
    return AdminPaymentItem(
        id=int(transaction.id),
        kind="partner",
        owner_id=int(partner.id),
        owner_name=partner.store_name or partner.company_name,
        owner_email=partner.contact_email,
        provider=transaction.provider,
        txn_ref=transaction.txn_ref,
        plan_label="Gói đại lý",
        amount_vnd=int(transaction.amount_vnd or 0),
        status=transaction.status,
        payment_url=transaction.payment_url,
        vnp_transaction_no=transaction.vnp_transaction_no,
        provider_response_code=transaction.provider_response_code,
        provider_transaction_status=transaction.provider_transaction_status,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
        paid_at=transaction.paid_at,
    )


def _admin_payment_items(
    db: Session,
    kind: str | None,
    status: str | None,
    q: str | None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[AdminPaymentItem]:
    items: list[AdminPaymentItem] = []
    clean_kind = kind.strip() if kind else None
    clean_status = status.strip() if status else None
    keyword = q.strip() if q else None
    if clean_status and clean_status not in PAYMENT_STATUSES:
        raise HTTPException(status_code=400, detail="Trạng thái thanh toán không hợp lệ.")
    start_at = end_exclusive = None
    if start_date or end_date:
        _, _, start_at, end_exclusive = _report_window(start_date, end_date)

    if clean_kind in (None, "", "all", "user"):
        query = db.query(UserPaymentTransaction, User).join(User, User.id == UserPaymentTransaction.user_id)
        if clean_status:
            query = query.filter(UserPaymentTransaction.status == clean_status)
        if keyword:
            like = f"%{keyword}%"
            query = query.filter(
                or_(
                    User.name.ilike(like),
                    User.email.ilike(like),
                    UserPaymentTransaction.txn_ref.ilike(like),
                    UserPaymentTransaction.plan_key.ilike(like),
                )
            )
        for transaction, user in query.all():
            if start_at and end_exclusive and not _payment_in_window(transaction, start_at, end_exclusive):
                continue
            items.append(_user_payment_item(transaction, user))

    if clean_kind in (None, "", "all", "partner"):
        query = db.query(PaymentTransaction, Partner).join(Partner, Partner.id == PaymentTransaction.partner_id)
        if clean_status:
            query = query.filter(PaymentTransaction.status == clean_status)
        if keyword:
            like = f"%{keyword}%"
            query = query.filter(
                or_(
                    Partner.company_name.ilike(like),
                    Partner.store_name.ilike(like),
                    Partner.contact_email.ilike(like),
                    PaymentTransaction.txn_ref.ilike(like),
                )
            )
        for transaction, partner in query.all():
            if start_at and end_exclusive and not _payment_in_window(transaction, start_at, end_exclusive):
                continue
            items.append(_partner_payment_item(transaction, partner))
    return sorted(items, key=lambda item: item.created_at, reverse=True)


@router.get("/payments", response_model=AdminPaymentListEnvelope)
def admin_list_payments(
    kind: str | None = None,
    status: str | None = None,
    q: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    items = _admin_payment_items(db, kind, status, q, start_date=start_date, end_date=end_date)
    total = len(items)
    safe_page, safe_size, page_count = _page_bounds(total, page, page_size)
    start = (safe_page - 1) * safe_size
    return AdminPaymentListEnvelope(
        success=True,
        message="Thành công",
        data=AdminPaymentListData(
            items=items[start : start + safe_size],
            total=total,
            page=safe_page,
            page_size=safe_size,
            page_count=page_count,
        ),
    )


def _revenue_rows(
    db: Session,
    kind: str,
    start_day: date,
    end_day: date,
    partner_id: int | None,
) -> list[dict]:
    _, _, start_at, end_exclusive = _report_window(start_day, end_day)
    rows: list[dict] = []

    if kind in {"all", "user"} and partner_id is None:
        for transaction, user in db.query(UserPaymentTransaction, User).join(User, User.id == UserPaymentTransaction.user_id).all():
            if not _payment_in_window(transaction, start_at, end_exclusive):
                continue
            rows.append(
                {
                    "kind": "user",
                    "id": int(transaction.id),
                    "owner_id": int(user.id),
                    "owner_name": user.name or user.email,
                    "owner_email": user.email,
                    "partner_id": None,
                    "partner_name": None,
                    "amount_vnd": int(transaction.amount_vnd or 0),
                    "status": transaction.status,
                    "plan_label": transaction.plan_key or transaction.tier,
                    "txn_ref": transaction.txn_ref,
                    "paid_at": transaction.paid_at,
                    "created_at": transaction.created_at,
                    "report_at": _payment_report_date(transaction),
                }
            )

    if kind in {"all", "partner"}:
        query = db.query(PaymentTransaction, Partner).join(Partner, Partner.id == PaymentTransaction.partner_id)
        if partner_id is not None:
            query = query.filter(PaymentTransaction.partner_id == partner_id)
        for transaction, partner in query.all():
            if not _payment_in_window(transaction, start_at, end_exclusive):
                continue
            rows.append(
                {
                    "kind": "partner",
                    "id": int(transaction.id),
                    "owner_id": int(partner.id),
                    "owner_name": partner.store_name or partner.company_name,
                    "owner_email": partner.contact_email,
                    "partner_id": int(partner.id),
                    "partner_name": partner.store_name or partner.company_name,
                    "amount_vnd": int(transaction.amount_vnd or 0),
                    "status": transaction.status,
                    "plan_label": "Gói đại lý",
                    "txn_ref": transaction.txn_ref,
                    "paid_at": transaction.paid_at,
                    "created_at": transaction.created_at,
                    "report_at": _payment_report_date(transaction),
                }
            )
    return rows


def _build_revenue_report(
    db: Session,
    start_date: date | None,
    end_date: date | None,
    period: str,
    kind: str,
    partner_id: int | None,
) -> AdminRevenueReportData:
    clean_period = (period or "daily").strip().lower()
    if clean_period not in {"daily", "monthly"}:
        raise HTTPException(status_code=400, detail="Kiểu biểu đồ doanh thu không hợp lệ.")
    clean_kind = (kind or "all").strip().lower()
    if clean_kind not in {"all", "user", "partner"}:
        raise HTTPException(status_code=400, detail="Loại giao dịch không hợp lệ.")
    if partner_id is not None and clean_kind == "user":
        raise HTTPException(status_code=400, detail="Không thể lọc đại lý cho giao dịch người dùng.")

    start_day, end_day, _, _ = _report_window(start_date, end_date)
    rows = _revenue_rows(db, clean_kind, start_day, end_day, partner_id)

    gross_success = sum(row["amount_vnd"] for row in rows if row["status"] == "success")
    user_success = sum(row["amount_vnd"] for row in rows if row["kind"] == "user" and row["status"] == "success")
    partner_success = sum(row["amount_vnd"] for row in rows if row["kind"] == "partner" and row["status"] == "success")
    user_success_count = sum(1 for row in rows if row["kind"] == "user" and row["status"] == "success")
    partner_success_count = sum(1 for row in rows if row["kind"] == "partner" and row["status"] == "success")
    refunded = sum(row["amount_vnd"] for row in rows if row["status"] == "refunded")
    fee = sum(_vnpay_fee(row["amount_vnd"]) for row in rows if row["status"] == "success")
    success_count = sum(1 for row in rows if row["status"] == "success")
    refunded_count = sum(1 for row in rows if row["status"] == "refunded")
    pending_count = sum(1 for row in rows if row["status"] == "pending")
    failed_count = sum(1 for row in rows if row["status"] in {"failed", "invalid"})

    series_map = {
        key: {"gross": 0, "fee": 0, "refunded": 0, "count": 0}
        for key in _period_keys(start_day, end_day, clean_period)
    }
    partner_map: dict[int, dict] = {}
    payer_map: dict[tuple[str, int], dict] = {}
    for row in rows:
        key = _period_key(row["report_at"], clean_period)
        bucket = series_map.setdefault(key, {"gross": 0, "fee": 0, "refunded": 0, "count": 0})
        amount = row["amount_vnd"]
        if row["status"] == "success":
            row_fee = _vnpay_fee(amount)
            bucket["gross"] += amount
            bucket["fee"] += row_fee
            bucket["count"] += 1
        elif row["status"] == "refunded":
            bucket["refunded"] += amount

        payer_key = (row["kind"], row["owner_id"])
        payer_bucket = payer_map.setdefault(
            payer_key,
            {
                "kind": row["kind"],
                "owner_id": row["owner_id"],
                "owner_name": row["owner_name"],
                "owner_email": row["owner_email"],
                "gross": 0,
                "fee": 0,
                "refunded": 0,
                "count": 0,
                "last_paid_at": None,
            },
        )
        if row["status"] == "success":
            payer_bucket["gross"] += amount
            payer_bucket["fee"] += _vnpay_fee(amount)
            payer_bucket["count"] += 1
            paid_at = row["paid_at"] or row["created_at"]
            if payer_bucket["last_paid_at"] is None or paid_at > payer_bucket["last_paid_at"]:
                payer_bucket["last_paid_at"] = paid_at
        elif row["status"] == "refunded":
            payer_bucket["refunded"] += amount

        if row["kind"] != "partner" or row["partner_id"] is None:
            continue
        partner_bucket = partner_map.setdefault(
            row["partner_id"],
            {
                "partner_name": row["partner_name"] or f"Đại lý #{row['partner_id']}",
                "contact_email": row["owner_email"],
                "gross": 0,
                "fee": 0,
                "refunded": 0,
                "count": 0,
                "last_paid_at": None,
            },
        )
        if row["status"] == "success":
            partner_bucket["gross"] += amount
            partner_bucket["fee"] += _vnpay_fee(amount)
            partner_bucket["count"] += 1
            paid_at = row["paid_at"] or row["created_at"]
            if partner_bucket["last_paid_at"] is None or paid_at > partner_bucket["last_paid_at"]:
                partner_bucket["last_paid_at"] = paid_at
        elif row["status"] == "refunded":
            partner_bucket["refunded"] += amount

    series = [
        AdminRevenueSeriesItem(
            period=key,
            gross_vnd=int(values["gross"]),
            fee_vnd=int(values["fee"]),
            net_vnd=max(int(values["gross"]) - int(values["fee"]), 0),
            refunded_vnd=int(values["refunded"]),
            transaction_count=int(values["count"]),
        )
        for key, values in sorted(series_map.items())
    ]

    partner_reports = [
        AdminPartnerRevenueItem(
            partner_id=partner_id_value,
            partner_name=str(values["partner_name"]),
            contact_email=values["contact_email"],
            gross_vnd=int(values["gross"]),
            fee_vnd=int(values["fee"]),
            net_vnd=max(int(values["gross"]) - int(values["fee"]), 0),
            refunded_vnd=int(values["refunded"]),
            transaction_count=int(values["count"]),
            last_paid_at=values["last_paid_at"],
        )
        for partner_id_value, values in partner_map.items()
    ]

    payer_reports = [
        AdminPayerRevenueItem(
            kind=str(values["kind"]),
            owner_id=int(values["owner_id"]),
            owner_name=str(values["owner_name"]),
            owner_email=values["owner_email"],
            gross_vnd=int(values["gross"]),
            fee_vnd=int(values["fee"]),
            net_vnd=max(int(values["gross"]) - int(values["fee"]), 0),
            refunded_vnd=int(values["refunded"]),
            transaction_count=int(values["count"]),
            last_paid_at=values["last_paid_at"],
        )
        for values in payer_map.values()
        if int(values["gross"]) > 0 or int(values["refunded"]) > 0
    ]

    return AdminRevenueReportData(
        start_date=start_day,
        end_date=end_day,
        period=clean_period,
        kind=clean_kind,
        partner_id=partner_id,
        fee_percent=VNPAY_FEE_PERCENT,
        fee_fixed_vnd=VNPAY_FEE_FIXED_VND,
        gross_success_vnd=gross_success,
        user_success_vnd=user_success,
        partner_success_vnd=partner_success,
        user_success_count=user_success_count,
        partner_success_count=partner_success_count,
        refunded_vnd=refunded,
        vnpay_fee_vnd=fee,
        net_revenue_vnd=max(gross_success - fee, 0),
        success_count=success_count,
        refunded_count=refunded_count,
        pending_count=pending_count,
        failed_count=failed_count,
        series=series,
        partner_reports=sorted(partner_reports, key=lambda item: item.net_vnd, reverse=True),
        payer_reports=sorted(payer_reports, key=lambda item: item.net_vnd, reverse=True),
    )


@router.get("/revenue-report", response_model=AdminRevenueReportEnvelope)
def admin_revenue_report(
    start_date: date | None = None,
    end_date: date | None = None,
    period: str = "daily",
    kind: str = "all",
    partner_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    data = _build_revenue_report(db, start_date, end_date, period, kind, partner_id)
    return AdminRevenueReportEnvelope(success=True, message="Thành công", data=data)


def _csv_report(data: AdminRevenueReportData) -> bytes:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Bao cao doanh thu LeafScan AI"])
    writer.writerow(["Tu ngay", data.start_date.isoformat(), "Den ngay", data.end_date.isoformat(), "Ky", data.period])
    writer.writerow(["Doanh thu gop", data.gross_success_vnd])
    writer.writerow(["Phi VNPAY uoc tinh", data.vnpay_fee_vnd])
    writer.writerow(["Doanh thu rong", data.net_revenue_vnd])
    writer.writerow(["Hoan tien", data.refunded_vnd])
    writer.writerow([])
    writer.writerow(["Ky", "Doanh thu LeafScan gop", "Phi", "Doanh thu LeafScan rong", "Hoan tien", "Giao dich thanh cong"])
    for item in data.series:
        writer.writerow([item.period, item.gross_vnd, item.fee_vnd, item.net_vnd, item.refunded_vnd, item.transaction_count])
    writer.writerow([])
    writer.writerow(["Nguon thanh toan", "Loai", "Email", "Doanh thu LeafScan gop", "Phi", "Doanh thu LeafScan rong", "Hoan tien", "Giao dich", "Lan thanh toan cuoi"])
    for item in data.payer_reports:
        writer.writerow(
            [
                item.owner_name,
                item.kind,
                item.owner_email or "",
                item.gross_vnd,
                item.fee_vnd,
                item.net_vnd,
                item.refunded_vnd,
                item.transaction_count,
                item.last_paid_at.isoformat() if item.last_paid_at else "",
            ]
        )
    return ("\ufeff" + output.getvalue()).encode("utf-8")


def _ascii_pdf(value: object) -> str:
    normalized = unicodedata.normalize("NFKD", str(value))
    clean = normalized.encode("ascii", "ignore").decode("ascii")
    return clean.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _pdf_report(data: AdminRevenueReportData) -> bytes:
    lines = [
        "Bao cao doanh thu LeafScan AI",
        f"Khoang thoi gian: {data.start_date.isoformat()} den {data.end_date.isoformat()}",
        f"Kieu bieu do: {data.period}",
        f"Doanh thu gop: {data.gross_success_vnd:,} VND",
        f"Phi VNPAY uoc tinh: {data.vnpay_fee_vnd:,} VND",
        f"Doanh thu rong: {data.net_revenue_vnd:,} VND",
        f"Hoan tien da ghi nhan: {data.refunded_vnd:,} VND",
        f"Goi nguoi dung: {data.user_success_vnd:,} VND / {data.user_success_count} giao dich",
        f"Goi dai ly: {data.partner_success_vnd:,} VND / {data.partner_success_count} giao dich",
        "",
        "Doanh thu theo ky:",
    ]
    lines.extend(
        f"{item.period}: gross {item.gross_vnd:,} | fee {item.fee_vnd:,} | net {item.net_vnd:,} | tx {item.transaction_count}"
        for item in data.series[:22]
    )
    if data.payer_reports:
        lines.extend(["", "Top nguon thanh toan:"])
        lines.extend(
            f"{item.owner_name}: net {item.net_vnd:,} | gross {item.gross_vnd:,} | tx {item.transaction_count}"
            for item in data.payer_reports[:10]
        )

    y = 790
    commands = ["BT", "/F1 11 Tf", "50 810 Td"]
    previous_y = 810
    for line in lines[:48]:
        commands.append(f"0 -{previous_y - y} Td ({_ascii_pdf(line)}) Tj")
        previous_y = y
        y -= 16
    commands.append("ET")
    stream = "\n".join(commands).encode("latin-1", errors="ignore")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")
    xref_at = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF".encode("ascii"))
    return bytes(pdf)


@router.get("/revenue-report/export")
def admin_export_revenue_report(
    format: str = Query(default="excel", pattern="^(excel|pdf)$"),
    start_date: date | None = None,
    end_date: date | None = None,
    period: str = "daily",
    kind: str = "all",
    partner_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    data = _build_revenue_report(db, start_date, end_date, period, kind, partner_id)
    if format == "pdf":
        filename = f"leafscan-revenue-{data.start_date.isoformat()}-{data.end_date.isoformat()}.pdf"
        return Response(
            content=_pdf_report(data),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    filename = f"leafscan-revenue-{data.start_date.isoformat()}-{data.end_date.isoformat()}.csv"
    return Response(
        content=_csv_report(data),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _append_refund_payload(transaction, reason: str | None, admin_id: int) -> None:
    raw_payload = dict(transaction.raw_payload) if isinstance(transaction.raw_payload, dict) else {}
    raw_payload["admin_refund"] = {
        "reason": reason or "Admin ghi nhận hoàn tiền thủ công.",
        "refunded_at": datetime.utcnow().isoformat(),
        "admin_id": admin_id,
    }
    transaction.raw_payload = raw_payload


@router.post("/payments/{kind}/{payment_id}/refund", response_model=AdminRefundEnvelope)
def admin_refund_payment(
    kind: str,
    payment_id: int,
    payload: AdminRefundRequest | None = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_admin),
):
    clean_kind = kind.strip().lower()
    reason = payload.reason.strip() if payload and payload.reason else None
    now = datetime.utcnow()

    if clean_kind == "user":
        row = (
            db.query(UserPaymentTransaction, User)
            .join(User, User.id == UserPaymentTransaction.user_id)
            .filter(UserPaymentTransaction.id == payment_id)
            .first()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch người dùng.")
        transaction, user = row
        if transaction.status != "success":
            raise HTTPException(status_code=400, detail="Chỉ có thể hoàn tiền giao dịch đã thành công.")
        latest_success = (
            db.query(UserPaymentTransaction)
            .filter(UserPaymentTransaction.user_id == transaction.user_id, UserPaymentTransaction.status == "success")
            .order_by(desc(UserPaymentTransaction.paid_at), desc(UserPaymentTransaction.created_at), desc(UserPaymentTransaction.id))
            .first()
        )
        transaction.status = "refunded"
        transaction.provider_transaction_status = "refunded"
        transaction.updated_at = now
        _append_refund_payload(transaction, reason, current_admin.id)
        if latest_success and latest_success.id == transaction.id:
            subscription = db.query(Subscription).filter(Subscription.user_id == transaction.user_id).first()
            if subscription:
                subscription.tier = "free"
                subscription.expires_at = None
                subscription.updated_at = now
        db.commit()
        db.refresh(transaction)
        return AdminRefundEnvelope(success=True, message="Đã ghi nhận hoàn tiền giao dịch người dùng.", data=_user_payment_item(transaction, user))

    if clean_kind == "partner":
        row = (
            db.query(PaymentTransaction, Partner)
            .join(Partner, Partner.id == PaymentTransaction.partner_id)
            .filter(PaymentTransaction.id == payment_id)
            .first()
        )
        if not row:
            raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch đại lý.")
        transaction, partner = row
        if transaction.status != "success":
            raise HTTPException(status_code=400, detail="Chỉ có thể hoàn tiền giao dịch đã thành công.")
        transaction.status = "refunded"
        transaction.provider_transaction_status = "refunded"
        transaction.updated_at = now
        _append_refund_payload(transaction, reason, current_admin.id)
        memberships = db.query(PartnerMembership).filter(PartnerMembership.source_transaction_id == transaction.id).all()
        for membership in memberships:
            membership.status = "cancelled"
            membership.expires_at = now
        db.commit()
        db.refresh(transaction)
        return AdminRefundEnvelope(success=True, message="Đã ghi nhận hoàn tiền giao dịch đại lý.", data=_partner_payment_item(transaction, partner))

    raise HTTPException(status_code=400, detail="Loại giao dịch không hợp lệ.")


@router.get("/scans", response_model=AdminScanListEnvelope)
def admin_list_scans(
    q: str | None = None,
    severity: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = (
        db.query(ScanHistory, User, Plant, Disease)
        .outerjoin(User, User.id == ScanHistory.user_id)
        .outerjoin(Plant, Plant.id == ScanHistory.plant_id)
        .outerjoin(Disease, Disease.disease_key == ScanHistory.disease_key)
        .order_by(desc(ScanHistory.scan_date))
    )
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.name.ilike(like),
                User.email.ilike(like),
                Plant.name.ilike(like),
                Disease.name.ilike(like),
                ScanHistory.disease_key.ilike(like),
            )
        )
    if severity:
        query = query.filter(Disease.severity == severity.strip())

    total = int(query.count() or 0)
    safe_page, safe_size, page_count = _page_bounds(total, page, page_size)
    rows = query.offset((safe_page - 1) * safe_size).limit(safe_size).all()
    items = [
        AdminScanItem(
            id=int(scan.id),
            user_id=int(user.id) if user else None,
            user_name=user.name if user else None,
            user_email=user.email if user else None,
            plant_id=int(plant.id) if plant else None,
            plant_name=plant.name if plant else None,
            disease_key=scan.disease_key,
            disease_name=disease.name if disease else None,
            image_url=scan.image_url,
            confidence=float(scan.confidence or 0.0),
            predicted_stage=scan.predicted_stage,
            forecast_stage_7d=scan.forecast_stage_7d,
            affected_area_snapshot=scan.affected_area_snapshot,
            scan_date=scan.scan_date,
        )
        for scan, user, plant, disease in rows
    ]
    return AdminScanListEnvelope(
        success=True,
        message="Thành công",
        data=AdminScanListData(items=items, total=total, page=safe_page, page_size=safe_size, page_count=page_count),
    )


def _disease_item(row: Disease) -> AdminDiseaseItem:
    return AdminDiseaseItem(
        id=int(row.id),
        disease_key=row.disease_key,
        model_class_name=row.model_class_name,
        name=row.name,
        severity=row.severity,
        description=row.description,
        symptoms=row.symptoms or [],
        treatment=row.treatment or [],
        prevention=row.prevention or [],
        affected_area_typical=int(row.affected_area_typical or 0),
        image_url=row.image_url,
    )


@router.get("/diseases", response_model=AdminDiseaseListEnvelope)
def admin_list_diseases(
    q: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = db.query(Disease).order_by(Disease.name.asc())
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(Disease.name.ilike(like), Disease.disease_key.ilike(like), Disease.model_class_name.ilike(like)))
    return AdminDiseaseListEnvelope(success=True, message="Thành công", data=[_disease_item(item) for item in query.all()])


@router.post("/diseases", response_model=AdminDiseaseEnvelope)
def admin_create_disease(
    payload: AdminDiseasePayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    existing = db.query(Disease).filter(Disease.disease_key == payload.disease_key.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Mã bệnh đã tồn tại.")
    row = Disease(**payload.model_dump())
    row.disease_key = row.disease_key.strip()
    db.add(row)
    db.commit()
    db.refresh(row)
    return AdminDiseaseEnvelope(success=True, message="Đã tạo bệnh cây.", data=_disease_item(row))


@router.put("/diseases/{disease_id}", response_model=AdminDiseaseEnvelope)
def admin_update_disease(
    disease_id: int,
    payload: AdminDiseasePayload,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = db.query(Disease).filter(Disease.id == disease_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy bệnh cây.")
    duplicate = db.query(Disease).filter(Disease.disease_key == payload.disease_key.strip(), Disease.id != disease_id).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Mã bệnh đã tồn tại.")
    for field, value in payload.model_dump().items():
        setattr(row, field, value.strip() if isinstance(value, str) else value)
    db.commit()
    db.refresh(row)
    return AdminDiseaseEnvelope(success=True, message="Đã cập nhật bệnh cây.", data=_disease_item(row))


@router.delete("/diseases/{disease_id}", response_model=AdminDiseaseEnvelope)
def admin_delete_disease(
    disease_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    row = db.query(Disease).filter(Disease.id == disease_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Không tìm thấy bệnh cây.")
    db.delete(row)
    db.commit()
    return AdminDiseaseEnvelope(success=True, message="Đã xóa bệnh cây.", data=None)


@router.get("/dashboard", response_model=AdminDashboardEnvelope)
def admin_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user_success_revenue = _sum_amount(db, UserPaymentTransaction, UserPaymentTransaction.status == "success")
    partner_success_revenue = _sum_amount(db, PaymentTransaction, PaymentTransaction.status == "success")
    user_success_count = _count(db, UserPaymentTransaction, UserPaymentTransaction.status == "success")
    partner_success_count = _count(db, PaymentTransaction, PaymentTransaction.status == "success")
    pending_payment_count = _count(db, UserPaymentTransaction, UserPaymentTransaction.status == "pending") + _count(
        db,
        PaymentTransaction,
        PaymentTransaction.status == "pending",
    )

    data = AdminDashboardData(
        users=AdminCountBreakdown(
            total=_count(db, User),
            active=_count(db, User, User.role == "farmer"),
            approved=_count(db, User, User.role.in_(["partner", "dealer"])),
            pending=_count(db, User, User.role == "admin"),
        ),
        scans=AdminCountBreakdown(total=_count(db, ScanHistory)),
        plants=AdminCountBreakdown(total=_count(db, Plant)),
        partners=AdminCountBreakdown(
            total=_count(db, Partner),
            pending=_count(db, Partner, Partner.status == "pending_review"),
            active=_count(db, Partner, Partner.status == "active"),
            rejected=_count(db, Partner, Partner.status == "rejected"),
            suspended=_count(db, Partner, Partner.status == "suspended"),
        ),
        products=AdminCountBreakdown(
            total=_count(db, PartnerProduct),
            pending=_count(db, PartnerProduct, PartnerProduct.moderation_status == "pending_review"),
            active=_count(db, PartnerProduct, PartnerProduct.is_active == True),  # noqa: E712
            approved=_count(db, PartnerProduct, PartnerProduct.moderation_status == "approved"),
            rejected=_count(db, PartnerProduct, PartnerProduct.moderation_status == "rejected"),
        ),
        subscriptions=AdminCountBreakdown(
            total=_count(db, Subscription),
            active=_count(db, Subscription, Subscription.tier.in_(["personal", "pro"]), Subscription.expires_at >= func.now()),
            pending=_count(db, Subscription, Subscription.tier == "free"),
            rejected=_count(db, Subscription, Subscription.tier.in_(["personal", "pro"]), Subscription.expires_at < func.now()),
        ),
        notifications=AdminCountBreakdown(
            total=_count(db, Notification),
            active=_count(db, PushToken, PushToken.is_active == True),  # noqa: E712
            pending=_count(db, Notification, Notification.read_at.is_(None)),
            approved=_count(db, NotificationDelivery, NotificationDelivery.status == "sent"),
            rejected=_count(db, NotificationDelivery, NotificationDelivery.status == "failed"),
        ),
        revenue=AdminRevenueStats(
            user_success_vnd=user_success_revenue,
            partner_success_vnd=partner_success_revenue,
            total_success_vnd=user_success_revenue + partner_success_revenue,
            user_success_count=user_success_count,
            partner_success_count=partner_success_count,
            pending_count=pending_payment_count,
        ),
        payments=_payment_stats(db),
        activity=_scan_activity(db),
        marketplace=_marketplace_stats(db),
        content=_content_stats(db),
        scan_series=_scan_series(db),
        top_diseases=_top_diseases(db),
        top_products=_top_products(db),
        recent_transactions=_recent_transactions(db),
    )
    return AdminDashboardEnvelope(success=True, message="Thành công", data=data)
