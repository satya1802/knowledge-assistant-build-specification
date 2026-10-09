"""KNOW9BAE95-22-1: batching (AC-040) and rate-limit retry (AC-041)."""

import pytest

from app.services.ingestion.embedding import BATCH_SIZE, embed_chunks
from app.services.llm.base import LLMProviderError, RateLimitError


class _RecordingProvider:
    def __init__(self, fail_times: int = 0) -> None:
        self.calls: list[list[str]] = []
        self._fail_times = fail_times

    def embed(self, texts: list[str]) -> list[list[float]]:
        self.calls.append(list(texts))
        if self._fail_times > 0:
            self._fail_times -= 1
            raise RateLimitError("rate limit exceeded")
        return [[0.0] * 768 for _ in texts]


class _AlwaysFailsProvider:
    def embed(self, texts: list[str]) -> list[list[float]]:
        raise RateLimitError("rate limit exceeded")


class _NonRetryableProvider:
    def embed(self, texts: list[str]) -> list[list[float]]:
        raise LLMProviderError("boom")


def _no_sleep(_seconds: float) -> None:
    return None


def test_embed_chunks_batches_at_most_100_per_request() -> None:
    provider = _RecordingProvider()
    texts = [f"chunk {i}" for i in range(250)]

    embeddings = embed_chunks(provider, texts, sleep=_no_sleep)

    assert len(embeddings) == 250
    assert all(len(call) <= BATCH_SIZE for call in provider.calls)
    assert sum(len(call) for call in provider.calls) == 250


def test_embed_chunks_retries_rate_limit_then_succeeds() -> None:
    provider = _RecordingProvider(fail_times=2)

    embeddings = embed_chunks(provider, ["a", "b"], sleep=_no_sleep)

    assert len(embeddings) == 2
    assert len(provider.calls) == 3  # two failures, one success


def test_embed_chunks_gives_up_after_max_retries() -> None:
    provider = _AlwaysFailsProvider()

    with pytest.raises(RateLimitError):
        embed_chunks(provider, ["a"], sleep=_no_sleep)


def test_embed_chunks_non_rate_limit_error_is_not_retried() -> None:
    provider = _NonRetryableProvider()

    with pytest.raises(LLMProviderError):
        embed_chunks(provider, ["a"], sleep=_no_sleep)
