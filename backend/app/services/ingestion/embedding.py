"""Batches chunk texts for embedding and retries a transient rate-limit
failure with backoff (AC-040/AC-041).

Kept separate from `chunking.py` (which must stay a pure, provider-free
library module) and from `pipeline.py` (which owns document status) so the
batching/retry policy is unit-testable on its own, against a fake provider
and a no-op `sleep`.
"""

import time
from collections.abc import Callable

from app.services.llm.base import LLMProvider, RateLimitError

# Gemini's batch embedding endpoint is requested in batches of at most this
# many chunks (AC-040).
BATCH_SIZE = 100

# A handful of short retries with exponential backoff is enough to ride out a
# transient rate limit without holding the ingestion worker thread for too
# long; beyond this, the failure propagates and the document moves to
# "failed" with a readable `status_reason` (AC-041).
MAX_RETRIES = 3
BACKOFF_BASE_SECONDS = 0.5


def embed_chunks(
    provider: LLMProvider,
    texts: list[str],
    sleep: Callable[[float], None] = time.sleep,
) -> list[list[float]]:
    """Return one embedding per entry in `texts`, in order.

    Requests are split into batches of at most `BATCH_SIZE` texts (AC-040). A
    batch that fails with `RateLimitError` is retried up to `MAX_RETRIES`
    times with exponential backoff (`sleep` is injectable so tests never
    actually wait); any other failure, or a rate limit with retries
    exhausted, is re-raised to the caller unchanged.
    """
    embeddings: list[list[float]] = []
    for start in range(0, len(texts), BATCH_SIZE):
        batch = texts[start : start + BATCH_SIZE]
        embeddings.extend(_embed_batch_with_retry(provider, batch, sleep))
    return embeddings


def _embed_batch_with_retry(
    provider: LLMProvider,
    batch: list[str],
    sleep: Callable[[float], None],
) -> list[list[float]]:
    attempt = 0
    while True:
        try:
            return provider.embed(batch)
        except RateLimitError:
            attempt += 1
            if attempt > MAX_RETRIES:
                raise
            sleep(BACKOFF_BASE_SECONDS * (2 ** (attempt - 1)))
