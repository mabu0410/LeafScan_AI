from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator


SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class CareTipBase(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    summary: str = Field(min_length=10, max_length=500)
    content: str = Field(min_length=20)
    category: str = Field(min_length=2, max_length=100)
    suitable_plants: list[str] = Field(default_factory=list)
    related_disease_id: Optional[int] = None
    priority: int = 0
    is_active: bool = True
    source_name: Optional[str] = Field(default=None, max_length=255)
    source_url: Optional[str] = None
    source_note: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("start_date phải nhỏ hơn hoặc bằng end_date")
        return self


class CareTipCreate(CareTipBase):
    slug: Optional[str] = Field(default=None, min_length=3, max_length=255, pattern=SLUG_PATTERN)


class CareTipUpdate(BaseModel):
    slug: Optional[str] = Field(default=None, min_length=3, max_length=255, pattern=SLUG_PATTERN)
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    summary: Optional[str] = Field(default=None, min_length=10, max_length=500)
    content: Optional[str] = Field(default=None, min_length=20)
    category: Optional[str] = Field(default=None, min_length=2, max_length=100)
    suitable_plants: Optional[list[str]] = None
    related_disease_id: Optional[int] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    source_name: Optional[str] = Field(default=None, max_length=255)
    source_url: Optional[str] = None
    source_note: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    @model_validator(mode="after")
    def validate_date_range(self):
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValueError("start_date phải nhỏ hơn hoặc bằng end_date")
        return self


class CareTipListItem(BaseModel):
    id: int
    slug: str
    title: str
    summary: str
    category: str
    suitable_plants: list[str]
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    source_note: Optional[str] = None

    class Config:
        from_attributes = True


class CareTipDetailItem(CareTipListItem):
    content: str
    related_disease_id: Optional[int] = None
    priority: int = 0
    is_active: bool = True
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CareTipListResponse(BaseModel):
    success: bool
    message: str
    data: list[CareTipListItem]


class CareTipDetailResponse(BaseModel):
    success: bool
    message: str
    data: CareTipDetailItem


class CareTipAdminListResponse(BaseModel):
    success: bool
    message: str
    data: list[CareTipDetailItem]
