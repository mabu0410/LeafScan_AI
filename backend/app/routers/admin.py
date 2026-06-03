from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.admin import require_admin
from app.models.domain import (
    Disease,
    NotificationDelivery,
    Partner,
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
    AdminDashboardData,
    AdminDashboardEnvelope,
    AdminRevenueStats,
    AdminScanSeriesItem,
    AdminTopDiseaseItem,
    AdminTopProductItem,
)


router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


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
            active=_count(db, Subscription, Subscription.tier.in_(["personal", "pro"])),
            pending=_count(db, Subscription, Subscription.tier == "free"),
        ),
        notifications=AdminCountBreakdown(
            total=_count(db, PushToken),
            active=_count(db, PushToken, PushToken.is_active == True),  # noqa: E712
            pending=_count(db, NotificationDelivery, NotificationDelivery.status == "pending"),
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
        scan_series=_scan_series(db),
        top_diseases=_top_diseases(db),
        top_products=_top_products(db),
    )
    return AdminDashboardEnvelope(success=True, message="Thành công", data=data)
