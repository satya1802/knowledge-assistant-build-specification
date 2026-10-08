"""Environment-driven application settings.

Deliberately plain `os.getenv` reads rather than `pydantic-settings`: that
package is not an approved dependency, and the handful of settings this
service needs do not warrant adding one. KNOW9BAE95-37-1 extends this module
with Gemini configuration -- add new settings here, do not rewrite what
already exists.

`python-dotenv` loads `backend/.env` (gitignored, see `.env.example` for the
documented variable list) so a local developer need only drop a key in that
file rather than export environment variables by hand. `override=False` means
a variable already present in the real process environment (as it is in CI
and in production) always wins over whatever `.env` says.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_FILE, override=False)


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


class ConfigurationError(RuntimeError):
    """Raised at startup when a required setting is missing or invalid."""


class Settings:
    """Process-wide settings, read once at import time."""

    # The cookie that carries the session id. HttpOnly and SameSite=Lax always;
    # Secure is environment-driven so local http://localhost still works while
    # a real deployment behind https can turn it on.
    SESSION_COOKIE_NAME: str = os.getenv("SESSION_COOKIE_NAME", "session_id")
    SESSION_COOKIE_SECURE: bool = _as_bool(os.getenv("SESSION_COOKIE_SECURE"), default=False)
    SESSION_TTL_SECONDS: int = int(os.getenv("SESSION_TTL_SECONDS", str(60 * 60 * 24 * 7)))

    # Gemini. GEMINI_OFFLINE selects the deterministic local stub provider over
    # the real client (contract: callers never branch on offline mode
    # themselves -- `app.services.llm.get_provider()` does that once, here).
    # GEMINI_ANSWER_MODEL defaults to a Flash-Lite model: fast and cheap enough
    # for a chat answer, per the approved architecture.
    GEMINI_OFFLINE: bool = _as_bool(os.getenv("GEMINI_OFFLINE"), default=False)
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY") or None
    GEMINI_EMBEDDING_MODEL: str = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
    GEMINI_ANSWER_MODEL: str = os.getenv("GEMINI_ANSWER_MODEL", "gemini-2.5-flash-lite")

    def __init__(self) -> None:
        # Fail fast: a service that starts without a key, then falls over on
        # its first chat request, is far worse than one that never starts.
        if not self.GEMINI_OFFLINE and not self.GEMINI_API_KEY:
            raise ConfigurationError(
                "Missing required environment variable: GEMINI_API_KEY. Set it in "
                "backend/.env (see backend/.env.example), or set GEMINI_OFFLINE=1 "
                "to run against the deterministic offline stub instead."
            )


settings = Settings()
