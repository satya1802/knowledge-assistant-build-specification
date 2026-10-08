"""Email/password authentication: login, signup, logout, and the current user.

Sessions are opaque UUID tokens stored in a database table and carried to the
browser in an HTTP-only cookie -- never a JWT, never a client-readable value.
Failed sign-in attempts are tracked per email, server-side, to lock an email
out after repeated failures (KNOW9BAE95-14-1).
"""

import datetime
import uuid
from typing import Annotated

import bcrypt
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.database import get_db
from app.models import LoginLockout
from app.models import Session as SessionModel
from app.models import User
from app.schemas import LoginRequest, MessageResponse, SignupRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

GENERIC_LOGIN_ERROR = "Incorrect email or password"

# Module-level Annotated aliases: ruff's B008 flags a `Depends(...)` call sitting
# directly in an argument default, so the call is made once here instead and
# referenced via `Annotated`, which FastAPI resolves identically.
DbSession = Annotated[DBSession, Depends(get_db)]
SessionCookie = Annotated[str | None, Cookie(alias="session_id")]


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
    token = uuid.uuid4()
    now = datetime.datetime.utcnow()
    expires_at = now + datetime.timedelta(seconds=settings.SESSION_TTL_SECONDS)
    session_row = SessionModel(
        id=token, user_id=user.id, expires_at=expires_at, last_activity_at=now
    )
    db.add(session_row)
    db.commit()
    return str(token)


def _parse_session_uuid(session_id: str | None) -> uuid.UUID | None:
    """Convert the cookie's string value to the UUID the session id column
    holds (AC-013). A malformed value is treated the same as "no session":
    the caller returns 401, never a 500."""
    if not session_id:
        return None
    try:
        return uuid.UUID(session_id)
    except (ValueError, AttributeError, TypeError):
        return None


def _unauthorized(clear_cookie: bool = True) -> HTTPException:
    """401 for `get_current_user`, with the session cookie cleared in the
    response (AC-011) regardless of which failure mode produced it --
    headers set on HTTPException survive FastAPI's own exception handling,
    unlike mutations made to an injected `Response` before raising."""
    headers: dict[str, str] | None = None
    if clear_cookie:
        probe = Response()
        probe.delete_cookie(key=settings.SESSION_COOKIE_NAME, path="/")
        set_cookie = probe.headers.get("set-cookie")
        if set_cookie:
            headers = {"set-cookie": set_cookie}
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated", headers=headers
    )


def _record_failed_attempt(db: DBSession, email: str, now: datetime.datetime) -> None:
    lockout = db.get(LoginLockout, email)
    if lockout is None:
        lockout = LoginLockout(email=email, failed_count=0, first_failure_at=None, locked_until=None)
        db.add(lockout)

    window_expired = (
        lockout.first_failure_at is None
        or (now - lockout.first_failure_at).total_seconds() > settings.LOGIN_LOCKOUT_WINDOW_SECONDS
    )
    if window_expired:
        lockout.failed_count = 0
        lockout.first_failure_at = now
        lockout.locked_until = None

    lockout.failed_count += 1
    if lockout.failed_count >= settings.LOGIN_LOCKOUT_THRESHOLD:
        lockout.locked_until = now + datetime.timedelta(
            seconds=settings.LOGIN_LOCKOUT_DURATION_SECONDS
        )

    db.commit()


def _clear_lockout(db: DBSession, email: str) -> None:
    lockout = db.get(LoginLockout, email)
    if lockout is not None:
        lockout.failed_count = 0
        lockout.first_failure_at = None
        lockout.locked_until = None
        db.commit()


def get_current_user(
    db: DbSession,
    session_id: SessionCookie = None,
) -> User:
    """Resolve the session cookie to a user, or 401 with the cookie cleared.

    Reads the cookie by its concrete default name rather than
    `settings.SESSION_COOKIE_NAME` so FastAPI can declare the parameter at
    import time; the name is not expected to change at runtime.
    """
    session_uuid = _parse_session_uuid(session_id)
    if session_uuid is None:
        raise _unauthorized(clear_cookie=session_id is not None)

    session_row = db.get(SessionModel, session_uuid)
    now = datetime.datetime.utcnow()
    if session_row is None or session_row.expires_at < now:
        raise _unauthorized()

    idle_cutoff = session_row.last_activity_at + datetime.timedelta(
        seconds=settings.SESSION_IDLE_SECONDS
    )
    if idle_cutoff < now:
        db.delete(session_row)
        db.commit()
        raise _unauthorized()

    user = db.get(User, session_row.user_id)
    if user is None:
        raise _unauthorized()

    session_row.last_activity_at = now
    db.commit()

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/login", response_model=UserOut)
def login(payload: LoginRequest, response: Response, db: DbSession) -> User:
    email = _normalize_email(payload.email)
    now = datetime.datetime.utcnow()

    lockout = db.get(LoginLockout, email)
    if lockout is not None and lockout.locked_until is not None and lockout.locked_until > now:
        # Locked: the same generic error, even with the correct password
        # (AC-005). The password is never checked while locked.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_LOGIN_ERROR)

    user = db.scalar(select(User).where(User.email == email))

    # Identical error, identical status, for "no such user", "wrong password"
    # and "disabled account" -- no field-level hint that narrows the guess.
    valid = (
        user is not None
        and user.is_enabled
        and _verify_password(payload.password, user.password_hash)
    )
    if not valid:
        _record_failed_attempt(db, email, now)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=GENERIC_LOGIN_ERROR)

    _clear_lockout(db, email)

    token = _create_session(db, user)
    _set_session_cookie(response, token)
    return user


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, response: Response, db: DbSession) -> User:
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
    db: DbSession,
    session_id: SessionCookie = None,
) -> MessageResponse:
    session_uuid = _parse_session_uuid(session_id)
    if session_uuid is not None:
        session_row = db.get(SessionModel, session_uuid)
        if session_row is not None:
            db.delete(session_row)
            db.commit()

    response.delete_cookie(key=settings.SESSION_COOKIE_NAME, path="/")
    return MessageResponse(detail="Logged out")


@router.get("/me", response_model=UserOut)
def me(current_user: CurrentUser) -> User:
    return current_user
