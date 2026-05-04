"""
Security Utilities: Password hashing & JWT tokens
"""
import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt

logger = logging.getLogger(__name__)

# Cấu hình CryptContext để băm mật khẩu
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Lấy secret key từ môi trường. Nếu thiếu thì tạo khóa tạm (an toàn hơn khóa hard-coded).
SECRET_KEY = os.getenv("SECRET_KEY", "").strip()
if not SECRET_KEY:
    SECRET_KEY = secrets.token_urlsafe(48)
    logger.warning("SECRET_KEY chưa được cấu hình. Đang dùng khóa tạm thời cho phiên hiện tại.")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # Mặc định 1 ngày

def _prehash_password(password: str) -> str:
    """
    Pre-hash mật khẩu bằng SHA-256 trước khi đưa vào bcrypt.
    Điều này loại bỏ giới hạn 72 bytes của bcrypt mà không cần truncate.
    """
    if not isinstance(password, str):
        raise TypeError("password must be a string")
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    So sánh mật khẩu gốc với mã băm (SHA-256 -> bcrypt).
    Giữ fallback legacy cho hash cũ (bcrypt trực tiếp) để không khóa tài khoản cũ.
    """
    prehashed = _prehash_password(plain_password)
    if pwd_context.verify(prehashed, hashed_password):
        return True

    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        return False

def get_password_hash(password: str) -> str:
    """Tạo mã băm mật khẩu an toàn: SHA-256 trước, sau đó bcrypt."""
    prehashed = _prehash_password(password)
    return pwd_context.hash(prehashed)

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Tạo JSON Web Token (JWT)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
