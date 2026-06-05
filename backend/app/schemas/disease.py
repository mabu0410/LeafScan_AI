"""
Pydantic Schemas - Định nghĩa cấu trúc dữ liệu Request/Response cho Disease.
Các schema này map 1:1 với kiểu `Disease` ở Frontend.
"""
from pydantic import BaseModel, ConfigDict
from typing import Any, Literal

DiseaseStage = Literal["healthy", "early", "middle", "late", "unknown"]
DiagnosisErrorCode = Literal[
    "NO_LEAF_DETECTED",
    "IMAGE_TOO_DARK",
    "IMAGE_TOO_BLURRY",
    "LOW_CONFIDENCE",
    "UNSUPPORTED_PLANT",
    "PLANT_MISMATCH",
]

class PredictionItem(BaseModel):
    """Một kết quả dự đoán từ model."""
    class_index: int
    class_name: str
    disease_key: str
    confidence: float

class PredictionSummary(BaseModel):
    class_index: int
    class_name: str
    disease_key: str
    confidence: float
    top_predictions: list[PredictionItem]

class DiagnosisDiseasePayload(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    id: int | None
    disease_key: str
    model_class_name: str | None = None
    name: str
    severity: str | None = None
    description: str
    symptoms: list[str]
    treatment: list[str]
    prevention: list[str]
    affected_area: int | None = None
    image_url: str | None = None

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
    error_code: DiagnosisErrorCode | None = None
    message: str
    debug: dict[str, Any] | None = None
    scan_id: int | None = None
    scan_image_url: str | None = None
    uploaded_image_url: str | None = None
    prediction: PredictionSummary | None = None
    disease: DiagnosisDiseasePayload | None = None
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
