from __future__ import annotations

from datetime import date

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


class AdminDashboardData(BaseModel):
    users: AdminCountBreakdown
    scans: AdminCountBreakdown
    plants: AdminCountBreakdown
    partners: AdminCountBreakdown
    products: AdminCountBreakdown
    subscriptions: AdminCountBreakdown
    notifications: AdminCountBreakdown
    revenue: AdminRevenueStats
    scan_series: list[AdminScanSeriesItem]
    top_diseases: list[AdminTopDiseaseItem]
    top_products: list[AdminTopProductItem]


class AdminDashboardEnvelope(BaseModel):
    success: bool
    message: str
    data: AdminDashboardData
