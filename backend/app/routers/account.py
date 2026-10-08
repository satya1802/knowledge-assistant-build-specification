"""The signed-in user's own account: change password, set theme.

Builds on `app.routers.auth`'s session dependency (`get_current_user`) and
bcrypt helpers rather than duplicating either (KNOW9BAE95-32-1 constraint).
"""

from fastapi import APIRouter, HTTPException, status

from app.database import get_db  # noqa: F401 -- re-exported for parity with auth.py's DbSession
from app.routers.auth import CurrentUser, DbSession, _hash_password, _verify_password
from app.schemas import ChangePasswordRequest, MessageResponse, ThemeRequest

router = APIRouter(prefix="/account", tags=["account"])


@router.post("/password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    if not _verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    current_user.password_hash = _hash_password(payload.new_password)
    db.add(current_user)
    db.commit()
    return MessageResponse(detail="Password updated")


@router.put("/theme", response_model=MessageResponse)
def set_theme(
    payload: ThemeRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> MessageResponse:
    current_user.theme = payload.theme
    db.add(current_user)
    db.commit()
    return MessageResponse(detail="Theme updated")
