"""Environment-driven application settings.

Deliberately plain `os.getenv` reads rather than `pydantic-settings`: that
package is not an approved dependency, and the handful of settings this
service needs do not warrant adding one. KNOW9BAE95-37-1 extends this module
afterwards -- add new settings here, do not rewrite what already exists.
"""

import os


def _as_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


class Settings:
    """Process-wide settings, read once at import time."""

    # The cookie that carries the session id. HttpOnly and SameSite=Lax always;
    # Secure is environment-driven so local http://localhost still works while
    # a real deployment behind https can turn it on.
    SESSION_COOKIE_NAME: str = os.getenv("SESSION_COOKIE_NAME", "session_id")
    SESSION_COOKIE_SECURE: bool = _as_bool(os.getenv("SESSION_COOKIE_SECURE"), default=False)
    SESSION_TTL_SECONDS: int = int(os.getenv("SESSION_TTL_SECONDS", str(60 * 60 * 24 * 7)))


settings = Settings()
