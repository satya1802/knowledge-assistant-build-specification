"""The provider interface both implementations satisfy.

Kept intentionally small: ingestion needs `embed`, chat needs `generate` (and
`generate_stream` for the live-typing UI); retrieval needs only `embed`. A
`Protocol` rather than an ABC, so neither implementation has to subclass
anything to satisfy it -- structural typing, checked by mypy/IDE if either is
ever used, not enforced at runtime.
"""

from collections.abc import Iterator
from typing import Protocol

# Gemini's text-embedding-004 model, and the stub that stands in for it,
# both produce vectors of this length -- the dimension the API spec and the
# pgvector column it will eventually back both assume.
EMBEDDING_DIM = 768


class LLMProviderError(Exception):
    """A Gemini call failed.

    Raised only with an already-redacted message (see `app.services.security.
    redact`): nothing that catches and logs this exception, at any log level,
    can leak the API key through it.
    """


class RateLimitError(LLMProviderError):
    """A Gemini call failed specifically because of rate limiting/quota.

    Distinguished from the base `LLMProviderError` so a caller (see
    `app.services.ingestion.embedding`) can retry this one failure mode with
    backoff and treat every other provider failure as immediately terminal
    (AC-041).
    """


class LLMProvider(Protocol):
    """embed(texts) -> 768-dim vectors; generate(prompt) -> answer text/stream."""

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one 768-dimension embedding vector per input text, in order."""
        ...

    def generate(self, prompt: str) -> str:
        """Return the full answer text for `prompt`."""
        ...

    def generate_stream(self, prompt: str) -> Iterator[str]:
        """Yield the answer for `prompt` incrementally, chunk by chunk."""
        ...
