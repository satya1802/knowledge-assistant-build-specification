"""Embedding storage backend selector.

Two backends share one small interface: a SQLite-backed one for local
development and a pgvector-backed one for Postgres. Which one is live is
decided purely by `DATABASE_URL`'s scheme -- nothing else in the codebase
ever has to know or branch on it (AC-103). Ingestion (see
`app.services.ingestion.pipeline`) calls `store.set_chunk_embedding` on each
new `DocumentChunk` row; retrieval reads it back with
`store.get_chunk_embedding`. Both go through `get_vector_store()`, so neither
caller ever branches on `DATABASE_URL` itself (contract, KNOW9BAE95-22-1).

The dialect-specific part of "how" an embedding is physically stored lives in
`EmbeddingType` below, a `TypeDecorator` used for `DocumentChunk.embedding` in
`app/models.py`: a pgvector `vector(768)` column on Postgres, plain JSON on
SQLite. That dispatch is on the SQLAlchemy *dialect*, not on `DATABASE_URL`,
and it is the column's concern, not a caller's.
"""

import math
from typing import TYPE_CHECKING, Protocol

from pgvector.sqlalchemy import Vector
from sqlalchemy import JSON
from sqlalchemy.orm import Session
from sqlalchemy.types import Text, TypeDecorator

from app.database import DATABASE_URL
from app.services.llm.base import EMBEDDING_DIM

if TYPE_CHECKING:
    from app.models import DocumentChunk

_POSTGRES_SCHEMES = ("postgres://", "postgresql://", "postgresql+")


def is_pgvector_backend(database_url: str | None = None) -> bool:
    """True when `database_url` (default: the configured DATABASE_URL) names Postgres.

    Any `postgres://` or `postgresql[+driver]://` scheme selects pgvector;
    everything else (sqlite, an empty/unset value) falls back to the local
    SQLite-backed store.
    """
    url = database_url if database_url is not None else DATABASE_URL
    return url.startswith(_POSTGRES_SCHEMES)


class EmbeddingType(TypeDecorator):
    """A 768-dimension embedding column: `vector(768)` on Postgres (pgvector),
    a JSON array of floats on SQLite. Used only for `DocumentChunk.embedding`.
    """

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):  # noqa: ANN001, ANN201 -- SQLAlchemy signature
        if dialect.name == "postgresql":
            return dialect.type_descriptor(Vector(EMBEDDING_DIM))
        return dialect.type_descriptor(JSON())

    def process_bind_param(self, value, dialect):  # noqa: ANN001, ANN201
        if value is None:
            return None
        return [float(v) for v in value]

    def process_result_value(self, value, dialect):  # noqa: ANN001, ANN201
        # pgvector's own result processor can hand back a numpy array here;
        # an explicit None check (never `value or []`) plus iterating it into
        # a plain list is what keeps every caller downstream dealing with an
        # ordinary list[float], regardless of backend (AC-042).
        if value is None:
            return None
        return [float(v) for v in value]


class VectorStore(Protocol):
    """The storage interface both backends satisfy."""

    backend_name: str

    def set_chunk_embedding(self, chunk: "DocumentChunk", embedding: list[float]) -> None:
        """Persist `embedding` (768 floats) onto `chunk`, in memory; the
        caller is responsible for adding/committing `chunk` to a session."""
        ...

    def get_chunk_embedding(self, chunk: "DocumentChunk") -> list[float] | None:
        """Return `chunk`'s embedding as a plain `list[float]`, or `None` if
        it has none. Always an explicit `None`/length check, never a
        truthiness expression -- a pgvector-backed chunk can hand back a
        numpy array, whose `bool()` raises rather than answering "empty"
        (AC-042)."""
        ...

    def search_similar_chunks(
        self,
        db: Session,
        query_embedding: list[float],
        *,
        top_k: int,
        threshold: float,
    ) -> list[tuple["DocumentChunk", float]]:
        """Return at most `top_k` `(chunk, cosine_similarity)` pairs scoring
        at or above `threshold`, ordered by score descending (AC-056). A
        chunk with no embedding is skipped, never a crash (KNOW9BAE95-26-1).
        Selected by backend here -- the caller (`app.services.retrieval`)
        never branches on `DATABASE_URL` itself.
        """
        ...


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _read_embedding(chunk: "DocumentChunk") -> list[float] | None:
    embedding = chunk.embedding
    if embedding is None or len(embedding) == 0:
        return None
    return [float(v) for v in embedding]


class SQLiteVectorStore:
    """Local backend: embeddings live in a JSON column, via `EmbeddingType`."""

    backend_name = "sqlite"

    def set_chunk_embedding(self, chunk: "DocumentChunk", embedding: list[float]) -> None:
        chunk.embedding = [float(v) for v in embedding]

    def get_chunk_embedding(self, chunk: "DocumentChunk") -> list[float] | None:
        return _read_embedding(chunk)

    def search_similar_chunks(
        self,
        db: Session,
        query_embedding: list[float],
        *,
        top_k: int,
        threshold: float,
    ) -> list[tuple["DocumentChunk", float]]:
        from app.models import DocumentChunk

        candidates = db.query(DocumentChunk).filter(DocumentChunk.embedding.isnot(None)).all()
        scored: list[tuple[DocumentChunk, float]] = []
        for chunk in candidates:
            embedding = _read_embedding(chunk)
            if embedding is None or len(embedding) != len(query_embedding):
                # No usable vector to compare against -- skipped, never a
                # crash (KNOW9BAE95-26-1).
                continue
            score = _cosine_similarity(query_embedding, embedding)
            if score >= threshold:
                scored.append((chunk, score))

        scored.sort(key=lambda pair: pair[1], reverse=True)
        return scored[:top_k]


class PgVectorStore:
    """Postgres backend: embeddings live in a pgvector column, via
    `EmbeddingType`."""

    backend_name = "pgvector"

    def set_chunk_embedding(self, chunk: "DocumentChunk", embedding: list[float]) -> None:
        chunk.embedding = [float(v) for v in embedding]

    def get_chunk_embedding(self, chunk: "DocumentChunk") -> list[float] | None:
        return _read_embedding(chunk)

    def search_similar_chunks(
        self,
        db: Session,
        query_embedding: list[float],
        *,
        top_k: int,
        threshold: float,
    ) -> list[tuple["DocumentChunk", float]]:
        # pgvector's cosine_distance is 1 - cosine_similarity; both the
        # threshold filter and the ordering are pushed down to the database
        # rather than pulling every row into Python (unlike the SQLite
        # backend above, which has no such operator to push down to).
        from app.models import DocumentChunk

        distance = DocumentChunk.embedding.cosine_distance(query_embedding)
        similarity = (1 - distance).label("score")
        rows = (
            db.query(DocumentChunk, similarity)
            .filter(DocumentChunk.embedding.isnot(None))
            .filter(similarity >= threshold)
            .order_by(distance)
            .limit(top_k)
            .all()
        )
        return [(chunk, float(score)) for chunk, score in rows]


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
