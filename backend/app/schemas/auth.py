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
    phone: Optional[str] = None
    role: str = "farmer"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    avatar: Optional[str] = None
    role: str = "farmer"
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


# ──────────────────────────────────────────────
# Change Password
# ──────────────────────────────────────────────

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# ──────────────────────────────────────────────
# Forgot / Reset Password (OTP-based)
# ──────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


# ──────────────────────────────────────────────
# Delete Account
# ──────────────────────────────────────────────

class DeleteAccountRequest(BaseModel):
    password: str


class SimpleResponse(BaseModel):
    success: bool
    message: str
