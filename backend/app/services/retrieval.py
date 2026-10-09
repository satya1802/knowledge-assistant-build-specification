"""Retrieval: embeds a question through the configured provider and ranks
`DocumentChunk`s by cosine similarity (AC-056, KNOW9BAE95-26-1).

`top_k` and `threshold` are server-side settings (`app.config.Settings`),
never a request parameter -- no caller of `retrieve()` can widen or narrow
either (AC-056). Cosine similarity itself is computed inside
`app.services.vector_store` (Python on SQLite, pgvector operators on
Postgres); this module never branches on `DATABASE_URL`.
"""

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.config import settings
from app.services.llm import get_provider
from app.services.vector_store import get_vector_store


@dataclass(frozen=True)
class RetrievedChunk:
    """One ranked chunk, with everything chat needs to cite it."""

    chunk_id: str
    document_id: str
    filename: str
    page_number: int | None
    text: str
    score: float


def retrieve(
    db: Session,
    question: str,
    *,
    top_k: int = settings.RETRIEVAL_TOP_K,
    threshold: float = settings.RETRIEVAL_MIN_SCORE,
) -> list[RetrievedChunk]:
    """Return at most `top_k` chunks scoring at or above `threshold`,
    ordered by score descending (AC-056).

    Embeds `question` through the configured provider, then asks the
    selected vector store to rank every chunk with a persisted embedding
    against it. A chunk with no embedding is skipped by the store, never a
    crash here.
    """
    provider = get_provider()
    [query_embedding] = provider.embed([question])

    store = get_vector_store()
    matches = store.search_similar_chunks(db, query_embedding, top_k=top_k, threshold=threshold)

    return [
        RetrievedChunk(
            chunk_id=chunk.id,
            document_id=chunk.document_id,
            filename=chunk.document.filename,
            page_number=chunk.page_number,
            text=chunk.text,
            score=score,
        )
        for chunk, score in matches
    ]
