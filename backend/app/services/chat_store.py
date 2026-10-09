"""In-memory store for streamed chat answers (KNOW9BAE95-26-2, AC-058).

`POST /chat/ask`'s `done` event always carries a `message_id`, and AC-058
requires that a partial answer -- one cut short by a client disconnect, a
"stop", or a provider error -- is "retained server-side" rather than
discarded. This ticket's scope does not include a persisted `ChatMessage`
table (`app/models.py` is read-only here), so this is a process-lifetime
in-memory record instead: enough to prove the partial text was not simply
dropped. A later ticket can replace the body of `record`/`get` with real
persistence without changing this module's public shape.
"""

import threading
import uuid
from dataclasses import dataclass

__all__ = ["StoredMessage", "ChatMessageStore", "store"]


@dataclass(frozen=True)
class StoredMessage:
    message_id: str
    conversation_id: str | None
    question: str
    answer: str
    partial: bool


class ChatMessageStore:
    """Thread-safe: `record` is called from the request's async context,
    but a future caller on a worker thread must be able to use this safely
    too."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._messages: dict[str, StoredMessage] = {}

    def record(
        self,
        *,
        conversation_id: str | None,
        question: str,
        answer: str,
        partial: bool,
    ) -> str:
        message_id = uuid.uuid4().hex
        message = StoredMessage(
            message_id=message_id,
            conversation_id=conversation_id,
            question=question,
            answer=answer,
            partial=partial,
        )
        with self._lock:
            self._messages[message_id] = message
        return message_id

    def get(self, message_id: str) -> StoredMessage | None:
        with self._lock:
            return self._messages.get(message_id)


# Process-wide singleton, matching the pattern `app.services.llm.get_provider`
# and `app.services.ingestion.events.broker` already use.
store = ChatMessageStore()
