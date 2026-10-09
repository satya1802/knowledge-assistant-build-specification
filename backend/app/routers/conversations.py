"""GET/DELETE /conversations: a signed-in user's own chat history
(KNOW9BAE95-30-1).

Every handler here goes through `app.services.conversations`'s ownership
check -- requesting or deleting another user's conversation by id is
refused with a plain 404, identical to "no such conversation" (AC-072).
"""

from fastapi import APIRouter, HTTPException, Query, status

from app.models import Conversation
from app.routers.auth import CurrentUser, DbSession
from app.schemas import ConversationDetailOut, ConversationOut
from app.services.conversations import (
    delete_conversation,
    get_owned_conversation,
    list_conversations,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationOut])
def get_conversations(
    current_user: CurrentUser,
    db: DbSession,
    q: str | None = Query(default=None, description="Search term: matches title or message text"),
) -> list[Conversation]:
    """AC-073: the caller's own conversations only, newest first. With `q`,
    restricted to conversations whose title or any message content contains
    the term, case-insensitively -- never another user's conversation."""
    return list_conversations(db, current_user.id, q)


@router.get("/{conversation_id}", response_model=ConversationDetailOut)
def get_conversation(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> Conversation:
    """AC-071: the full exchange, including every message's citations.
    AC-072: another user's conversation is a 404, not a 403 or 200."""
    conversation = get_owned_conversation(db, conversation_id, current_user.id)
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conversation


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_conversation(
    conversation_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """AC-072: deleting another user's conversation is refused with 404 and
    deletes nothing."""
    deleted = delete_conversation(db, conversation_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
