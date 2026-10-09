"""Batches chunk texts for embedding and retries a transient rate-limit
failure with backoff (AC-040/AC-041), via a small shared retry primitive
(`_call_with_retry`) also reused for an answer/generate call (AC-096) through
`generate_with_retry` below.

Kept separate from `chunking.py` (which must stay a pure, provider-free
library module) and from `pipeline.py` (which owns document status) so the
batching/retry policy is unit-testable on its own, against a fake provider
and a no-op `sleep`.
"""

import time
from collections.abc import Callable

from app.config import settings
from app.services.llm.base import LLMProvider, RateLimitError

# Gemini's batch embedding endpoint is requested in batches of at most this
# many chunks (AC-040).
BATCH_SIZE = 100

# A handful of short retries with exponential backoff is enough to ride out a
# transient rate limit without holding the ingestion worker thread for too
# long; beyond this, the failure propagates and the document moves to
# "failed" with a readable `status_reason` (AC-041). Read from settings so
# the bound is configurable, and shared by every caller of `_call_with_retry`
# (AC-096) rather than each defining its own policy.
MAX_RETRIES = settings.LLM_MAX_RETRIES
BACKOFF_BASE_SECONDS = settings.LLM_RETRY_BACKOFF_BASE_SECONDS


def embed_chunks(
    provider: LLMProvider,
    texts: list[str],
    sleep: Callable[[float], None] = time.sleep,
) -> list[list[float]]:
    """Return one embedding per entry in `texts`, in order.

    Requests are split into batches of at most `BATCH_SIZE` texts (AC-040). A
    batch that fails with `RateLimitError` is retried up to `MAX_RETRIES`
    times with exponential backoff (`sleep` is injectable so tests never
    actually wait); any other failure -- including `QuotaExhaustedError`,
    which is never retried (AC-096) -- or a rate limit with retries
    exhausted, is re-raised to the caller unchanged.
    """
    embeddings: list[list[float]] = []
    for start in range(0, len(texts), BATCH_SIZE):
        batch = texts[start : start + BATCH_SIZE]
        embeddings.extend(_call_with_retry(lambda b=batch: provider.embed(b), sleep))
    return embeddings


def generate_with_retry(
    provider: LLMProvider,
    prompt: str,
    sleep: Callable[[float], None] = time.sleep,
) -> str:
    """Return `provider.generate(prompt)`, retrying the same bounded,
    exponential-backoff policy `embed_chunks` uses on a retryable rate limit
    (AC-096). An exhausted-quota error is never retried; it is re-raised
    immediately, just as it is from `embed_chunks`.
    """
    return _call_with_retry(lambda: provider.generate(prompt), sleep)


def _call_with_retry[T](
    call: Callable[[], T],
    sleep: Callable[[float], None],
) -> T:
    """Shared retry primitive (AC-096): retries only `RateLimitError`, up to
    `MAX_RETRIES` times with exponential backoff; every other exception --
    including `QuotaExhaustedError` -- propagates on the first attempt.
    """
    attempt = 0
    while True:
        try:
            return call()
        except RateLimitError:
            attempt += 1
            if attempt > MAX_RETRIES:
                raise
            sleep(BACKOFF_BASE_SECONDS * (2 ** (attempt - 1)))
