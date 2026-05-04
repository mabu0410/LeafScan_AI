from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class HomeUser(BaseModel):
    id: int
    name: str
    email: str
    avatar: Optional[str] = None


class HomeStats(BaseModel):
    average_health: Optional[float] = None
    scanned_plants: int
    alerts: int


class HomeTodayTip(BaseModel):
    id: int
    slug: str
    title: str
    summary: str
    content: str
    category: str
    suitable_plants: list[str]
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    source_note: Optional[str] = None


class HomeAttentionPlant(BaseModel):
    id: int
    name: str
    latin_name: Optional[str] = None
    status: str
    health_score: float
    image_url: Optional[str] = None
    location: Optional[str] = None
    last_scanned: Optional[str] = None


class HomeRecentScan(BaseModel):
    id: int
    plant_name: str
    result_name: str
    confidence: float
    status: str
    scanned_at: datetime
    image_url: Optional[str] = None


class HomeSummaryData(BaseModel):
    user: HomeUser
    stats: HomeStats
    today_tip: Optional[HomeTodayTip] = None
    attention_plants: list[HomeAttentionPlant]
    recent_scans: list[HomeRecentScan]


class HomeSummaryResponse(BaseModel):
    success: bool
    message: str
    data: HomeSummaryData
