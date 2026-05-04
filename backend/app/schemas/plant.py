from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# ──────────────────────────────────────────────
# Pydantic Schemas cho Plant (Cây trồng trong vườn)
# ──────────────────────────────────────────────

class PlantBase(BaseModel):
    name: str
    latin_name: Optional[str] = None
    category: Optional[str] = "Khác"
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class PlantCreate(PlantBase):
    pass

class PlantUpdate(BaseModel):
    name: Optional[str] = None
    latin_name: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    health_score: Optional[float] = None

class PlantResponse(PlantBase):
    id: int
    user_id: int
    health_score: float
    created_at: datetime
    
    # Các trường tổng hợp (tính toán thêm khi trả về Frontend)
    days_tracked: int = 0
    total_scans: int = 0
    status: str = "healthy"
    last_scanned: str = "Chưa quét lần nào"
    
    class Config:
        from_attributes = True

class PlantListResponse(BaseModel):
    success: bool
    data: list[PlantResponse]
    message: str
    
class SinglePlantResponse(BaseModel):
    success: bool
    data: PlantResponse
    message: str
