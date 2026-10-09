"""KNOW9BAE95-26-1: the Gemini error taxonomy (quota-exhausted vs retryable
rate limit) and the shared bounded-retry policy reused by embedding and
answer calls (AC-095/AC-096)."""

import pytest

from app.services.ingestion.embedding import (
    MAX_RETRIES,
    embed_chunks,
    generate_with_retry,
)
from app.services.llm.base import LLMProviderError, QuotaExhaustedError, RateLimitError
from app.services.llm.gemini_provider import _classify
from app.services.llm.stub_provider import StubProvider


def _no_sleep(_seconds: float) -> None:
    return None


def test_quota_exhausted_is_a_subclass_of_llm_provider_error_not_rate_limit() -> None:
    assert issubclass(QuotaExhaustedError, LLMProviderError)
    assert not issubclass(QuotaExhaustedError, RateLimitError)


def test_stub_provider_quota_exhausted_mode_raises_on_embed_and_generate() -> None:
    provider = StubProvider(fail_mode="quota_exhausted")

    with pytest.raises(QuotaExhaustedError):
        provider.embed(["hello"])
    with pytest.raises(QuotaExhaustedError):
        provider.generate("hello")


def test_stub_provider_rate_limit_mode_raises_rate_limit_error() -> None:
    provider = StubProvider(fail_mode="rate_limit")

    with pytest.raises(RateLimitError):
        provider.embed(["hello"])


def test_stub_provider_rate_limit_mode_recovers_after_fail_times() -> None:
    provider = StubProvider(fail_mode="rate_limit", fail_times=2)

    embeddings = embed_chunks(provider, ["a"], sleep=_no_sleep)

    assert len(embeddings) == 1


def test_quota_exhausted_is_never_retried_by_embed_chunks() -> None:
    provider = StubProvider(fail_mode="quota_exhausted")

    with pytest.raises(QuotaExhaustedError):
        embed_chunks(provider, ["a"], sleep=_no_sleep)


def test_rate_limit_retried_bounded_then_succeeds_for_embedding() -> None:
    # fail_times == MAX_RETRIES: the last retry attempt succeeds.
    provider = StubProvider(fail_mode="rate_limit", fail_times=MAX_RETRIES)

    embeddings = embed_chunks(provider, ["a"], sleep=_no_sleep)

    assert len(embeddings) == 1


def test_rate_limit_exhausts_retries_and_surfaces_for_embedding() -> None:
    provider = StubProvider(fail_mode="rate_limit")  # always fails

    with pytest.raises(RateLimitError):
        embed_chunks(provider, ["a"], sleep=_no_sleep)


def test_rate_limit_retried_bounded_then_succeeds_for_answer_call() -> None:
    """AC-096: the same bounded-backoff policy is reused for an answer
    (generate) call, not just embedding."""
    provider = StubProvider(fail_mode="rate_limit", fail_times=MAX_RETRIES)

    answer = generate_with_retry(provider, "what is the policy?", sleep=_no_sleep)

    assert answer


def test_quota_exhausted_is_never_retried_for_answer_call() -> None:
    provider = StubProvider(fail_mode="quota_exhausted")

    with pytest.raises(QuotaExhaustedError):
        generate_with_retry(provider, "what is the policy?", sleep=_no_sleep)


def test_gemini_provider_classifies_quota_exhausted_message() -> None:
    assert _classify("429 Quota exceeded for quota metric") is QuotaExhaustedError
    assert _classify("You have exceeded your current quota, please check billing") is (
        QuotaExhaustedError
    )


def test_gemini_provider_classifies_rate_limit_message() -> None:
    assert _classify("429 Too Many Requests") is RateLimitError
    assert _classify("RESOURCE_EXHAUSTED: rate limit hit") is RateLimitError


def test_gemini_provider_classifies_other_errors_as_base_error() -> None:
    assert _classify("invalid API key") is LLMProviderError


def test_stub_provider_default_mode_behaves_exactly_as_before() -> None:
    provider = StubProvider()
    vectors = provider.embed(["hello", "world"])
    assert len(vectors) == 2
    assert all(len(v) == 768 for v in vectors)
    assert provider.generate("hi")
