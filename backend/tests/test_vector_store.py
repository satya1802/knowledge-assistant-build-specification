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


class _FakeChunk:
    """Stands in for a DocumentChunk: just needs an `.embedding` attribute."""

    def __init__(self, embedding=None) -> None:
        self.embedding = embedding


class _NumpyLikeArray:
    """Mimics the one property that matters: `bool()` on a multi-element
    array raises, so AC-042's explicit None/length check is what must be
    used, never `embedding or []`."""

    def __init__(self, values: list[float]) -> None:
        self._values = values

    def __len__(self) -> int:
        return len(self._values)

    def __iter__(self):
        return iter(self._values)

    def __bool__(self):  # pragma: no cover -- exercised only if code regresses
        raise ValueError("truth value of an array with more than one element is ambiguous")


def test_sqlite_store_set_and_get_chunk_embedding_round_trips() -> None:
    store = SQLiteVectorStore()
    chunk = _FakeChunk()
    embedding = [0.1] * 768

    store.set_chunk_embedding(chunk, embedding)

    assert store.get_chunk_embedding(chunk) == embedding


def test_vector_store_get_chunk_embedding_handles_none_explicitly() -> None:
    for store in (SQLiteVectorStore(), PgVectorStore()):
        assert store.get_chunk_embedding(_FakeChunk(embedding=None)) is None


def test_vector_store_get_chunk_embedding_handles_numpy_like_array() -> None:
    """AC-042: a pgvector-style array-like value must not be tested for
    truthiness -- only an explicit None/length check."""
    values = [0.5] * 768
    chunk = _FakeChunk(embedding=_NumpyLikeArray(values))

    result = PgVectorStore().get_chunk_embedding(chunk)

    assert result == values
    assert isinstance(result, list)


def test_vector_store_get_chunk_embedding_handles_empty_numpy_like_array() -> None:
    chunk = _FakeChunk(embedding=_NumpyLikeArray([]))

    assert PgVectorStore().get_chunk_embedding(chunk) is None
