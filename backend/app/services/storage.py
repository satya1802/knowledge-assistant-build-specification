"""Shared helper for where uploaded documents' original bytes live on disk.

Pulled out of `app.routers.documents` so `app.services.ingestion.pipeline`
(which runs off the request thread, in a background task) can locate the same
file without importing a router module.
"""

from pathlib import Path

from app.config import settings


def storage_dir() -> Path:
    path = Path(settings.DOCUMENT_STORAGE_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path
