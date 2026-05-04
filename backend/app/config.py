"""
Cấu hình chung cho Backend LeafScan AI.
Tập trung tất cả hằng số và cấu hình tại đây để dễ quản lý.
"""
import os


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

# ──────────────────────────────────────────────
# AI Model Configuration
# ──────────────────────────────────────────────

# Ngưỡng tin cậy tối thiểu (Tầng 1 - Bảo vệ niềm tin)
# Nếu bệnh có confidence < ngưỡng này, app sẽ cảnh báo "ảnh không rõ"
CONFIDENCE_THRESHOLD: float = 70.0

# Số lượng kết quả trả về (Top K) cho chiến lược Top 3
TOP_K: int = 3

# Đường dẫn model thật (ONNX/TFLite). Nếu không có file, hệ thống dùng fallback heuristic.
_DEFAULT_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "models", "efficientnetv2s_plantvillage.onnx"
)
MODEL_PATH: str = os.getenv("MODEL_PATH", _DEFAULT_MODEL_PATH)

# Base URL để generate asset URLs trả về mobile app.
API_PUBLIC_BASE_URL: str = os.getenv("API_PUBLIC_BASE_URL", "http://localhost:8000")

# ──────────────────────────────────────────────
# Server Configuration
# ──────────────────────────────────────────────

# Cho phép React Native (Expo) kết nối tới Backend
CORS_ORIGINS: list[str] = _parse_cors_origins(os.getenv("CORS_ORIGINS"))

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
# Stage / Forecast Configuration
# ──────────────────────────────────────────────

# Rule-based thresholds cho dự đoán giai đoạn bệnh từ affected_area.
STAGE_EARLY_MAX: float = 15.0
STAGE_MIDDLE_MAX: float = 40.0
