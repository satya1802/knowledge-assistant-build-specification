"""US-009-1: runs extraction, chunking and embedding for one document, and
writes the resulting status.

Called as a FastAPI `BackgroundTask` (a worker thread via `run_in_threadpool`)
from `app.routers.documents.upload_document` -- never awaited inline, so
`POST /documents` returns 201 immediately (AC-028). Always opens its own
database session: the request's session is closed (and may belong to a
different thread) long before this runs.

KNOW9BAE95-26-1: each chunk's embedding is now persisted via
`app.services.vector_store.get_vector_store()` so retrieval has vectors to
search. Embedding goes through `app.services.ingestion.embedding.embed_chunks`
(batching + bounded rate-limit retry, AC-040/AC-041/AC-096) rather than a
second ad hoc retry loop here. A `QuotaExhaustedError` -- never retried -- is
mapped to a readable `status_reason` so the document fails cleanly instead of
staying "processing" (AC-095).
"""

import logging

from app.database import SessionLocal
from app.models import Document, DocumentChunk
from app.services.ingestion.chunking import chunk_pages
from app.services.ingestion.embedding import embed_chunks
from app.services.ingestion.events import broker
from app.services.ingestion.extract import ExtractionError, extract_document
from app.services.llm import get_provider
from app.services.llm.base import QuotaExhaustedError
from app.services.storage import storage_dir
from app.services.vector_store import get_vector_store

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
        except QuotaExhaustedError as exc:
            # Already a short, redacted, readable message (AC-095) -- never
            # retried (AC-096), so the document fails immediately rather
            # than staying "processing" while retries burn time.
            _mark_failed(db, document_id, str(exc))
        except Exception:  # noqa: BLE001 -- any other failure must not crash the worker
            logger.exception("Ingestion failed for document %s", document_id)
            _mark_failed(db, document_id, _GENERIC_FAILURE_REASON)
    finally:
        db.close()

    broker.publish(document_id)


def _ingest(db, document: Document) -> None:  # noqa: ANN001 -- Session, kept local to this module
    file_path = storage_dir() / document.stored_filename
    pages = extract_document(file_path, document.file_type)
    ocr_note = _ocr_unavailable_note(pages)
    chunks = chunk_pages(pages)

    embeddings: list[list[float]] = []
    if chunks:
        embeddings = embed_chunks(get_provider(), [chunk.text for chunk in chunks])

    db.query(DocumentChunk).filter(DocumentChunk.document_id == document.id).delete()

    store = get_vector_store()
    for chunk, embedding in zip(chunks, embeddings, strict=True):
        chunk_row = DocumentChunk(
            document_id=document.id,
            ordinal=chunk.ordinal,
            page_number=chunk.page_number,
            text=chunk.text,
        )
        store.set_chunk_embedding(chunk_row, embedding)
        db.add(chunk_row)

    # Ingestion always reaches a terminal status (AC-037): a document whose
    # pages were all skipped for missing OCR still lands here as "ready",
    # with zero chunks and a readable note, rather than "failed" or an
    # unhandled exception.
    document.status = "ready"
    document.status_reason = ocr_note
    document.chunk_count = len(chunks)
    db.add(document)
    db.commit()


def _ocr_unavailable_note(pages: list) -> str | None:  # noqa: ANN001 -- list[ExtractedPage]
    """A short, human-readable note (never a traceback) listing the 1-based
    page numbers that were skipped because local OCR was unavailable
    (AC-037), or `None` when every page was read normally."""
    skipped_pages = sorted(
        {page.page_number for page in pages if getattr(page, "ocr_unavailable", False)} - {None}
    )
    if not skipped_pages:
        return None

    pages_label = ", ".join(str(number) for number in skipped_pages)
    plural = len(skipped_pages) > 1
    return (
        "OCR is not available in this environment (Tesseract was not found), so "
        f"scanned page{'s' if plural else ''} {pages_label} could not be read and "
        f"{'were' if plural else 'was'} skipped. Other pages were processed normally."
    )


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
