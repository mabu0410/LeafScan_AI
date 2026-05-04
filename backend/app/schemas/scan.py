from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# ──────────────────────────────────────────────
# Pydantic Schemas cho ScanHistory
# ──────────────────────────────────────────────

class ScanHistoryBase(BaseModel):
    plant_id: Optional[int] = None
    disease_key: Optional[str] = None
    confidence: float
    image_url: str
    predicted_stage: str = "unknown"
    forecast_stage_7d: str = "unknown"
    affected_area_snapshot: Optional[float] = None

class ScanHistoryCreate(ScanHistoryBase):
    pass

class ScanHistoryResponse(ScanHistoryBase):
    id: int
    user_id: int
    scan_date: datetime
    
    # Trường tổng hợp lấy từ bảng Disease và Plant
    plant_name: str = "Cây chưa đặt tên"
    result: str = "Không xác định"
    severity: str = "healthy"
    
    class Config:
        from_attributes = True

class ScanHistoryListResponse(BaseModel):
    success: bool
    data: list[ScanHistoryResponse]
    message: str
