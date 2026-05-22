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


class HomeWeather(BaseModel):
    location: str
    temperature_c: Optional[float] = None
    humidity_percent: Optional[float] = None
    wind_speed_kmh: Optional[float] = None
    condition: str
    weather_code: Optional[int] = None
    observed_at: Optional[datetime] = None


class HomeGardenSummary(BaseModel):
    attention_plants: int
    last_scan_at: Optional[datetime] = None


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


class HomeRecentActivity(BaseModel):
    id: str
    activity_type: str
    title: str
    subtitle: str
    occurred_at: datetime
    status: Optional[str] = None


class HomeTask(BaseModel):
    id: int
    title: str
    task_type: str
    due_at: Optional[datetime] = None
    status: str
    plant_id: Optional[int] = None
    plant_name: Optional[str] = None


class HomeCareLog(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    log_type: str
    performed_at: datetime
    plant_id: Optional[int] = None
    plant_name: Optional[str] = None


class HomeSummaryData(BaseModel):
    user: HomeUser
    stats: HomeStats
    today_tip: Optional[HomeTodayTip] = None
    weather: HomeWeather
    garden_summary: HomeGardenSummary
    attention_plants: list[HomeAttentionPlant]
    recent_scans: list[HomeRecentScan]
    recent_activities: list[HomeRecentActivity]
    today_tasks: list[HomeTask]
    care_logs: list[HomeCareLog]


class HomeSummaryResponse(BaseModel):
    success: bool
    message: str
    data: HomeSummaryData


class CareTaskCreate(BaseModel):
    title: str
    task_type: str = "general"
    due_at: Optional[datetime] = None
    status: str = "pending"
    plant_id: Optional[int] = None


class CareTaskUpdate(BaseModel):
    title: Optional[str] = None
    task_type: Optional[str] = None
    due_at: Optional[datetime] = None
    status: Optional[str] = None
    plant_id: Optional[int] = None


class CareTaskEnvelope(BaseModel):
    success: bool
    message: str
    data: HomeTask | None = None


class CareTaskListEnvelope(BaseModel):
    success: bool
    message: str
    data: list[HomeTask]


class CareLogCreate(BaseModel):
    title: str
    description: Optional[str] = None
    log_type: str = "general"
    performed_at: Optional[datetime] = None
    plant_id: Optional[int] = None


class CareLogUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    log_type: Optional[str] = None
    performed_at: Optional[datetime] = None
    plant_id: Optional[int] = None


class CareLogEnvelope(BaseModel):
    success: bool
    message: str
    data: HomeCareLog | None = None


class CareLogListEnvelope(BaseModel):
    success: bool
    message: str
    data: list[HomeCareLog]
