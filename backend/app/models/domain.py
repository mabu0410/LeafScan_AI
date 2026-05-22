"""
SQLAlchemy Domain Models (Database Tables)
"""
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
    Index,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    """Bảng lưu thông tin người dùng."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    role = Column(String(20), nullable=False, default="farmer")  # farmer | partner
    google_id = Column(String, unique=True, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    plants = relationship("Plant", back_populates="user", cascade="all, delete-orphan")
    scans = relationship("ScanHistory", back_populates="user", cascade="all, delete-orphan")

class Plant(Base):
    """Bảng lưu thông tin các cây trồng trong khu vườn (My Garden)."""
    __tablename__ = "plants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    latin_name = Column(String)
    category = Column(String)
    image_url = Column(String)
    thumbnail_url = Column(String)
    location = Column(String)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Custom scoring (could be updated by scans)
    health_score = Column(Float, default=100.0)

    user = relationship("User", back_populates="plants")
    scans = relationship("ScanHistory", back_populates="plant")

class Disease(Base):
    """Bách khoa toàn thư chứa thông tin các bệnh."""
    __tablename__ = "diseases"

    id = Column(Integer, primary_key=True, index=True)
    disease_key = Column(String, unique=True, index=True)  # AI output label, e.g. "tomato_early_blight"
    model_class_name = Column(String, unique=True, index=True, nullable=True)  # e.g. "Tomato___Early_blight"
    name = Column(String, nullable=False)
    severity = Column(String)                              # "healthy", "moderate", "severe"
    description = Column(Text)
    symptoms = Column(JSON)                                # Danh sách string
    treatment = Column(JSON)                               # Phác đồ điều trị
    prevention = Column(JSON)                              # Cách phòng ngừa
    affected_area_typical = Column(Integer, default=0)
    image_url = Column(String)
    care_tips = relationship("CareTip", back_populates="related_disease")


class CareTip(Base):
    """Bảng lưu mẹo chăm sóc cây theo ngày/độ ưu tiên."""
    __tablename__ = "care_tips"
    __table_args__ = (
        Index("ix_care_tips_active_priority", "is_active", "priority"),
        Index("ix_care_tips_date_range", "start_date", "end_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    suitable_plants = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, default=list)
    related_disease_id = Column(Integer, ForeignKey("diseases.id", ondelete="SET NULL"), nullable=True)
    priority = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    source_name = Column(String(255), nullable=True)
    source_url = Column(Text, nullable=True)
    source_note = Column(Text, nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    related_disease = relationship("Disease", back_populates="care_tips")

class PasswordResetOTP(Base):
    """Bảng lưu OTP reset mật khẩu (tạm thời, hết hạn sau 10 phút)."""
    __tablename__ = "password_reset_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp_hash = Column(String, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ScanHistory(Base):
    """Bảng lưu lịch sử quét ảnh."""
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="SET NULL"), nullable=True)
    disease_key = Column(String, ForeignKey("diseases.disease_key", ondelete="SET NULL"), nullable=True)
    image_url = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    predicted_stage = Column(String, nullable=False, default="unknown")
    forecast_stage_7d = Column(String, nullable=False, default="unknown")
    affected_area_snapshot = Column(Float, nullable=True)
    scan_date = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="scans")
    plant = relationship("Plant", back_populates="scans")
    disease = relationship("Disease")


class CareTask(Base):
    """Việc chăm sóc cây cần thực hiện."""
    __tablename__ = "care_tasks"
    __table_args__ = (
        Index("ix_care_tasks_user_due_status", "user_id", "due_at", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    task_type = Column(String(50), nullable=False, default="general")
    due_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), nullable=False, default="pending")
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="care_tasks")
    plant = relationship("Plant", backref="care_tasks")


class CareLog(Base):
    """Nhật ký các hoạt động chăm sóc cây đã thực hiện."""
    __tablename__ = "care_logs"
    __table_args__ = (
        Index("ix_care_logs_user_performed", "user_id", "performed_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    log_type = Column(String(50), nullable=False, default="general")
    performed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="care_logs")
    plant = relationship("Plant", backref="care_logs")


# ══════════════════════════════════════════════════════════════
# Subscription & Partners Models
# ══════════════════════════════════════════════════════════════


class Subscription(Base):
    """Gói đăng ký của người dùng (free / personal / pro)."""
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    tier = Column(String(20), nullable=False, default="free")  # free | personal | pro
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # NULL = free tier (no expiry)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="subscription", uselist=False)


class ScanQuota(Base):
    """Quota quét bệnh hàng ngày của người dùng."""
    __tablename__ = "scan_quotas"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    remaining_scans = Column(Integer, nullable=False, default=5)
    last_reset_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="scan_quota", uselist=False)


class ScanConsumption(Base):
    """Audit log: mỗi lần user tiêu 1 lượt quét."""
    __tablename__ = "scan_consumptions"
    __table_args__ = (
        Index("ix_scan_consumptions_user_date", "user_id", "consumed_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    scan_id = Column(Integer, ForeignKey("scan_history.id", ondelete="SET NULL"), nullable=True)
    consumed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserPaymentTransaction(Base):
    """Giao dịch VNPAY cho gói quét AI của người dùng."""
    __tablename__ = "user_payment_transactions"
    __table_args__ = (
        Index("ix_user_payment_transactions_user_status", "user_id", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider = Column(String(20), nullable=False, default="vnpay")
    txn_ref = Column(String(100), unique=True, nullable=False, index=True)
    plan_key = Column(String(40), nullable=False)
    tier = Column(String(20), nullable=False)
    amount_vnd = Column(Integer, nullable=False)
    duration_days = Column(Integer, nullable=False)
    daily_scan_limit = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending | success | failed | invalid
    payment_url = Column(Text, nullable=True)
    vnp_transaction_no = Column(String(100), nullable=True)
    provider_response_code = Column(String(20), nullable=True)
    provider_transaction_status = Column(String(20), nullable=True)
    raw_payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    paid_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", backref="user_payment_transactions")


class Partner(Base):
    """Đối tác phân phối phân bón / thuốc BVTV."""
    __tablename__ = "partners"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=True, index=True)
    company_name = Column(String(255), nullable=False)
    store_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    address = Column(String(500), nullable=True)
    logo_url = Column(String(500), nullable=True)
    cover_url = Column(String(500), nullable=True)
    contact_email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=False)
    business_license = Column(String(100), nullable=False)
    business_license_file_url = Column(String(500), nullable=True)
    representative_name = Column(String(255), nullable=True)
    representative_role = Column(String(100), nullable=True)
    service_area = Column(String(255), nullable=True)
    main_products = Column(Text, nullable=True)
    advertising_commitment_accepted = Column(Boolean, nullable=False, default=False)
    advertising_commitment_at = Column(DateTime(timezone=True), nullable=True)
    product_categories = Column(JSON, nullable=False, default=list)
    website_url = Column(String(500), nullable=True)
    contact_url = Column(String(500), nullable=True)
    status = Column(String(20), nullable=False, default="pending_review")  # pending_review | active | suspended | rejected
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", backref="partner_profile", uselist=False)
    products = relationship("PartnerProduct", back_populates="partner", cascade="all, delete-orphan")
    memberships = relationship("PartnerMembership", back_populates="partner", cascade="all, delete-orphan")
    payment_transactions = relationship("PaymentTransaction", back_populates="partner", cascade="all, delete-orphan")


class PartnerMembership(Base):
    """Gói trả phí mở quyền hiển thị cửa hàng/sản phẩm cho đại lý."""
    __tablename__ = "partner_memberships"
    __table_args__ = (
        Index("ix_partner_memberships_partner_expires", "partner_id", "expires_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False)
    price_vnd = Column(Integer, nullable=False, default=99000)
    duration_days = Column(Integer, nullable=False, default=30)
    max_active_products = Column(Integer, nullable=False, default=20)
    status = Column(String(20), nullable=False, default="active")  # active | expired | cancelled
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    source_transaction_id = Column(Integer, ForeignKey("payment_transactions.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    partner = relationship("Partner", back_populates="memberships")


class PaymentTransaction(Base):
    """Giao dịch thanh toán VNPAY để mở gói đại lý."""
    __tablename__ = "payment_transactions"
    __table_args__ = (
        Index("ix_payment_transactions_partner_status", "partner_id", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String(20), nullable=False, default="vnpay")
    txn_ref = Column(String(100), unique=True, nullable=False, index=True)
    amount_vnd = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="pending")  # pending | success | failed | invalid
    payment_url = Column(Text, nullable=True)
    vnp_transaction_no = Column(String(100), nullable=True)
    provider_response_code = Column(String(20), nullable=True)
    provider_transaction_status = Column(String(20), nullable=True)
    raw_payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    paid_at = Column(DateTime(timezone=True), nullable=True)

    partner = relationship("Partner", back_populates="payment_transactions")


class PartnerProduct(Base):
    """Sản phẩm quảng cáo của đối tác (phân bón, thuốc BVTV)."""
    __tablename__ = "partner_products"
    __table_args__ = (
        Index("ix_partner_products_partner_active", "partner_id", "is_active"),
    )

    id = Column(Integer, primary_key=True, index=True)
    partner_id = Column(Integer, ForeignKey("partners.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    price_range = Column(String(100), nullable=True)  # e.g. "50,000 - 120,000 VND"
    target_diseases = Column(JSON, nullable=False, default=list)  # list of disease_key strings
    target_categories = Column(JSON, nullable=False, default=list)  # plant category strings
    product_url = Column(String(500), nullable=True)  # external link
    is_active = Column(Boolean, nullable=False, default=True)
    moderation_status = Column(String(20), nullable=False, default="pending_review")  # pending_review | approved | rejected
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    partner = relationship("Partner", back_populates="products")
    impressions = relationship("ProductImpression", back_populates="product", cascade="all, delete-orphan")


class ProductImpression(Base):
    """Ghi nhận mỗi lần sản phẩm đối tác được hiển thị cho user."""
    __tablename__ = "product_impressions"
    __table_args__ = (
        Index("ix_impressions_product_date", "partner_product_id", "impressed_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    partner_product_id = Column(Integer, ForeignKey("partner_products.id", ondelete="CASCADE"), nullable=False)
    scan_id = Column(Integer, ForeignKey("scan_history.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    impressed_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    clicked = Column(Boolean, nullable=False, default=False)

    product = relationship("PartnerProduct", back_populates="impressions")
