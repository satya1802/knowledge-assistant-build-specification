"""KNOW9BAE95-22-2: OCR surfaced through the ingestion pipeline.

Exercises `run_ingestion` end-to-end against a real (tiny) PDF on disk,
monkeypatching only the OCR availability probe in `app.services.ingestion.
extract` -- never the pipeline itself -- so these tests prove the contract:
`extract_document()`'s OCR pages flow into chunking/embedding as normal, and
an OCR-unavailable note lands in `Document.status_reason` without the
document ever failing or an exception escaping `run_ingestion`.
"""

import uuid
from pathlib import Path

import pytest
from pypdf import PdfWriter

from app.database import SessionLocal
from app.models import Document, DocumentChunk
from app.services.ingestion import extract as extract_module
from app.services.ingestion.pipeline import run_ingestion
from app.services.storage import storage_dir


def _make_two_page_pdf(path: Path) -> None:
    """Page 1 has no extractable text (a "scan"); page 2 is a real blank
    page too -- pypdf extracts no text from either, so both pages are
    treated as scanned (AC-035), keeping this test independent of any real
    PDF text-content-stream construction."""
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.add_blank_page(width=200, height=200)
    with open(path, "wb") as fh:
        writer.write(fh)


def _create_document(filename: str, file_type: str) -> Document:
    stored_filename = f"{uuid.uuid4().hex}.{file_type}"
    db = SessionLocal()
    try:
        document = Document(
            filename=filename,
            stored_filename=stored_filename,
            content_type="application/pdf",
            file_type=file_type,
            size_bytes=0,
            status="processing",
        )
        db.add(document)
        db.commit()
        db.refresh(document)
        return document
    finally:
        db.close()


def test_run_ingestion_all_pages_skipped_still_reaches_ready_with_readable_reason(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Every page skipped for missing OCR: a terminal status ("ready"), zero
    chunks, and a readable `status_reason` -- never an unhandled exception."""
    monkeypatch.setattr(extract_module, "_ocr_runtime_available", lambda: False)

    document = _create_document("scan.pdf", "pdf")
    _make_two_page_pdf(storage_dir() / document.stored_filename)

    run_ingestion(document.id)

    db = SessionLocal()
    try:
        refreshed = db.get(Document, document.id)
        assert refreshed.status == "ready"
        assert refreshed.chunk_count == 0
        assert refreshed.status_reason is not None
        assert "traceback" not in refreshed.status_reason.lower()
        assert "exception" not in refreshed.status_reason.lower()
        assert "OCR" in refreshed.status_reason
        assert "1" in refreshed.status_reason and "2" in refreshed.status_reason
        assert db.query(DocumentChunk).filter_by(document_id=document.id).count() == 0
    finally:
        db.close()


def test_run_ingestion_ocr_derived_chunks_persist_document_id_and_page_number(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """AC-036: OCR-recognised text is chunked and persisted with its
    document id and 1-based page number, ready to back a numbered citation."""
    monkeypatch.setattr(extract_module, "_ocr_runtime_available", lambda: True)
    monkeypatch.setattr(
        extract_module,
        "_ocr_page_text",
        lambda path, page_number: f"Recognised text for page {page_number}",
    )

    document = _create_document("scan.pdf", "pdf")
    _make_two_page_pdf(storage_dir() / document.stored_filename)

    run_ingestion(document.id)

    db = SessionLocal()
    try:
        refreshed = db.get(Document, document.id)
        assert refreshed.status == "ready"
        assert refreshed.status_reason is None
        assert refreshed.chunk_count == 2

        chunks = (
            db.query(DocumentChunk)
            .filter_by(document_id=document.id)
            .order_by(DocumentChunk.ordinal)
            .all()
        )
        assert [c.page_number for c in chunks] == [1, 2]
        assert all(c.document_id == document.id for c in chunks)
        assert "page 1" in chunks[0].text
        assert "page 2" in chunks[1].text
    finally:
        db.close()


def test_run_ingestion_mixed_text_and_scanned_pages_ingests_text_pages_normally(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """AC-037: a document with both readable and scanned pages still ingests
    its text-bearing pages when OCR is unavailable -- only the scanned page
    is skipped, with a note, not the whole document."""
    from app.services.ingestion.extract import ExtractedPage

    import app.services.ingestion.pipeline as pipeline_module

    monkeypatch.setattr(
        pipeline_module,
        "extract_document",
        lambda path, file_type: [
            ExtractedPage(page_number=1, text="Readable text on page one, plenty of it here."),
            ExtractedPage(page_number=2, text="", ocr_unavailable=True),
        ],
    )

    document = _create_document("mixed.pdf", "pdf")
    (storage_dir() / document.stored_filename).write_bytes(b"irrelevant: extract is mocked")

    run_ingestion(document.id)

    db = SessionLocal()
    try:
        refreshed = db.get(Document, document.id)
        assert refreshed.status == "ready"
        assert refreshed.chunk_count == 1
        assert refreshed.status_reason is not None
        assert "2" in refreshed.status_reason

        chunks = db.query(DocumentChunk).filter_by(document_id=document.id).all()
        assert len(chunks) == 1
        assert chunks[0].page_number == 1
    finally:
        db.close()
