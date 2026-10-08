"""Email/password authentication: login, signup, logout, and the current user.

Sessions are opaque tokens stored in a database table and carried to the
browser in an HTTP-only cookie -- never a JWT, never a client-readable value.
"""

import datetime
import secrets

import bcrypt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.database import get_db
from app.models import Session as SessionModel
from app.models import User
from app.schemas import LoginRequest, MessageResponse, SignupRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

GENERIC_LOGIN_ERROR = "Incorrect email or password"


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # A malformed/empty hash can never verify.
        return False


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="lax",
        path="/",
        max_age=settings.SESSION_TTL_SECONDS,
    )


def _create_session(db: DBSession, user: User) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(
        seconds=settings.SESSION_TTL_SECONDS
    )
    session_row = SessionModel(id=token, user_id=user.id, expires_at=expires_at)
    db.add(session_row)
    db.commit()
    return token


def get_current_user(
    session_id: str | None = Cookie(default=None, alias="session_id"),
    db: DBSession = Depends(get_db),
) -> User:
    """Resolve the session cookie to a user, or 401.

    Reads the cookie by its concrete default name rather than
    `settings.SESSION_COOKIE_NAME` so FastAPI can declare the parameter at
    import time; the name is not expected to change at runtime.
    """
    if session_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    session_row = db.get(SessionModel, session_id)
    if session_row is None or session_row.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user = db.get(User, session_row.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    return user


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, response: Response, db: DBSession = Depends(get_db)) -> User:
    email = _normalize_email(payload.email)
    user = db.scalar(select(User).where(User.email == email))

    # Identical error, identical status, for "no such user", "wrong password"
    # and "disabled account" -- no field-level hint that narrows the guess.
    if user is None or not user.is_enabled or not _verify_password(
        payload.password, user.password_hash
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_LOGIN_ERROR)

    token = _create_session(db, user)
    _set_session_cookie(response, token)
    return user


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, response: Response, db: DBSession = Depends(get_db)) -> User:
    email = _normalize_email(payload.email)
    if not email or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email and password are required"
        )

    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="An account already exists for this email"
        )

    user_count = db.scalar(select(func.count()).select_from(User)) or 0
    role = "admin" if user_count == 0 else "employee"

    user = User(
        email=email,
        password_hash=_hash_password(payload.password),
        role=role,
        is_enabled=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = _create_session(db, user)
    _set_session_cookie(response, token)
    return user


@router.post("/logout", response_model=MessageResponse)
def logout(
    response: Response,
    session_id: str | None = Cookie(default=None, alias="session_id"),
    db: DBSession = Depends(get_db),
) -> MessageResponse:
    if session_id is not None:
        session_row = db.get(SessionModel, session_id)
        if session_row is not None:
            db.delete(session_row)
            db.commit()

    response.delete_cookie(key=settings.SESSION_COOKIE_NAME, path="/")
    return MessageResponse(detail="Logged out")


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
