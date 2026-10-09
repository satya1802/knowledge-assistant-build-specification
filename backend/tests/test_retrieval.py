"""KNOW9BAE95-26-1: retrieval service (AC-056).

Each test gets its own isolated, in-memory SQLite database (rather than the
shared on-disk `app.db` other tests use) so similarity assertions are never
polluted by chunks another test happens to have persisted.
"""

import uuid

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Document, DocumentChunk  # noqa: F401 -- registers the tables
from app.services.llm.stub_provider import StubProvider
from app.services.retrieval import retrieve
from app.services.vector_store import get_vector_store


def _isolated_session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()


def _make_document(db, *, filename="policy.pdf") -> Document:
    document = Document(
        filename=filename,
        stored_filename=f"{uuid.uuid4().hex}.pdf",
        content_type="application/pdf",
        file_type="pdf",
        size_bytes=10,
        status="ready",
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def _add_chunk(db, document, *, text, page_number, embedding) -> DocumentChunk:
    store = get_vector_store()
    chunk = DocumentChunk(
        document_id=document.id,
        ordinal=0,
        page_number=page_number,
        text=text,
    )
    if embedding is not None:
        store.set_chunk_embedding(chunk, embedding)
    db.add(chunk)
    db.commit()
    db.refresh(chunk)
    return chunk


def test_retrieve_ranks_by_cosine_similarity_and_respects_top_k() -> None:
    db = _isolated_session()
    document = _make_document(db)
    provider = StubProvider()

    question_embedding = provider.embed(["what is the vacation policy?"])[0]

    exact = _add_chunk(
        db, document, text="exact match chunk", page_number=1, embedding=question_embedding
    )
    _add_chunk(db, document, text="totally unrelated", page_number=2, embedding=[1.0] + [0.0] * 767)

    results = retrieve(db, "what is the vacation policy?", top_k=5, threshold=0.0)

    assert results[0].chunk_id == exact.id
    assert results[0].score >= results[-1].score
    assert results[0].filename == "policy.pdf"
    assert results[0].page_number == 1
    assert results[0].text == "exact match chunk"
    assert len(results) <= 5


def test_retrieve_excludes_chunks_below_threshold() -> None:
    db = _isolated_session()
    document = _make_document(db)
    _add_chunk(db, document, text="irrelevant", page_number=1, embedding=[1.0] + [0.0] * 767)

    results = retrieve(db, "anything", top_k=5, threshold=0.99)

    assert results == []


def test_retrieve_caps_results_at_top_k() -> None:
    db = _isolated_session()
    document = _make_document(db)
    for i in range(10):
        _add_chunk(db, document, text=f"chunk {i}", page_number=i, embedding=[0.1] * 768)

    results = retrieve(db, "chunk", top_k=3, threshold=-1.0)

    assert len(results) == 3


def test_retrieve_skips_chunks_with_no_embedding_without_crashing() -> None:
    db = _isolated_session()
    document = _make_document(db)
    _add_chunk(db, document, text="no embedding here", page_number=1, embedding=None)
    _add_chunk(db, document, text="has embedding", page_number=2, embedding=[0.2] * 768)

    results = retrieve(db, "anything", top_k=5, threshold=-1.0)

    assert len(results) == 1
    assert results[0].text == "has embedding"


def test_retrieve_default_top_k_and_threshold_come_from_settings() -> None:
    import inspect

    from app.config import settings
    from app.services.retrieval import retrieve as retrieve_fn

    sig = inspect.signature(retrieve_fn)
    assert sig.parameters["top_k"].default == settings.RETRIEVAL_TOP_K
    assert sig.parameters["threshold"].default == settings.RETRIEVAL_MIN_SCORE
