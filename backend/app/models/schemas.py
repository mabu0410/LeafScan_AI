"""
Pydantic Schemas - Định nghĩa cấu trúc dữ liệu Request/Response.
Các schema này map 1:1 với kiểu `Disease` ở Frontend (src/types.ts).
"""
from pydantic import BaseModel
from typing import Literal

DiseaseStage = Literal["healthy", "early", "middle", "late", "unknown"]


# ──────────────────────────────────────────────
# AI Prediction (Kết quả thô từ Model)
# ──────────────────────────────────────────────

class PredictionItem(BaseModel):
    """Một kết quả dự đoán từ mô hình AI."""
    disease_key: str          # Key nội bộ (VD: "tomato_early_blight")
    confidence: float         # Độ tin cậy (0 - 100)


# ──────────────────────────────────────────────
# Disease Detail (Thông tin bệnh đầy đủ)
# ──────────────────────────────────────────────

class DiseaseDetail(BaseModel):
    """
    Thông tin chi tiết về một loại bệnh.
    Map 1:1 với interface Disease ở Frontend.
    """
    id: str
    name: str                                              # Tên bệnh (tiếng Việt)
    severity: str                                          # "healthy" | "moderate" | "severe"
    confidence: float                                      # Độ tin cậy (%)
    description: str                                       # Mô tả bệnh
    symptoms: list[str]                                    # Danh sách triệu chứng
    treatment: list[str]                                   # Phác đồ điều trị
    treatment_by_stage: dict[str, list[str]]              # Phác đồ theo giai đoạn
    general_care: list[str]                               # Chăm sóc chung
    safety_notice: str                                     # Cảnh báo an toàn
    prevention: list[str]                                  # Cách phòng ngừa
    affected_area: int                                     # % vùng lá bị ảnh hưởng (ước tính)
    image: str                                             # URL ảnh minh họa


# ──────────────────────────────────────────────
# API Response (Kết quả trả về cho Mobile App)
# ──────────────────────────────────────────────

class DiagnosisResponse(BaseModel):
    """
    Response cuối cùng gửi về cho Mobile App.
    Áp dụng mô hình: Top 3 + Ngưỡng An Toàn.
    """
    success: bool                                          # API có thành công không
    low_confidence: bool                                   # True nếu không bệnh nào vượt ngưỡng
    message: str                                           # Message cho người dùng
    predicted_stage: DiseaseStage
    forecast_stage_7d: DiseaseStage
    forecast_confidence: float
    treatment_plan: list[str]
    safety_notice: str
    top_prediction: DiseaseDetail | None                   # Bệnh có khả năng cao nhất (Top 1)
    alternatives: list[DiseaseDetail]                      # Các khả năng khác (Top 2, 3)


class HealthCheckResponse(BaseModel):
    """Response cho endpoint health check."""
    status: str
    version: str
    message: str
