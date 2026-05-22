"""
Admin authorization helpers.
"""
from fastapi import Depends, HTTPException, status

from app.config import ADMIN_EMAILS
from app.dependencies.auth import get_current_user
from app.models.domain import User


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Chỉ cho phép email nằm trong ADMIN_EMAILS truy cập endpoint admin."""
    email = (current_user.email or "").strip().lower()
    if not ADMIN_EMAILS or email not in ADMIN_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản không có quyền quản trị.",
        )
    return current_user
