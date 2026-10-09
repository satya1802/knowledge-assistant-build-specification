"""Deterministic offline stub: no key, no network, same input -> same output.

Selected whenever `GEMINI_OFFLINE` is truthy (AC-098), which is always true
for the automated test suite by default (AC-099, enforced in
`tests/conftest.py`) and is enough on its own to run the whole app manually
without a real key (AC-100): ingestion can embed chunks, retrieval can embed
queries and compare them, chat can generate an answer.

KNOW9BAE95-26-1: this is also the one provider the test suite can drive
deterministically into Gemini's two distinct failure modes -- an exhausted
quota (terminal, `QuotaExhaustedError`) and a transient rate limit
(retryable, `RateLimitError`) -- entirely offline, via the `fail_mode`/
`fail_times` constructor arguments below. Normal callers never pass them.
"""

import hashlib
import random
from collections.abc import Iterator

from app.services.llm.base import EMBEDDING_DIM, QuotaExhaustedError, RateLimitError


def _seed_for(text: str) -> int:
    # A hash, not `hash(text)`: the latter is salted per-process in CPython,
    # so it would not be deterministic across runs the way this must be.
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


class StubProvider:
    """The offline implementation of `app.services.llm.base.LLMProvider`.

    `fail_mode`:
      - `None` (default): behaves exactly as before, no injected failures.
      - `"quota_exhausted"`: every `embed`/`generate`/`generate_stream` call
        raises `QuotaExhaustedError`, unconditionally -- this failure mode
        never recovers on its own, so it is never bounded by `fail_times`.
      - `"rate_limit"`: raises `RateLimitError`. If `fail_times` is `None`,
        every call fails (used to prove retries are eventually exhausted and
        the error surfaces); if `fail_times` is a positive integer, only
        that many calls fail and every call after succeeds normally (used to
        prove a bounded retry recovers before `MAX_RETRIES` is exceeded).
    """

    def __init__(self, *, fail_mode: str | None = None, fail_times: int | None = None) -> None:
        self.fail_mode = fail_mode
        self._fail_times = fail_times

    def _maybe_fail(self) -> None:
        if self.fail_mode == "quota_exhausted":
            raise QuotaExhaustedError("Gemini account quota is exhausted (stub offline mode).")
        if self.fail_mode == "rate_limit":
            if self._fail_times is None:
                raise RateLimitError("Gemini rate limit exceeded (stub offline mode).")
            if self._fail_times > 0:
                self._fail_times -= 1
                raise RateLimitError("Gemini rate limit exceeded (stub offline mode).")

    def embed(self, texts: list[str]) -> list[list[float]]:
        self._maybe_fail()
        return [self._embed_one(text) for text in texts]

    def _embed_one(self, text: str) -> list[float]:
        rng = random.Random(_seed_for(text))
        return [rng.uniform(-1.0, 1.0) for _ in range(EMBEDDING_DIM)]

    def generate(self, prompt: str) -> str:
        return "".join(self.generate_stream(prompt))

    def generate_stream(self, prompt: str) -> Iterator[str]:
        self._maybe_fail()
        digest = hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:12]
        answer = (
            f"[offline stub answer {digest}] This is a deterministic local "
            f"response generated without calling Gemini, based on your prompt "
            f"of {len(prompt)} characters."
        )
        for word in answer.split(" "):
            yield word + " "
