"""
Auth and Database Dependencies for FastAPI Routers.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import User
from app.utils.security import SECRET_KEY, ALGORITHM

# OAuth2 scheme: Client gửi token trong Header "Authorization: Bearer <token>"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """
    Dependency dùng để bảo vệ các endpoints yêu cầu đăng nhập.
    Giải mã JWT token, kiểm tra hạn sử dụng và lấy User tương ứng.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Đăng nhập không thành công hoặc phiên đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Giải mã token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
        user_id = str(sub)
    except JWTError:
        raise credentials_exception
        
    # Lấy thông tin User từ Database
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
        
    return user
