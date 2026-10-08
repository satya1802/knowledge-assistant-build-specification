"""Embedding storage backend selector.

Two backends share one small interface: a SQLite-backed one for local
development and a pgvector-backed one for Postgres. Which one is live is
decided purely by `DATABASE_URL`'s scheme -- nothing else in the codebase
ever has to know or branch on it (AC-103). No ingestion or retrieval logic
lives here: this ticket (KNOW9BAE95-40-1) only wires configuration, the
extension and this selector; a later ticket fills in embed/upsert/search.
"""

from typing import Protocol

from app.database import DATABASE_URL

_POSTGRES_SCHEMES = ("postgres://", "postgresql://", "postgresql+")


def is_pgvector_backend(database_url: str | None = None) -> bool:
    """True when `database_url` (default: the configured DATABASE_URL) names Postgres.

    Any `postgres://` or `postgresql[+driver]://` scheme selects pgvector;
    everything else (sqlite, an empty/unset value) falls back to the local
    SQLite-backed store.
    """
    url = database_url if database_url is not None else DATABASE_URL
    return url.startswith(_POSTGRES_SCHEMES)


class VectorStore(Protocol):
    """The storage interface both backends satisfy."""

    backend_name: str


class SQLiteVectorStore:
    """Local backend: embeddings live in ordinary SQLite columns, similarity
    computed in Python. Scaffold only -- no ingestion/retrieval logic yet."""

    backend_name = "sqlite"


class PgVectorStore:
    """Postgres backend: embeddings live in a pgvector column, similarity
    computed via the `vector` extension's operators. Scaffold only -- no
    ingestion/retrieval logic yet."""

    backend_name = "pgvector"


_store: VectorStore | None = None


def get_vector_store() -> VectorStore:
    """Return the process-wide vector store, selected by DATABASE_URL's scheme."""
    global _store
    if _store is None:
        _store = PgVectorStore() if is_pgvector_backend() else SQLiteVectorStore()
    return _store


def reset_vector_store() -> None:
    """Test-only: clear the cached singleton so a changed DATABASE_URL re-selects."""
    global _store
    _store = None
