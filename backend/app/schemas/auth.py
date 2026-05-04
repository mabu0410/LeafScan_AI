from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# ──────────────────────────────────────────────
# Pydantic Schemas cho User và Auth
# ──────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    avatar: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class AuthResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Token] = None
