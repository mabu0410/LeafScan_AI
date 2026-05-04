from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.dependencies.rate_limit import check_rate_limit
from app.database import get_db
from app.models.domain import User
from app.schemas.auth import UserCreate, UserLogin, UserResponse, AuthResponse
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/register", response_model=AuthResponse)
def register(
    request: Request,
    user: UserCreate,
    db: Session = Depends(get_db),
):
    """Đăng ký tài khoản người dùng mới."""
    check_rate_limit(
        bucket_key=f"auth:register:{_client_ip(request)}",
        limit=8,
        window_seconds=60,
    )

    # Kiểm tra email đã được sử dụng chưa
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email này đã được sử dụng.")
    
    # Tạo user mới
    hashed_password = get_password_hash(user.password)
    new_user = User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Tạo access token tự động rạo JWT trả về
    access_token = create_access_token(data={"sub": str(new_user.id)})
    
    return AuthResponse(
        success=True,
        message="Đăng ký thành công",
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(new_user)
        }
    )

@router.post("/login", response_model=AuthResponse)
def login(
    request: Request,
    user_credentials: UserLogin,
    db: Session = Depends(get_db),
):
    """Đăng nhập và lấy JWT Access Token."""
    check_rate_limit(
        bucket_key=f"auth:login:{_client_ip(request)}",
        limit=12,
        window_seconds=60,
    )

    user = db.query(User).filter(User.email == user_credentials.email).first()
    
    if not user or not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
        )
        
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return AuthResponse(
        success=True,
        message="Đăng nhập thành công",
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user)
        }
    )

@router.get("/me", response_model=AuthResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Lấy thông tin tài khoản đang đăng nhập."""
    return AuthResponse(
        success=True,
        message="Thành công",
        data={
            "access_token": "", # No new token
            "token_type": "bearer",
            "user": UserResponse.model_validate(current_user)
        }
    )
