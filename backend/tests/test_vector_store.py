"""Storage-backend selector (AC-103): DATABASE_URL's scheme alone decides
whether embedding storage goes through SQLite or pgvector."""

from app.services.vector_store import (
    PgVectorStore,
    SQLiteVectorStore,
    get_vector_store,
    is_pgvector_backend,
    reset_vector_store,
)


def test_is_pgvector_backend_detects_postgres_schemes() -> None:
    assert is_pgvector_backend("postgresql://u:p@h/db")
    assert is_pgvector_backend("postgresql+psycopg://u:p@h/db")
    assert is_pgvector_backend("postgres://u:p@h/db")


def test_is_pgvector_backend_rejects_non_postgres_schemes() -> None:
    assert not is_pgvector_backend("sqlite:///./app.db")
    assert not is_pgvector_backend("")


def test_get_vector_store_selects_sqlite_by_default(monkeypatch) -> None:
    reset_vector_store()
    monkeypatch.setattr("app.services.vector_store.DATABASE_URL", "sqlite:///./app.db")

    store = get_vector_store()

    assert isinstance(store, SQLiteVectorStore)
    assert store.backend_name == "sqlite"
    reset_vector_store()


def test_get_vector_store_selects_pgvector_for_postgres_url(monkeypatch) -> None:
    reset_vector_store()
    monkeypatch.setattr("app.services.vector_store.DATABASE_URL", "postgresql://u:p@h/db")

    store = get_vector_store()

    assert isinstance(store, PgVectorStore)
    assert store.backend_name == "pgvector"
    reset_vector_store()


def test_get_vector_store_caches_the_selected_instance(monkeypatch) -> None:
    reset_vector_store()
    monkeypatch.setattr("app.services.vector_store.DATABASE_URL", "sqlite:///./app.db")

    first = get_vector_store()
    second = get_vector_store()

    assert first is second
    reset_vector_store()
