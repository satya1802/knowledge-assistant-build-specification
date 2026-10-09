"""The real Gemini client.

Only constructed when `GEMINI_OFFLINE` is false, which `app.config.Settings`
has already guaranteed means `GEMINI_API_KEY` is set. Every exception this
class raises has been through `redact()` first, so a failed call -- bad key,
quota, network error, whatever the SDK's own exception message happens to
contain -- can never put the key value into a log line or an error response
(AC-092).
"""

from collections.abc import Iterator

from google import genai

from app.config import settings
from app.services.llm.base import LLMProviderError, QuotaExhaustedError, RateLimitError
from app.services.security import redact

# Substrings (checked case-insensitively) that identify an exhausted-quota
# failure in the SDK's own exception message -- distinct from, and checked
# before, a merely transient rate limit (AC-096). Deliberately specific:
# only a message that clearly names a quota/billing limit is treated as
# terminal; everything else that looks rate-limit-ish falls through to the
# retryable classification below.
_QUOTA_EXHAUSTED_MARKERS = (
    "quota exceeded",
    "exceeded your current quota",
    "exceeded your quota",
    "quota exhausted",
    "billing",
)

# Substrings that identify a retryable rate-limit failure in the SDK's own
# exception message, as distinct from any other provider error (AC-041).
# Deliberately conservative: an error that does not clearly say "rate limit"
# is treated as a non-retryable failure.
_RATE_LIMIT_MARKERS = (
    "rate limit",
    "429",
    "resource_exhausted",
    "too many requests",
)


def _classify(raw_message: str) -> type[LLMProviderError]:
    """Return the specific `LLMProviderError` subclass `raw_message`
    indicates, or the base class when neither failure mode matches.

    Quota is checked first: "quota exceeded" would otherwise also match a
    looser rate-limit marker, and the two modes must never be conflated
    (AC-096) -- an exhausted quota is terminal, a rate limit is retried.
    """
    lowered = raw_message.lower()
    if any(marker in lowered for marker in _QUOTA_EXHAUSTED_MARKERS):
        return QuotaExhaustedError
    if any(marker in lowered for marker in _RATE_LIMIT_MARKERS):
        return RateLimitError
    return LLMProviderError


def _redacted_error(exc: Exception) -> LLMProviderError:
    raw_message = str(exc)
    error_cls = _classify(raw_message)
    return error_cls(redact(raw_message))


class GeminiProvider:
    """The online implementation of `app.services.llm.base.LLMProvider`."""

    def __init__(self) -> None:
        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def embed(self, texts: list[str]) -> list[list[float]]:
        try:
            result = self._client.models.embed_content(
                model=settings.GEMINI_EMBEDDING_MODEL,
                contents=texts,
            )
            return [list(embedding.values) for embedding in result.embeddings]
        except Exception as exc:  # noqa: BLE001 -- re-raised redacted, below
            raise _redacted_error(exc) from None

    def generate(self, prompt: str) -> str:
        try:
            response = self._client.models.generate_content(
                model=settings.GEMINI_ANSWER_MODEL,
                contents=prompt,
            )
            return response.text or ""
        except Exception as exc:  # noqa: BLE001
            raise _redacted_error(exc) from None

    def generate_stream(self, prompt: str) -> Iterator[str]:
        try:
            stream = self._client.models.generate_content_stream(
                model=settings.GEMINI_ANSWER_MODEL,
                contents=prompt,
            )
            for chunk in stream:
                if chunk.text:
                    yield chunk.text
        except Exception as exc:  # noqa: BLE001
            raise _redacted_error(exc) from None
