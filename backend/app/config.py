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

    # Idle expiry: no "remember me" -- this window always applies, independent
    # of SESSION_TTL_SECONDS above (AC-011). Defaults to 30 minutes.
    SESSION_IDLE_SECONDS: int = int(os.getenv("SESSION_IDLE_SECONDS", str(30 * 60)))

    # Per-email login lockout (AC-005/AC-006/AC-007): counters and the lock
    # itself live in the database, not memory, so they survive a restart.
    LOGIN_LOCKOUT_THRESHOLD: int = int(os.getenv("LOGIN_LOCKOUT_THRESHOLD", "5"))
    LOGIN_LOCKOUT_WINDOW_SECONDS: int = int(os.getenv("LOGIN_LOCKOUT_WINDOW_SECONDS", "900"))
    LOGIN_LOCKOUT_DURATION_SECONDS: int = int(os.getenv("LOGIN_LOCKOUT_DURATION_SECONDS", "900"))

    # Gemini. GEMINI_OFFLINE selects the deterministic local stub provider over
    # the real client (contract: callers never branch on offline mode
    # themselves -- `app.services.llm.get_provider()` does that once, here).
    # GEMINI_ANSWER_MODEL defaults to a Flash-Lite model: fast and cheap enough
    # for a chat answer, per the approved architecture.
    GEMINI_OFFLINE: bool = _as_bool(os.getenv("GEMINI_OFFLINE"), default=False)
    GEMINI_API_KEY: str | None = os.getenv("GEMINI_API_KEY") or None
    GEMINI_EMBEDDING_MODEL: str = os.getenv("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
    GEMINI_ANSWER_MODEL: str = os.getenv("GEMINI_ANSWER_MODEL", "gemini-2.5-flash-lite")

    # Retrieval (KNOW9BAE95-26-1): server-side only settings -- there is no
    # request parameter or user control for either (AC-056). The threshold is
    # a cosine similarity score in [-1, 1]; only chunks scoring at or above it
    # are ever returned.
    RETRIEVAL_TOP_K: int = int(os.getenv("RETRIEVAL_TOP_K", "5"))
    RETRIEVAL_MIN_SCORE: float = float(os.getenv("RETRIEVAL_MIN_SCORE", "0.62"))

    # Shared bounded-retry policy for a retryable Gemini rate-limit error,
    # reused by both the embedding batch call (ingestion) and the answer
    # call (chat) (AC-096). An exhausted-quota error is never retried under
    # this policy regardless -- see app.services.llm.base.QuotaExhaustedError.
    LLM_MAX_RETRIES: int = int(os.getenv("LLM_MAX_RETRIES", "3"))
    LLM_RETRY_BACKOFF_BASE_SECONDS: float = float(
        os.getenv("LLM_RETRY_BACKOFF_BASE_SECONDS", "0.5")
    )

    # Admin-controlled switch for self-service account creation (AC-008/009).
    # True by default so a fresh clone's sign-in page offers "create account"
    # out of the box; an admin sets this to 0 to hide/disable it.
    SELF_SIGNUP_ENABLED: bool = _as_bool(os.getenv("SELF_SIGNUP_ENABLED"), default=True)

    # Filesystem directory the original bytes of every uploaded document are
    # written to (KNOW9BAE95-18-1). Relative paths are resolved against the
    # process's working directory (normally `backend/`). Created on first use
    # if it does not already exist. Persists across restarts: in a container
    # deployment this must be a mounted volume, not ephemeral container storage.
    DOCUMENT_STORAGE_DIR: str = os.getenv("DOCUMENT_STORAGE_DIR", "./storage/documents")

    # Maximum accepted size of a single document upload (AC-025), in bytes.
    # Configured in MB via MAX_UPLOAD_MB for a human-friendly env value;
    # defaults to the 25 MB limit the product requires.
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "25"))
    MAX_UPLOAD_BYTES: int = MAX_UPLOAD_MB * 1024 * 1024

    # Single source of truth for the database connection (KNOW9BAE95-42-1).
    # Defaults to a local SQLite file so a fresh clone runs with nothing but
    # `pip install -r requirements.txt`; point it at Postgres+pgvector for a
    # real deployment -- app.database and app.services.vector_store branch on
    # the URL scheme alone, no other code change is needed.
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")

    # Comma-separated browser origins the API accepts requests from (CORS).
    # Empty by default, which app.main falls back from to the Vite dev server
    # origins (http://localhost:5173, http://127.0.0.1:5173) so local
    # development keeps working unchanged.
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "")

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
