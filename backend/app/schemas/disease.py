"""
Pydantic Schemas - Định nghĩa cấu trúc dữ liệu Request/Response cho Disease.
Các schema này map 1:1 với kiểu `Disease` ở Frontend.
"""
from pydantic import BaseModel
from typing import Literal

DiseaseStage = Literal["healthy", "early", "middle", "late", "unknown"]

class PredictionItem(BaseModel):
    """Một kết quả dự đoán từ mô hình AI."""
    disease_key: str
    confidence: float

class DiseaseDetail(BaseModel):
    """Chi tiết về bệnh lý."""
    id: str
    name: str
    severity: str
    confidence: float
    description: str
    symptoms: list[str]
    treatment: list[str]
    treatment_by_stage: dict[str, list[str]]
    general_care: list[str]
    safety_notice: str
    prevention: list[str]
    affected_area: int
    image: str

class DiagnosisResponse(BaseModel):
    """Kết quả dự đoán trả về cho user"""
    success: bool
    low_confidence: bool
    message: str
    predicted_stage: DiseaseStage
    forecast_stage_7d: DiseaseStage
    forecast_confidence: float
    treatment_plan: list[str]
    safety_notice: str
    top_prediction: DiseaseDetail | None
    alternatives: list[DiseaseDetail]

class HealthCheckResponse(BaseModel):
    status: str
    version: str
    message: str


class DiseaseCatalogItem(BaseModel):
    id: str
    name: str
    severity: str
    description: str
    affected_area: int
    image: str
    plant: str


class DiseaseCatalogResponse(BaseModel):
    success: bool
    message: str
    total: int
    data: list[DiseaseCatalogItem]


class SingleDiseaseResponse(BaseModel):
    success: bool
    message: str
    data: DiseaseDetail
