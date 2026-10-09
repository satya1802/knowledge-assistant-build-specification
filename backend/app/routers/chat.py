"""POST /chat/ask: an authenticated, server-sent-events grounded answer
stream (KNOW9BAE95-26-2).

Retrieval (`app.services.retrieval.retrieve`) runs once, synchronously, up
front -- its `top_k`/`threshold` are server-side settings the client can
never override (AC-056, enforced by `ChatAskRequest`'s `extra="forbid"`).
When at least one chunk clears the threshold, its text is the *only* source
of fact the prompt allows the model to draw on (AC-055); when none does, a
`no_match` event is sent instead of ever asking the model to answer
unsourced.

Generation itself runs in a worker thread (the provider's `generate_stream`
is a blocking iterator, same as a Gemini SDK call anywhere else in this
codebase) and is bridged onto the event loop through an `asyncio.Queue`, the
same `call_soon_threadsafe` pattern `app.services.ingestion.events` uses for
the documents status stream. That lets this coroutine do two things neither
a bare `for token in provider.generate_stream(...)` loop nor `await
run_in_executor(...)` could: emit a `ping` event on a fixed interval while
waiting for the next token (AC-057), and notice a client disconnect
immediately and signal the worker thread to stop pulling from the provider
(AC-058) rather than waiting for it to finish on its own.
"""

import asyncio
import json
import threading
from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.database import SessionLocal
from app.models import DocumentChunk
from app.routers.auth import CurrentUser
from app.schemas import ChatAskRequest
from app.services.chat_store import store
from app.services.llm import get_provider
from app.services.llm.base import LLMProviderError, QuotaExhaustedError
from app.services.retrieval import RetrievedChunk, retrieve

router = APIRouter(prefix="/chat", tags=["chat"])

# Fixed keep-alive interval (AC-057): short enough that a model taking
# several seconds to produce its first token never leaves the connection
# looking idle/frozen to a client or intermediary proxy, matching the
# pattern `app.routers.documents.stream_documents` already uses for its own
# fixed-interval ping, just on a shorter cadence appropriate to a live chat
# answer rather than a document status change.
_PING_INTERVAL_SECONDS = 4.0

# AC-094/AC-097: short, fixed messages. Neither ever repeats the provider's
# own exception text (constraint: "no raw provider exception text may reach
# the response body") and neither contains any word that could read as an
# upsell -- "upgrade", "pay", "bill", "purchase", "subscri*" are all absent
# on purpose, by construction, not by filtering.
_QUOTA_EXHAUSTED_MESSAGE = "The AI service quota has been used up. Please contact an administrator."
_PROVIDER_ERROR_MESSAGE = (
    "The AI service is temporarily unavailable. Please try again, or contact "
    "an administrator if the problem continues."
)
# AC-063: below-threshold path. AC-065: empty-knowledge-base path (same
# `no_match` event, a different, more actionable message) -- both state
# plainly that no relevant documents were found; neither is ever paired
# with a token/sources event or a general-knowledge answer (AC-064).
_NO_MATCH_MESSAGE = "No relevant documents were found in the knowledge base for this question."
_EMPTY_KNOWLEDGE_BASE_MESSAGE = (
    "No relevant documents were found in the knowledge base. Try asking an "
    "administrator to upload relevant documents."
)


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _build_prompt(question: str, chunks: list[RetrievedChunk]) -> str:
    """AC-055: the model is given nothing but these chunks and told, in so
    many words, not to draw on anything else."""
    context = "\n\n".join(
        f"[Source: {chunk.filename}"
        + (f", page {chunk.page_number}" if chunk.page_number else "")
        + f"]\n{chunk.text}"
        for chunk in chunks
    )
    return (
        "You are a workplace knowledge assistant. Answer the question using "
        "ONLY the information given in the context below. Do not use any "
        "outside knowledge, do not guess, and do not invent facts the "
        "context does not contain. If the context does not actually answer "
        "the question, say so plainly instead of answering anyway.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )


@router.post("/ask")
async def ask(
    payload: ChatAskRequest,
    current_user: CurrentUser,
    request: Request,
) -> StreamingResponse:
    # `current_user` resolves (or raises 401) before a single line of the
    # generator below runs -- FastAPI evaluates every `Depends` before
    # calling the route -- so an unauthenticated caller never reaches
    # retrieval or the provider at all.
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question is required")

    async def event_source() -> AsyncIterator[str]:
        db = SessionLocal()
        kb_empty = False
        try:
            chunks = retrieve(db, question)
            if not chunks:
                # AC-065: an empty knowledge base (no chunk at all, ever) gets
                # its own message, distinct from "nothing scored above
                # threshold" -- determined here, while `db` is still open,
                # rather than reopening a session after the `finally` below.
                kb_empty = db.scalar(select(DocumentChunk.id).limit(1)) is None
        except QuotaExhaustedError:
            message_id = store.record(
                conversation_id=payload.conversation_id,
                question=question,
                answer="",
                partial=True,
            )
            yield _sse("error", {"code": "quota_exhausted", "message": _QUOTA_EXHAUSTED_MESSAGE})
            yield _sse("done", {"message_id": message_id, "partial": True})
            return
        except LLMProviderError:
            message_id = store.record(
                conversation_id=payload.conversation_id,
                question=question,
                answer="",
                partial=True,
            )
            yield _sse("error", {"code": "provider_error", "message": _PROVIDER_ERROR_MESSAGE})
            yield _sse("done", {"message_id": message_id, "partial": True})
            return
        finally:
            db.close()

        if not chunks:
            # AC-055: never an unsourced answer -- an explicit event instead.
            message_id = store.record(
                conversation_id=payload.conversation_id,
                question=question,
                answer="",
                partial=False,
            )
            message = _EMPTY_KNOWLEDGE_BASE_MESSAGE if kb_empty else _NO_MATCH_MESSAGE
            yield _sse("no_match", {"message": message})
            yield _sse("done", {"message_id": message_id, "partial": False})
            return

        yield _sse(
            "sources",
            {
                "sources": [
                    {
                        "chunk_id": chunk.chunk_id,
                        "document_id": chunk.document_id,
                        "filename": chunk.filename,
                        "page": chunk.page_number,
                        "text": chunk.text,
                        "score": chunk.score,
                    }
                    for chunk in chunks
                ]
            },
        )

        provider = get_provider()
        prompt = _build_prompt(question, chunks)

        loop = asyncio.get_running_loop()
        queue: asyncio.Queue = asyncio.Queue()
        stop_event = threading.Event()

        def produce() -> None:
            try:
                for token in provider.generate_stream(prompt):
                    if stop_event.is_set():
                        # AC-058: the server stops consuming the provider
                        # stream the moment a disconnect/stop is noticed.
                        return
                    loop.call_soon_threadsafe(queue.put_nowait, ("token", token))
                loop.call_soon_threadsafe(queue.put_nowait, ("done", None))
            except QuotaExhaustedError:
                loop.call_soon_threadsafe(queue.put_nowait, ("error", "quota_exhausted"))
            except LLMProviderError:
                loop.call_soon_threadsafe(queue.put_nowait, ("error", "provider_error"))

        worker = threading.Thread(target=produce, daemon=True)
        worker.start()

        answer_parts: list[str] = []
        partial = True
        try:
            while True:
                if await request.is_disconnected():
                    stop_event.set()
                    break

                try:
                    kind, value = await asyncio.wait_for(
                        queue.get(), timeout=_PING_INTERVAL_SECONDS
                    )
                except TimeoutError:
                    yield _sse("ping", {})
                    continue

                if kind == "token":
                    answer_parts.append(value)
                    yield _sse("token", {"text": value})
                elif kind == "done":
                    partial = False
                    break
                elif kind == "error":
                    error_code = value
                    message = (
                        _QUOTA_EXHAUSTED_MESSAGE
                        if error_code == "quota_exhausted"
                        else _PROVIDER_ERROR_MESSAGE
                    )
                    yield _sse("error", {"code": error_code, "message": message})
                    break
        finally:
            # Always set, even on the success path: a no-op there, but it
            # guarantees the worker thread never blocks forever trying to
            # push one more token onto a queue nobody will read again.
            stop_event.set()

        message_id = store.record(
            conversation_id=payload.conversation_id,
            question=question,
            answer="".join(answer_parts),
            partial=partial,
        )
        yield _sse("done", {"message_id": message_id, "partial": partial})

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
