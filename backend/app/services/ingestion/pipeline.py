"""US-009-1: runs extraction, chunking and embedding for one document, and
writes the resulting status.

Called as a FastAPI `BackgroundTask` (a worker thread via `run_in_threadpool`)
from `app.routers.documents.upload_document` -- never awaited inline, so
`POST /documents` returns 201 immediately (AC-028). Always opens its own
database session: the request's session is closed (and may belong to a
different thread) long before this runs.
"""

import logging

from app.database import SessionLocal
from app.models import Document, DocumentChunk
from app.services.ingestion.chunking import chunk_pages
from app.services.ingestion.events import broker
from app.services.ingestion.extract import ExtractionError, extract_document
from app.services.llm import get_provider
from app.services.storage import storage_dir

logger = logging.getLogger(__name__)

_GENERIC_FAILURE_REASON = "This document could not be processed."


def run_ingestion(document_id: str) -> None:
    """Extract, chunk and embed `document_id`; set status to ready or failed.

    Independent per call (AC-031): a failure here only ever touches this one
    document's row and chunks, never raises back to the caller, and never
    blocks or affects any other document's ingestion.
    """
    db = SessionLocal()
    try:
        document = db.get(Document, document_id)
        if document is None:
            return

        try:
            _ingest(db, document)
        except ExtractionError as exc:
            _mark_failed(db, document_id, exc.reason)
        except Exception:  # noqa: BLE001 -- any other failure must not crash the worker
            logger.exception("Ingestion failed for document %s", document_id)
            _mark_failed(db, document_id, _GENERIC_FAILURE_REASON)
    finally:
        db.close()

    broker.publish(document_id)


def _ingest(db, document: Document) -> None:  # noqa: ANN001 -- Session, kept local to this module
    file_path = storage_dir() / document.stored_filename
    pages = extract_document(file_path, document.file_type)
    chunks = chunk_pages(pages)

    # Stub-acceptable embedding step (constraint): a real provider call that
    # can fail like any other I/O, even though this ticket does not persist
    # the resulting vectors.
    if chunks:
        get_provider().embed([chunk.text for chunk in chunks])

    db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()
    for chunk in chunks:
        db.add(
            DocumentChunk(
                document_id=document.id,
                ordinal=chunk.ordinal,
                page_number=chunk.page_number,
                text=chunk.text,
            )
        )

    document.status = "ready"
    document.status_reason = None
    document.chunk_count = len(chunks)
    db.add(document)
    db.commit()


def _mark_failed(db, document_id: str, reason: str) -> None:  # noqa: ANN001
    db.rollback()
    document = db.get(Document, document_id)
    if document is None:
        return
    # No chunks must remain persisted or retrievable for a failed document
    # (AC-030), even if some were written before the failure was detected.
    db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).delete()
    document.status = "failed"
    document.status_reason = reason
    document.chunk_count = 0
    db.add(document)
    db.commit()
