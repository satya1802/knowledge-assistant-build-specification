"""In-process pub/sub for document status changes (AC-029).

No external broker: the background ingestion task runs in a worker thread
(via FastAPI's `BackgroundTasks`, see `app.routers.documents`) and publishes
here; `GET /documents/stream` subscribes from the main event loop and turns
each publish into an SSE event. `publish` is safe to call from any thread --
it marshals onto the event loop via `call_soon_threadsafe` once that loop is
known (captured the first time anything subscribes).
"""

import asyncio

__all__ = ["broker"]


class DocumentEventBroker:
    """A tiny fan-out: one `asyncio.Queue` per connected SSE client."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def subscribe(self) -> asyncio.Queue:
        """Must be called from a coroutine running on the app's event loop."""
        self._loop = asyncio.get_running_loop()
        queue: asyncio.Queue = asyncio.Queue()
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue) -> None:
        self._subscribers.discard(queue)

    def publish(self, document_id: str) -> None:
        """Notify every subscriber that `document_id` changed. Safe to call
        from a background thread; a no-op if nobody has ever subscribed."""
        loop = self._loop
        if loop is None:
            return
        loop.call_soon_threadsafe(self._publish_now, document_id)

    def _publish_now(self, document_id: str) -> None:
        for queue in list(self._subscribers):
            queue.put_nowait(document_id)


broker = DocumentEventBroker()
