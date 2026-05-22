"""
Pydantic schemas cho Subscription, Partner Marketplace và VNPAY.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field


# ──────────────────────────────────────────────
# Subscription
# ──────────────────────────────────────────────

class SubscriptionStatusDTO(BaseModel):
    tier: str
    remaining_scans: int
    daily_scan_limit: int
    used_scans_today: int
    expires_at: datetime | None

    class Config:
        from_attributes = True


class UpgradeRequest(BaseModel):
    duration_days: int = 30


class SubscriptionResponse(BaseModel):
    success: bool
    message: str
    data: SubscriptionStatusDTO | None = None


class UserPaymentCreateRequestDTO(BaseModel):
    plan_key: Literal["personal_monthly", "personal_yearly", "pro_monthly", "pro_yearly"]


class UserPaymentCreateResponseDTO(BaseModel):
    txn_ref: str
    amount_vnd: int
    payment_url: str
    status: str
    plan_key: Literal["personal_monthly", "personal_yearly", "pro_monthly", "pro_yearly"]
    tier: Literal["personal", "pro"]
    duration_days: int
    daily_scan_limit: int


class UserPaymentTransactionDTO(BaseModel):
    id: int
    user_id: int
    provider: str
    txn_ref: str
    plan_key: str
    tier: str
    amount_vnd: int
    duration_days: int
    daily_scan_limit: int
    status: str
    payment_url: str | None = None
    vnp_transaction_no: str | None = None
    provider_response_code: str | None = None
    provider_transaction_status: str | None = None
    created_at: datetime
    updated_at: datetime
    paid_at: datetime | None = None

    class Config:
        from_attributes = True


class UserPaymentCreateEnvelope(BaseModel):
    success: bool
    message: str
    data: UserPaymentCreateResponseDTO


class UserPaymentStatusEnvelope(BaseModel):
    success: bool
    message: str
    data: UserPaymentTransactionDTO


# ──────────────────────────────────────────────
# Partner
# ──────────────────────────────────────────────

class PartnerRegistrationDTO(BaseModel):
    company_name: str
    store_name: str | None = None
    description: str | None = None
    address: str | None = None
    contact_email: EmailStr
    phone: str
    business_license: str
    representative_name: str
    representative_role: str
    service_area: str
    main_products: str
    advertising_commitment_accepted: bool = False
    product_categories: list[str] = Field(default_factory=list)
    website_url: str | None = None
    contact_url: str | None = None


class PartnerUpdateDTO(BaseModel):
    company_name: str | None = None
    store_name: str | None = None
    description: str | None = None
    address: str | None = None
    phone: str | None = None
    business_license: str | None = None
    representative_name: str | None = None
    representative_role: str | None = None
    service_area: str | None = None
    main_products: str | None = None
    advertising_commitment_accepted: bool | None = None
    product_categories: list[str] | None = None
    website_url: str | None = None
    contact_url: str | None = None


class PartnerMembershipDTO(BaseModel):
    id: int
    status: str
    price_vnd: int
    duration_days: int
    max_active_products: int
    started_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True


class PartnerResponse(BaseModel):
    id: int
    user_id: int | None = None
    company_name: str
    store_name: str | None = None
    description: str | None = None
    address: str | None = None
    logo_url: str | None = None
    cover_url: str | None = None
    contact_email: str
    phone: str
    business_license: str
    business_license_file_url: str | None = None
    representative_name: str | None = None
    representative_role: str | None = None
    service_area: str | None = None
    main_products: str | None = None
    advertising_commitment_accepted: bool = False
    advertising_commitment_at: datetime | None = None
    product_categories: list[str]
    website_url: str | None = None
    contact_url: str | None = None
    status: str
    rejection_reason: str | None = None
    active_membership: PartnerMembershipDTO | None = None
    active_product_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class PartnerEnvelope(BaseModel):
    success: bool
    message: str
    data: PartnerResponse | None = None


class PartnerListEnvelope(BaseModel):
    success: bool
    message: str
    data: list[PartnerResponse]


class AdminStatusUpdateDTO(BaseModel):
    status: str
    rejection_reason: str | None = None


# ──────────────────────────────────────────────
# Partner Product
# ──────────────────────────────────────────────

class ProductCreateDTO(BaseModel):
    name: str
    description: str | None = None
    image_url: str | None = None
    price_range: str | None = None
    target_diseases: list[str] = Field(default_factory=list)
    target_categories: list[str] = Field(default_factory=list)
    product_url: str | None = None


class ProductUpdateDTO(BaseModel):
    name: str | None = None
    description: str | None = None
    image_url: str | None = None
    price_range: str | None = None
    target_diseases: list[str] | None = None
    target_categories: list[str] | None = None
    product_url: str | None = None
    is_active: bool | None = None


class ProductToggleDTO(BaseModel):
    is_active: bool


class PartnerProductResponse(BaseModel):
    id: int
    partner_id: int
    partner_name: str | None = None
    partner_status: str | None = None
    name: str
    description: str | None
    image_url: str | None
    price_range: str | None
    target_diseases: list[str]
    target_categories: list[str]
    product_url: str | None
    is_active: bool
    moderation_status: str
    rejection_reason: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProductEnvelope(BaseModel):
    success: bool
    message: str
    data: PartnerProductResponse | None = None


class ProductListEnvelope(BaseModel):
    success: bool
    message: str
    data: list[PartnerProductResponse]


class RecommendedProductDTO(BaseModel):
    id: int
    name: str
    image_url: str | None
    partner_name: str
    product_url: str | None
    price_range: str | None


# ──────────────────────────────────────────────
# VNPAY Payments
# ──────────────────────────────────────────────

class PaymentCreateRequestDTO(BaseModel):
    plan_type: Literal["monthly", "yearly"] = "monthly"


class PaymentCreateResponseDTO(BaseModel):
    txn_ref: str
    amount_vnd: int
    payment_url: str
    status: str
    plan_type: Literal["monthly", "yearly"]
    duration_days: int
    max_active_products: int


class PaymentTransactionDTO(BaseModel):
    id: int
    partner_id: int
    provider: str
    txn_ref: str
    amount_vnd: int
    status: str
    payment_url: str | None = None
    vnp_transaction_no: str | None = None
    provider_response_code: str | None = None
    provider_transaction_status: str | None = None
    created_at: datetime
    updated_at: datetime
    paid_at: datetime | None = None

    class Config:
        from_attributes = True


class PaymentCreateEnvelope(BaseModel):
    success: bool
    message: str
    data: PaymentCreateResponseDTO


class PaymentStatusEnvelope(BaseModel):
    success: bool
    message: str
    data: PaymentTransactionDTO


# ──────────────────────────────────────────────
# Partner Stats
# ──────────────────────────────────────────────

class StatsRequestDTO(BaseModel):
    start_date: date
    end_date: date


class ProductStatsItem(BaseModel):
    product_id: int
    product_name: str
    total_impressions: int
    unique_users: int
    clicks: int


class PartnerStatsDTO(BaseModel):
    partner_id: int
    period_start: date
    period_end: date
    total_impressions: int
    total_unique_users: int
    total_clicks: int
    products: list[ProductStatsItem]
