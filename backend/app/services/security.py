"""Secret redaction.

A single helper that every place handling the Gemini key routes through, so
the key can never leak into a log line or an error response -- at any log
level, including from a failed Gemini call (AC-092).
"""

from app.config import settings

_PLACEHOLDER = "[REDACTED]"


def redact(text: str) -> str:
    """Return `text` with the configured Gemini API key scrubbed out, if set.

    Safe to call unconditionally: when no key is configured (offline mode)
    this is a no-op.
    """
    key = settings.GEMINI_API_KEY
    if not key:
        return text
    return text.replace(key, _PLACEHOLDER)
