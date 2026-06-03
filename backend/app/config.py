"""
Cấu hình chung cho Backend LeafScan AI.
Tập trung tất cả hằng số và cấu hình tại đây để dễ quản lý.
"""
import os
from pathlib import Path

from dotenv import load_dotenv


ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_PATH)


def _env_or_default(key: str, default: str) -> str:
    raw = os.getenv(key)
    if raw is None:
        return default
    cleaned = raw.strip()
    return cleaned or default


def _parse_cors_origins(raw_value: str | None) -> list[str]:
    """
    Parse CORS_ORIGINS từ env dạng:
    - "*" hoặc rỗng -> ["*"]
    - "https://a.com,https://b.com" -> ["https://a.com", "https://b.com"]
    """
    if raw_value is None:
        return ["*"]

    cleaned = raw_value.strip()
    if not cleaned or cleaned == "*":
        return ["*"]

    origins = [item.strip() for item in cleaned.split(",") if item.strip()]
    return origins or ["*"]


def _parse_csv(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    return [item.strip() for item in raw_value.split(",") if item.strip()]

# ──────────────────────────────────────────────
# AI Model Configuration
# ──────────────────────────────────────────────

# Ngưỡng tin cậy tối thiểu (Tầng 1 - Bảo vệ niềm tin)
# Nếu bệnh có confidence < ngưỡng này, app sẽ cảnh báo "ảnh không rõ"
CONFIDENCE_THRESHOLD: float = 70.0
MIN_DIAGNOSIS_CONFIDENCE: float = float(os.getenv("MIN_DIAGNOSIS_CONFIDENCE", "70.0"))
MIN_HEALTHY_CLASS_CONFIDENCE: float = float(os.getenv("MIN_HEALTHY_CLASS_CONFIDENCE", "80.0"))
MIN_TOP1_MARGIN: float = float(os.getenv("MIN_TOP1_MARGIN", "8.0"))

# Số lượng kết quả trả về (Top K) cho chiến lược Top 3
TOP_K: int = 3

# Đường dẫn model thật (ONNX/TFLite). Nếu không có file, hệ thống dùng fallback heuristic.
_DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "models", "efficientnetv2s_plantvillage.onnx"
)
MODEL_PATH: str = _env_or_default("MODEL_PATH", _DEFAULT_MODEL_PATH)

# ──────────────────────────────────────────────
# Server Configuration
# ──────────────────────────────────────────────

# Cho phép React Native (Expo) kết nối tới Backend
CORS_ORIGINS: list[str] = _parse_cors_origins(os.getenv("CORS_ORIGINS"))
PUBLIC_BASE_URL: str = _env_or_default("PUBLIC_BASE_URL", "http://localhost:8000").rstrip("/")
ADMIN_EMAILS: list[str] = [email.lower() for email in _parse_csv(os.getenv("ADMIN_EMAILS"))]

# ──────────────────────────────────────────────
# File Upload Configuration
# ──────────────────────────────────────────────

# Thư mục lưu ảnh upload tạm thời
UPLOAD_DIR: str = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Kích thước ảnh tối đa (10MB)
MAX_FILE_SIZE: int = 10 * 1024 * 1024

# Định dạng ảnh được chấp nhận
ALLOWED_EXTENSIONS: set[str] = {"jpg", "jpeg", "png", "webp"}

# ──────────────────────────────────────────────
# Partner / Payment Configuration
# ──────────────────────────────────────────────

PARTNER_MONTHLY_PLAN_PRICE_VND: int = int(
    os.getenv("PARTNER_MONTHLY_PLAN_PRICE_VND", os.getenv("PARTNER_PLAN_PRICE_VND", "99000"))
)
PARTNER_MONTHLY_PLAN_DURATION_DAYS: int = int(
    os.getenv("PARTNER_MONTHLY_PLAN_DURATION_DAYS", os.getenv("PARTNER_PLAN_DURATION_DAYS", "30"))
)
PARTNER_YEARLY_PLAN_PRICE_VND: int = int(os.getenv("PARTNER_YEARLY_PLAN_PRICE_VND", "990000"))
PARTNER_YEARLY_PLAN_DURATION_DAYS: int = int(os.getenv("PARTNER_YEARLY_PLAN_DURATION_DAYS", "365"))
PARTNER_PLAN_MAX_ACTIVE_PRODUCTS: int = int(os.getenv("PARTNER_PLAN_MAX_ACTIVE_PRODUCTS", "20"))

# Backward-compatible aliases for code/tests that still refer to the original
# single-plan constants. They represent the monthly plan.
PARTNER_PLAN_PRICE_VND: int = PARTNER_MONTHLY_PLAN_PRICE_VND
PARTNER_PLAN_DURATION_DAYS: int = PARTNER_MONTHLY_PLAN_DURATION_DAYS

# ──────────────────────────────────────────────
# User Subscription / Scan Quota Configuration
# ──────────────────────────────────────────────

FREE_DAILY_SCAN_LIMIT: int = int(os.getenv("FREE_DAILY_SCAN_LIMIT", "5"))
PERSONAL_DAILY_SCAN_LIMIT: int = int(os.getenv("PERSONAL_DAILY_SCAN_LIMIT", "30"))
PRO_DAILY_SCAN_LIMIT: int = int(os.getenv("PRO_DAILY_SCAN_LIMIT", "100"))

PERSONAL_MONTHLY_PRICE_VND: int = int(os.getenv("PERSONAL_MONTHLY_PRICE_VND", "39000"))
PERSONAL_YEARLY_PRICE_VND: int = int(os.getenv("PERSONAL_YEARLY_PRICE_VND", "390000"))
PRO_MONTHLY_PRICE_VND: int = int(os.getenv("PRO_MONTHLY_PRICE_VND", "99000"))
PRO_YEARLY_PRICE_VND: int = int(os.getenv("PRO_YEARLY_PRICE_VND", "990000"))

USER_MONTHLY_PLAN_DURATION_DAYS: int = int(os.getenv("USER_MONTHLY_PLAN_DURATION_DAYS", "30"))
USER_YEARLY_PLAN_DURATION_DAYS: int = int(os.getenv("USER_YEARLY_PLAN_DURATION_DAYS", "365"))

VNPAY_TMN_CODE: str = os.getenv("VNPAY_TMN_CODE", "").strip()
VNPAY_HASH_SECRET: str = os.getenv("VNPAY_HASH_SECRET", "").strip()
VNPAY_PAYMENT_URL: str = _env_or_default(
    "VNPAY_PAYMENT_URL",
    "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
)
VNPAY_RETURN_URL: str = os.getenv("VNPAY_RETURN_URL", "").strip()
VNPAY_IPN_URL: str = os.getenv("VNPAY_IPN_URL", "").strip()

# ──────────────────────────────────────────────
# Push Notifications
# ──────────────────────────────────────────────

EXPO_PUSH_URL: str = _env_or_default("EXPO_PUSH_URL", "https://exp.host/--/api/v2/push/send")
NOTIFICATION_SCHEDULER_ENABLED: bool = os.getenv("NOTIFICATION_SCHEDULER_ENABLED", "true").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
NOTIFICATION_SCHEDULER_INTERVAL_SECONDS: int = int(os.getenv("NOTIFICATION_SCHEDULER_INTERVAL_SECONDS", "300"))
NOTIFICATION_SCHEDULER_INITIAL_DELAY_SECONDS: int = int(os.getenv("NOTIFICATION_SCHEDULER_INITIAL_DELAY_SECONDS", "5"))
NOTIFICATION_TASK_LOOKAHEAD_MINUTES: int = int(os.getenv("NOTIFICATION_TASK_LOOKAHEAD_MINUTES", "30"))
NOTIFICATION_TASK_PAST_DUE_GRACE_MINUTES: int = int(os.getenv("NOTIFICATION_TASK_PAST_DUE_GRACE_MINUTES", "15"))

# ──────────────────────────────────────────────
# Home Dashboard / Weather Configuration
# ──────────────────────────────────────────────

HOME_WEATHER_LAT: float = float(os.getenv("HOME_WEATHER_LAT", "21.0278"))
HOME_WEATHER_LON: float = float(os.getenv("HOME_WEATHER_LON", "105.8342"))
HOME_WEATHER_LOCATION: str = _env_or_default("HOME_WEATHER_LOCATION", "Hà Nội")
HOME_WEATHER_CACHE_TTL_SECONDS: int = int(os.getenv("HOME_WEATHER_CACHE_TTL_SECONDS", "900"))

# ──────────────────────────────────────────────
# Leaf Image Validation
# ──────────────────────────────────────────────

# Tối thiểu 3% pixel nằm trong dải màu lá hợp lệ.
LEAF_MIN_GREEN_RATIO: float = float(os.getenv("LEAF_MIN_GREEN_RATIO", "0.05"))
# Tỉ lệ xanh tối thiểu ở vùng trung tâm (nơi người dùng cần đưa lá vào).
LEAF_MIN_CENTER_GREEN_RATIO: float = float(os.getenv("LEAF_MIN_CENTER_GREEN_RATIO", "0.04"))
# Độ sáng trung bình (kênh V của HSV, thang 0-255).
LEAF_MIN_BRIGHTNESS: float = float(os.getenv("LEAF_MIN_BRIGHTNESS", "55.0"))
# Percentile 10% của độ sáng (V channel) để bắt case nền tối lớn.
LEAF_MIN_BRIGHTNESS_P10: float = float(os.getenv("LEAF_MIN_BRIGHTNESS_P10", "35.0"))
# Tỉ lệ pixel tối tối đa cho phép (V < 50).
LEAF_MAX_DARK_PIXEL_RATIO: float = float(os.getenv("LEAF_MAX_DARK_PIXEL_RATIO", "0.60"))
# Độ nét dựa trên variance của Laplacian.
LEAF_MIN_BLUR_SCORE: float = float(os.getenv("LEAF_MIN_BLUR_SCORE", "90.0"))
# Vùng xanh lớn nhất phải chiếm tối thiểu tỉ lệ ảnh.
LEAF_MIN_LARGEST_GREEN_COMPONENT_RATIO: float = float(
    os.getenv("LEAF_MIN_LARGEST_GREEN_COMPONENT_RATIO", "0.01")
)
# Vùng xanh lớn nhất phải đủ "tập trung" so với tổng pixel xanh.
LEAF_MIN_GREEN_COMPONENT_DENSITY: float = float(
    os.getenv("LEAF_MIN_GREEN_COMPONENT_DENSITY", "0.25")
)

# ──────────────────────────────────────────────
# Stage / Forecast Configuration
# ──────────────────────────────────────────────

# Rule-based thresholds cho dự đoán giai đoạn bệnh từ affected_area.
STAGE_EARLY_MAX: float = 15.0
STAGE_MIDDLE_MAX: float = 40.0

# ──────────────────────────────────────────────
# Plant Scope Validation (OOD guard)
# ──────────────────────────────────────────────

# Top-1 phải đủ cao để tránh ép nhãn với cây ngoài dataset.
PLANT_SCOPE_MIN_TOP1_CONFIDENCE: float = float(os.getenv("PLANT_SCOPE_MIN_TOP1_CONFIDENCE", "0.75"))
# Margin giữa top-1 và top-2.
PLANT_SCOPE_MIN_MARGIN: float = float(os.getenv("PLANT_SCOPE_MIN_MARGIN", "0.20"))
# Trong top-5, số class cùng plant với top-1 phải đủ nhiều.
PLANT_SCOPE_MIN_TOP5_SAME_PLANT_COUNT: int = int(
    os.getenv("PLANT_SCOPE_MIN_TOP5_SAME_PLANT_COUNT", "2")
)
