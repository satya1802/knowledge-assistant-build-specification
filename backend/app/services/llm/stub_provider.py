"""Deterministic offline stub: no key, no network, same input -> same output.

Selected whenever `GEMINI_OFFLINE` is truthy (AC-098), which is always true
for the automated test suite by default (AC-099, enforced in
`tests/conftest.py`) and is enough on its own to run the whole app manually
without a real key (AC-100): ingestion can embed chunks, retrieval can embed
queries and compare them, chat can generate an answer.
"""

import hashlib
import random
from collections.abc import Iterator

from app.services.llm.base import EMBEDDING_DIM


def _seed_for(text: str) -> int:
    # A hash, not `hash(text)`: the latter is salted per-process in CPython,
    # so it would not be deterministic across runs the way this must be.
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


class StubProvider:
    """The offline implementation of `app.services.llm.base.LLMProvider`."""

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(text) for text in texts]

    def _embed_one(self, text: str) -> list[float]:
        rng = random.Random(_seed_for(text))
        return [rng.uniform(-1.0, 1.0) for _ in range(EMBEDDING_DIM)]

    def generate(self, prompt: str) -> str:
        return "".join(self.generate_stream(prompt))

    def generate_stream(self, prompt: str) -> Iterator[str]:
        digest = hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:12]
        answer = (
            f"[offline stub answer {digest}] This is a deterministic local "
            f"response generated without calling Gemini, based on your prompt "
            f"of {len(prompt)} characters."
        )
        for word in answer.split(" "):
            yield word + " "
