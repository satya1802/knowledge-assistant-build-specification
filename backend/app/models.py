"""SQLAlchemy models.

`User` and `Session` back real email/password authentication: a user row per
account, a session row per logged-in browser, looked up by the opaque token
carried in the session cookie. `LoginLockout` tracks failed sign-in attempts
per email, server-side, so lockout state survives a process restart
(KNOW9BAE95-14-1).
"""

import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

__all__ = ["Base", "User", "Session", "LoginLockout"]


def _uuid() -> str:
    return uuid.uuid4().hex


class User(Base):
    """An account. The first one ever created is the admin (AC-015)."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="employee")
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Appearance preference (AC-080): persisted so it survives a reload and a
    # later sign-in, not just kept in browser storage. One of "light", "dark",
    # "system" -- enforced in the request schema, not here.
    theme: Mapped[str] = mapped_column(String(20), nullable=False, default="system")
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.datetime.utcnow
    )

    sessions: Mapped[list["Session"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Session(Base):
    """A logged-in browser. Its id is the opaque UUID value stored in the cookie.

    `last_activity_at` backs idle expiry (AC-011): updated on every
    authenticated request, checked against `SESSION_IDLE_SECONDS`
    independently of `expires_at` (the absolute session TTL).
    """

    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.datetime.utcnow
    )
    last_activity_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.datetime.utcnow
    )
    expires_at: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=False)

    user: Mapped["User"] = relationship(back_populates="sessions")


class LoginLockout(Base):
    """Per-email failed sign-in tracking (AC-005/006/007).

    Server-side and keyed by email, not IP, and stored in the database so it
    survives a process restart. `first_failure_at` anchors the rolling
    window: once it is older than `LOGIN_LOCKOUT_WINDOW_SECONDS`, the next
    failure starts a fresh window and count. `locked_until`, once set, blocks
    every attempt -- correct password or not -- until it elapses.
    """

    __tablename__ = "login_lockouts"

    email: Mapped[str] = mapped_column(String(320), primary_key=True)
    failed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    first_failure_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
    locked_until: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)
