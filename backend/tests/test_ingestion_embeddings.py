"""KNOW9BAE95-26-1: ingestion persists chunk embeddings, and maps an
exhausted-quota failure to a readable, terminal document status (AC-095).

Uses its own isolated, in-memory SQLite database (`pipeline_module.SessionLocal`
is monkeypatched to it) rather than the shared on-disk `app.db`, so a rerun
never collides on a previous run's rows.
"""

import uuid

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models import Document, DocumentChunk
from app.services.ingestion import pipeline as pipeline_module
from app.services.llm.stub_provider import StubProvider
from app.services.storage import storage_dir
from app.services.vector_store import get_vector_store


def _isolated_session_factory():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def _upload_txt(session_local, *, text: str) -> str:
    stored_filename = f"{uuid.uuid4().hex}.txt"
    path = storage_dir() / stored_filename
    path.write_text(text, encoding="utf-8")

    db = session_local()
    try:
        document = Document(
            filename="doc.txt",
            stored_filename=stored_filename,
            content_type="text/plain",
            file_type="txt",
            size_bytes=len(text),
            status="processing",
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        return document.id
    finally:
        db.close()


def test_run_ingestion_persists_chunk_embeddings(monkeypatch) -> None:
    session_local = _isolated_session_factory()
    monkeypatch.setattr(pipeline_module, "SessionLocal", session_local)

    document_id = _upload_txt(session_local, text="Hello world, this is a short document.")

    pipeline_module.run_ingestion(document_id)

    db = session_local()
    try:
        refreshed = db.get(Document, document_id)
        assert refreshed.status == "ready"
        assert refreshed.chunk_count >= 1

        store = get_vector_store()
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).all()
        assert len(chunks) == refreshed.chunk_count
        for chunk in chunks:
            embedding = store.get_chunk_embedding(chunk)
            assert embedding is not None
            assert len(embedding) == 768
    finally:
        db.close()


def test_run_ingestion_quota_exhausted_fails_document_with_readable_reason(monkeypatch) -> None:
    session_local = _isolated_session_factory()
    monkeypatch.setattr(pipeline_module, "SessionLocal", session_local)
    monkeypatch.setattr(
        pipeline_module, "get_provider", lambda: StubProvider(fail_mode="quota_exhausted")
    )

    document_id = _upload_txt(session_local, text="Some content that will fail to embed.")

    pipeline_module.run_ingestion(document_id)

    db = session_local()
    try:
        refreshed = db.get(Document, document_id)
        assert refreshed.status == "failed"
        assert refreshed.chunk_count == 0
        assert refreshed.status_reason
        assert "traceback" not in refreshed.status_reason.lower()

        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).all()
        assert chunks == []
    finally:
        db.close()
