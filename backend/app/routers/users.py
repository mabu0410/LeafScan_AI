from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.domain import User
from app.schemas.auth import UserResponse
from app.schemas.user import UserProfileResponse, UserProfileUpdate

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


def _profile_response(user: User, message: str = "Thành công") -> UserProfileResponse:
    return UserProfileResponse(
        success=True,
        message=message,
        data={"user": UserResponse.model_validate(user)},
    )


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return _profile_response(current_user)


@router.put("/me", response_model=UserProfileResponse)
def update_my_profile(
    payload: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    email = str(payload.email).strip()
    existing_user = (
        db.query(User)
        .filter(User.email == email, User.id != current_user.id)
        .first()
    )
    if existing_user:
        raise HTTPException(status_code=400, detail="Email này đã được sử dụng.")

    current_user.name = payload.name.strip()
    current_user.email = email
    current_user.phone = payload.phone
    current_user.avatar = payload.avatar
    db.commit()
    db.refresh(current_user)

    return _profile_response(current_user, message="Cập nhật hồ sơ thành công.")
