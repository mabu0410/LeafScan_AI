import logging
import os
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.dependencies.rate_limit import check_rate_limit
from app.database import get_db
from app.models.domain import PasswordResetOTP, User
from app.schemas.auth import (
    AuthResponse,
    ChangePasswordRequest,
    DeleteAccountRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    SimpleResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.dependencies.auth import get_current_user
from app.services.email_service import is_email_configured, send_otp_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _normalize_user_role(raw_role: str | None) -> str:
    role = (raw_role or "farmer").strip().lower()
    if role in {"dealer", "partner", "distributor"}:
        return "partner"
    if role in {"farmer", "user"}:
        return "farmer"
    raise HTTPException(status_code=400, detail="Role tài khoản không hợp lệ.")


def _ensure_user_can_login(user: User) -> None:
    if getattr(user, "status", "active") == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị tạm khóa.",
        )


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
    
    phone = user.phone.strip() if user.phone else None
    role = _normalize_user_role(user.role)

    # Tạo user mới
    hashed_password = get_password_hash(user.password)
    new_user = User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password,
        phone=phone,
        role=role,
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

    identifier = user_credentials.email.strip()
    user = db.query(User).filter(User.email == identifier).first()
    if not user:
        user = db.query(User).filter(User.phone == identifier).first()
    
    if not user or not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không chính xác",
        )
    _ensure_user_can_login(user)
        
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


# ──────────────────────────────────────────────
# Change Password
# ──────────────────────────────────────────────

@router.post("/change-password", response_model=SimpleResponse)
def change_password(
    request: Request,
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Đổi mật khẩu cho user đang đăng nhập."""
    check_rate_limit(
        bucket_key=f"auth:change_password:{current_user.id}",
        limit=5,
        window_seconds=60,
    )

    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu hiện tại không chính xác.",
        )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có ít nhất 8 ký tự.",
        )

    current_user.password_hash = get_password_hash(payload.new_password)
    db.commit()

    return SimpleResponse(success=True, message="Đổi mật khẩu thành công.")


# ──────────────────────────────────────────────
# Forgot Password (generate OTP)
# ──────────────────────────────────────────────

OTP_EXPIRE_MINUTES = 10


def _generate_otp() -> str:
    """Tạo OTP 6 chữ số."""
    return f"{secrets.randbelow(1000000):06d}"


@router.post("/forgot-password", response_model=SimpleResponse)
def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Gửi OTP reset mật khẩu.
    Trong phiên bản hiện tại, OTP được trả về trong response (dev mode).
    Production nên gửi qua email thật.
    """
    check_rate_limit(
        bucket_key=f"auth:forgot_password:{_client_ip(request)}",
        limit=5,
        window_seconds=60,
    )

    user = db.query(User).filter(User.email == payload.email).first()

    # Luôn trả success để không leak thông tin email có tồn tại hay không
    if not user:
        logger.info("forgot_password: email not found %s", payload.email)
        return SimpleResponse(
            success=True,
            message="Nếu email tồn tại, mã OTP đã được gửi. Vui lòng kiểm tra hộp thư.",
        )

    # Vô hiệu hóa OTP cũ chưa dùng
    db.query(PasswordResetOTP).filter(
        PasswordResetOTP.email == payload.email,
        PasswordResetOTP.used == False,  # noqa: E712
    ).update({"used": True})

    otp_plain = _generate_otp()
    otp_record = PasswordResetOTP(
        email=payload.email,
        otp_hash=get_password_hash(otp_plain),
        expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES),
        used=False,
    )
    db.add(otp_record)
    db.commit()

    # Gửi OTP qua email. Nếu SMTP chưa cấu hình, fallback log ra console.
    email_sent = send_otp_email(to_email=payload.email, otp=otp_plain, expire_minutes=OTP_EXPIRE_MINUTES)
    if not email_sent:
        logger.info("OTP for %s: %s (expires in %d min) [SMTP not configured, logged only]", payload.email, otp_plain, OTP_EXPIRE_MINUTES)

    return SimpleResponse(
        success=True,
        message="Nếu email tồn tại, mã OTP đã được gửi. Vui lòng kiểm tra hộp thư.",
    )


# ──────────────────────────────────────────────
# Reset Password (verify OTP + set new password)
# ──────────────────────────────────────────────

@router.post("/reset-password", response_model=SimpleResponse)
def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """Xác nhận OTP và đặt mật khẩu mới."""
    check_rate_limit(
        bucket_key=f"auth:reset_password:{_client_ip(request)}",
        limit=8,
        window_seconds=60,
    )

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có ít nhất 8 ký tự.",
        )

    # Tìm OTP chưa dùng, chưa hết hạn
    otp_record = (
        db.query(PasswordResetOTP)
        .filter(
            PasswordResetOTP.email == payload.email,
            PasswordResetOTP.used == False,  # noqa: E712
            PasswordResetOTP.expires_at > datetime.utcnow(),
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )

    if not otp_record or not verify_password(payload.otp, otp_record.otp_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã OTP không hợp lệ hoặc đã hết hạn.",
        )

    # Đánh dấu OTP đã dùng
    otp_record.used = True

    # Cập nhật mật khẩu
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không tìm thấy tài khoản.",
        )

    user.password_hash = get_password_hash(payload.new_password)
    db.commit()

    return SimpleResponse(success=True, message="Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.")


# ──────────────────────────────────────────────
# Delete Account
# ──────────────────────────────────────────────

@router.delete("/account", response_model=SimpleResponse)
def delete_account(
    request: Request,
    payload: DeleteAccountRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xóa tài khoản vĩnh viễn. Yêu cầu xác nhận mật khẩu."""
    check_rate_limit(
        bucket_key=f"auth:delete_account:{current_user.id}",
        limit=3,
        window_seconds=60,
    )

    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu xác nhận không chính xác.",
        )

    # Cascade delete sẽ xóa plants, scan_history theo FK ondelete="CASCADE"
    db.delete(current_user)
    db.commit()

    return SimpleResponse(success=True, message="Tài khoản đã được xóa vĩnh viễn.")


# ──────────────────────────────────────────────
# Google OAuth (Link / Unlink / Login with Google)
# ──────────────────────────────────────────────

GOOGLE_CLIENT_IDS = [
    item.strip()
    for item in ",".join(
        [
            os.getenv("GOOGLE_CLIENT_ID", ""),
            os.getenv("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID", ""),
            os.getenv("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID", ""),
            os.getenv("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID", ""),
        ]
    ).split(",")
    if item.strip()
]


def _verify_google_id_token(id_token: str) -> dict | None:
    """Verify Google ID token và trả về payload (email, sub, name, picture)."""
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        audience = GOOGLE_CLIENT_IDS or None  # None = skip audience check (dev mode)
        payload = google_id_token.verify_oauth2_token(id_token, google_requests.Request(), audience)
        return payload
    except Exception as exc:
        logger.warning("Google ID token verification failed: %s", exc)
        return None


class GoogleAuthRequest(BaseModel):
    id_token: str


class GoogleLinkRequest(BaseModel):
    id_token: str


@router.post("/google/login", response_model=AuthResponse)
def google_login(
    request: Request,
    payload: GoogleAuthRequest,
    db: Session = Depends(get_db),
):
    """Đăng nhập bằng Google. Tạo tài khoản mới nếu chưa có."""
    check_rate_limit(
        bucket_key=f"auth:google_login:{_client_ip(request)}",
        limit=10,
        window_seconds=60,
    )

    google_payload = _verify_google_id_token(payload.id_token)
    if not google_payload:
        raise HTTPException(status_code=401, detail="Google token không hợp lệ.")

    google_sub = google_payload.get("sub")
    google_email = google_payload.get("email")
    google_name = google_payload.get("name", "")
    google_picture = google_payload.get("picture")

    if not google_sub or not google_email:
        raise HTTPException(status_code=400, detail="Token thiếu thông tin email.")

    # Tìm user theo google_id
    user = db.query(User).filter(User.google_id == google_sub).first()

    if not user:
        # Tìm theo email
        user = db.query(User).filter(User.email == google_email).first()
        if user:
            # Link Google vào tài khoản có sẵn
            user.google_id = google_sub
            if google_picture and not user.avatar:
                user.avatar = google_picture
            db.commit()
        else:
            # Tạo tài khoản mới
            user = User(
                name=google_name or google_email.split("@")[0],
                email=google_email,
                password_hash=get_password_hash(secrets.token_urlsafe(32)),  # random password
                google_id=google_sub,
                avatar=google_picture,
                role="farmer",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    _ensure_user_can_login(user)
    access_token = create_access_token(data={"sub": str(user.id)})

    return AuthResponse(
        success=True,
        message="Đăng nhập Google thành công",
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user),
        },
    )


@router.post("/google/link", response_model=SimpleResponse)
def google_link(
    request: Request,
    payload: GoogleLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Liên kết tài khoản hiện tại với Google."""
    google_payload = _verify_google_id_token(payload.id_token)
    if not google_payload:
        raise HTTPException(status_code=401, detail="Google token không hợp lệ.")

    google_sub = google_payload.get("sub")
    if not google_sub:
        raise HTTPException(status_code=400, detail="Token thiếu thông tin.")

    # Kiểm tra google_id đã được link bởi user khác chưa
    existing = db.query(User).filter(User.google_id == google_sub, User.id != current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Tài khoản Google này đã được liên kết với một tài khoản khác.",
        )

    current_user.google_id = google_sub
    if google_payload.get("picture") and not current_user.avatar:
        current_user.avatar = google_payload["picture"]
    db.commit()

    return SimpleResponse(success=True, message="Liên kết Google thành công.")


@router.post("/google/unlink", response_model=SimpleResponse)
def google_unlink(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Hủy liên kết Google khỏi tài khoản."""
    if not current_user.google_id:
        raise HTTPException(status_code=400, detail="Tài khoản chưa liên kết Google.")

    current_user.google_id = None
    db.commit()

    return SimpleResponse(success=True, message="Đã hủy liên kết Google.")
