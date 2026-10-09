"""Conversation/message persistence (KNOW9BAE95-30-1).

Replaces `app.services.chat_store`'s process-lifetime in-memory record: a
conversation and its messages now outlive the process and are scoped to the
owning user. `get_owned_conversation` is the single ownership check every
read, write and delete goes through -- a caller never sees, and never learns
anything about, another user's conversation (AC-072): a mismatch is reported
exactly like "does not exist" (`None`), never a distinct "forbidden" signal.
"""

import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import ChatMessage, Conversation

__all__ = [
    "get_owned_conversation",
    "get_or_create_conversation",
    "record_exchange",
    "list_conversations",
    "delete_conversation",
]

_TITLE_MAX_LENGTH = 80


def _derive_title(question: str) -> str:
    """The conversation's title: the question's first line, truncated."""
    first_line = question.strip().splitlines()[0].strip() if question.strip() else ""
    if not first_line:
        return "New conversation"
    if len(first_line) > _TITLE_MAX_LENGTH:
        return first_line[: _TITLE_MAX_LENGTH - 1].rstrip() + "…"
    return first_line


def get_owned_conversation(db: Session, conversation_id: str, user_id: str) -> Conversation | None:
    """`None` for "does not exist" and for "belongs to someone else" alike
    (AC-072) -- the caller cannot tell the two apart from this return value."""
    conversation = db.get(Conversation, conversation_id)
    if conversation is None or conversation.user_id != user_id:
        return None
    return conversation


def get_or_create_conversation(
    db: Session,
    *,
    conversation_id: str | None,
    user_id: str,
    question: str,
) -> Conversation:
    """Resolve `conversation_id` to the caller's own conversation, or create
    one (titled from `question`) when it is absent.

    Raises `LookupError` when `conversation_id` is given but does not
    resolve to one of this user's conversations -- the caller turns that
    into a 404 (AC-072), never leaking whether the id belongs to someone
    else.
    """
    if conversation_id:
        conversation = get_owned_conversation(db, conversation_id, user_id)
        if conversation is None:
            raise LookupError(f"Conversation {conversation_id!r} not found for this user")
        return conversation

    conversation = Conversation(user_id=user_id, title=_derive_title(question))
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation


def record_exchange(
    db: Session,
    *,
    conversation_id: str,
    question: str,
    answer: str,
    sources: list[dict],
) -> str:
    """Persist the question and its answer (with citations) as two
    messages, bump the conversation's `updated_at`, and return the
    assistant message's id -- the id surfaced as `message_id` in `POST
    /chat/ask`'s SSE `done` event.
    """
    now = datetime.datetime.utcnow()
    user_message = ChatMessage(
        conversation_id=conversation_id,
        role="user",
        content=question,
        sources=None,
        created_at=now,
    )
    assistant_message = ChatMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=answer,
        sources=sources or None,
        created_at=now,
    )
    db.add(user_message)
    db.add(assistant_message)

    conversation = db.get(Conversation, conversation_id)
    if conversation is not None:
        conversation.updated_at = now
        db.add(conversation)

    db.commit()
    db.refresh(assistant_message)
    return assistant_message.id


def list_conversations(db: Session, user_id: str) -> list[Conversation]:
    """Newest first (AC-073), this user's own rows only (AC-072)."""
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
    )
    return list(db.scalars(stmt).all())


def delete_conversation(db: Session, conversation_id: str, user_id: str) -> bool:
    """`True` on delete, `False` for "not found or not yours" (AC-072)."""
    conversation = get_owned_conversation(db, conversation_id, user_id)
    if conversation is None:
        return False
    db.delete(conversation)
    db.commit()
    return True
