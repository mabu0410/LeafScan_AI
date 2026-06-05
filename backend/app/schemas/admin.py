from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel


class AdminCountBreakdown(BaseModel):
    total: int
    pending: int = 0
    active: int = 0
    approved: int = 0
    rejected: int = 0
    suspended: int = 0


class AdminRevenueStats(BaseModel):
    user_success_vnd: int
    partner_success_vnd: int
    total_success_vnd: int
    user_success_count: int
    partner_success_count: int
    pending_count: int


class AdminPaymentStatusStats(BaseModel):
    user_pending_count: int
    user_success_count: int
    user_failed_count: int
    partner_pending_count: int
    partner_success_count: int
    partner_failed_count: int
    pending_amount_vnd: int
    failed_amount_vnd: int


class AdminScanActivityStats(BaseModel):
    today: int
    last_7d: int
    last_30d: int
    average_confidence: float | None = None
    low_confidence: int
    with_plant: int
    without_plant: int


class AdminMarketplaceStats(BaseModel):
    stores_total: int
    stores_active: int
    memberships_total: int
    memberships_active: int
    memberships_expired: int
    impressions_total: int
    clicks_total: int
    click_rate: float


class AdminContentStats(BaseModel):
    diseases_total: int
    care_tips_total: int
    care_tips_active: int
    care_tips_hidden: int


class AdminScanSeriesItem(BaseModel):
    date: date
    scans: int


class AdminTopDiseaseItem(BaseModel):
    disease_key: str
    disease_name: str | None = None
    scans: int
    avg_confidence: float | None = None


class AdminTopProductItem(BaseModel):
    product_id: int
    product_name: str
    partner_name: str | None = None
    impressions: int
    clicks: int
    click_rate: float


class AdminRecentTransactionItem(BaseModel):
    id: int
    kind: str
    owner_name: str
    plan_label: str
    amount_vnd: int
    status: str
    created_at: datetime
    paid_at: datetime | None = None


class AdminDashboardData(BaseModel):
    users: AdminCountBreakdown
    scans: AdminCountBreakdown
    plants: AdminCountBreakdown
    partners: AdminCountBreakdown
    products: AdminCountBreakdown
    subscriptions: AdminCountBreakdown
    notifications: AdminCountBreakdown
    revenue: AdminRevenueStats
    payments: AdminPaymentStatusStats
    activity: AdminScanActivityStats
    marketplace: AdminMarketplaceStats
    content: AdminContentStats
    scan_series: list[AdminScanSeriesItem]
    top_diseases: list[AdminTopDiseaseItem]
    top_products: list[AdminTopProductItem]
    recent_transactions: list[AdminRecentTransactionItem]


class AdminDashboardEnvelope(BaseModel):
    success: bool
    message: str
    data: AdminDashboardData


class AdminPaginationMeta(BaseModel):
    total: int
    page: int
    page_size: int
    page_count: int


class AdminUserItem(BaseModel):
    id: int
    name: str
    email: str
    phone: str | None = None
    role: str
    status: str
    plant_count: int
    scan_count: int
    created_at: datetime


class AdminUserListData(BaseModel):
    items: list[AdminUserItem]
    total: int
    page: int
    page_size: int
    page_count: int


class AdminUserListEnvelope(BaseModel):
    success: bool
    message: str
    data: AdminUserListData


class AdminUserStatusUpdate(BaseModel):
    status: str


class AdminUserEnvelope(BaseModel):
    success: bool
    message: str
    data: AdminUserItem


class AdminPaymentItem(BaseModel):
    id: int
    kind: str
    owner_id: int
    owner_name: str
    owner_email: str | None = None
    provider: str
    txn_ref: str
    plan_label: str
    amount_vnd: int
    status: str
    payment_url: str | None = None
    vnp_transaction_no: str | None = None
    provider_response_code: str | None = None
    provider_transaction_status: str | None = None
    created_at: datetime
    updated_at: datetime
    paid_at: datetime | None = None


class AdminPaymentListData(BaseModel):
    items: list[AdminPaymentItem]
    total: int
    page: int
    page_size: int
    page_count: int


class AdminPaymentListEnvelope(BaseModel):
    success: bool
    message: str
    data: AdminPaymentListData


class AdminRevenueSeriesItem(BaseModel):
    period: str
    gross_vnd: int
    fee_vnd: int
    net_vnd: int
    refunded_vnd: int
    transaction_count: int


class AdminPartnerRevenueItem(BaseModel):
    partner_id: int
    partner_name: str
    contact_email: str | None = None
    gross_vnd: int
    fee_vnd: int
    net_vnd: int
    refunded_vnd: int
    transaction_count: int
    last_paid_at: datetime | None = None


class AdminRevenueReportData(BaseModel):
    start_date: date
    end_date: date
    period: str
    kind: str
    partner_id: int | None = None
    fee_percent: float
    fee_fixed_vnd: int
    gross_success_vnd: int
    user_success_vnd: int
    partner_success_vnd: int
    refunded_vnd: int
    vnpay_fee_vnd: int
    net_revenue_vnd: int
    success_count: int
    refunded_count: int
    pending_count: int
    failed_count: int
    series: list[AdminRevenueSeriesItem]
    partner_reports: list[AdminPartnerRevenueItem]


class AdminRevenueReportEnvelope(BaseModel):
    success: bool
    message: str
    data: AdminRevenueReportData


class AdminRefundRequest(BaseModel):
    reason: str | None = None


class AdminRefundEnvelope(BaseModel):
    success: bool
    message: str
    data: AdminPaymentItem


class AdminScanItem(BaseModel):
    id: int
    user_id: int | None = None
    user_name: str | None = None
    user_email: str | None = None
    plant_id: int | None = None
    plant_name: str | None = None
    disease_key: str | None = None
    disease_name: str | None = None
    image_url: str
    confidence: float
    predicted_stage: str
    forecast_stage_7d: str
    affected_area_snapshot: float | None = None
    scan_date: datetime


class AdminScanListData(BaseModel):
    items: list[AdminScanItem]
    total: int
    page: int
    page_size: int
    page_count: int


class AdminScanListEnvelope(BaseModel):
    success: bool
    message: str
    data: AdminScanListData


class AdminDiseaseItem(BaseModel):
    id: int
    disease_key: str
    model_class_name: str | None = None
    name: str
    severity: str | None = None
    description: str | None = None
    symptoms: list[str]
    treatment: list[str]
    prevention: list[str]
    affected_area_typical: int
    image_url: str | None = None

    class Config:
        from_attributes = True


class AdminDiseasePayload(BaseModel):
    disease_key: str
    model_class_name: str | None = None
    name: str
    severity: str | None = None
    description: str | None = None
    symptoms: list[str] = []
    treatment: list[str] = []
    prevention: list[str] = []
    affected_area_typical: int = 0
    image_url: str | None = None


class AdminDiseaseListEnvelope(BaseModel):
    success: bool
    message: str
    data: list[AdminDiseaseItem]


class AdminDiseaseEnvelope(BaseModel):
    success: bool
    message: str
    data: AdminDiseaseItem | None = None
