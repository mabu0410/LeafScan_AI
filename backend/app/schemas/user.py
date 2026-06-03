from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.auth import UserResponse


class UserProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = Field(default=None, max_length=30)
    avatar: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        clean = value.strip()
        if not clean:
            raise ValueError("name không được bỏ trống")
        return clean

    @field_validator("phone", "avatar", mode="before")
    @classmethod
    def empty_string_to_none(cls, value):
        if isinstance(value, str):
            clean = value.strip()
            return clean or None
        return value


class UserProfileData(BaseModel):
    user: UserResponse


class UserProfileResponse(BaseModel):
    success: bool
    message: str
    data: UserProfileData
