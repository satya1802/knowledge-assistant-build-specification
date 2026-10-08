"""Admin user administration: list, create and update accounts.

Every endpoint here requires `app.services.authz.require_admin` -- a signed-in
employee gets 403 with no change made (AC-022). Password hashing and the
email-normalization helper are reused from `app.routers.auth` rather than
duplicated (constraint).
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.database import get_db  # noqa: F401 -- re-exported for parity with sibling routers
from app.models import LoginLockout, User
from app.routers.auth import DbSession, _hash_password, _normalize_email
from app.schemas import UserCreateRequest, UserOut, UserUpdateRequest
from app.services.authz import AdminUser

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(admin: AdminUser, db: DbSession) -> list[User]:
    return list(db.scalars(select(User).order_by(User.email)).all())


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreateRequest, admin: AdminUser, db: DbSession) -> User:
    email = _normalize_email(payload.email)
    if not email or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email and password are required"
        )

    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account already exists for this email",
        )

    user = User(
        email=email,
        password_hash=_hash_password(payload.password),
        role=payload.role,
        is_enabled=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    admin: AdminUser,
    db: DbSession,
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.role is not None:
        user.role = payload.role

    if payload.is_enabled is not None:
        user.is_enabled = payload.is_enabled

    if payload.password is not None:
        user.password_hash = _hash_password(payload.password)
        lockout = db.get(LoginLockout, user.email)
        if lockout is not None:
            db.delete(lockout)

    db.add(user)
    db.commit()
    db.refresh(user)
    return user
