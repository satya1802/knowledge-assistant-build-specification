"""Shared admin-only guard.

`require_admin` is the single dependency every administrative endpoint
(user administration, and the documents router) applies, so "who may
manage this" is decided in exactly one place. Built on `get_current_user`
from `app.routers.auth` -- it never re-implements session/auth logic.
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.models import User
from app.routers.auth import CurrentUser

__all__ = ["require_admin", "AdminUser"]


def require_admin(current_user: CurrentUser) -> User:
    """Return the current user if they are an admin, else 403 (AC-022)."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


AdminUser = Annotated[User, Depends(require_admin)]
