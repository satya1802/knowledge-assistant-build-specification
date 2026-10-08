"""Text extraction for PDF, DOCX, TXT and MD source documents.

Pure library module: no FastAPI, no database access, no HTTP, no status
writes. `extract_document` is the single entry point the ingestion pipeline
(US-009-1) calls; everything else here is an implementation detail.

Page numbers are preserved so a later citation can point at the page a chunk
came from (AC-032): PDF pages extract one `ExtractedPage` per page, with its
1-based page number. DOCX, TXT and MD have no native page concept, so their
`ExtractedPage.page_number` is `None` -- chunking still carries that `None`
through untouched.
"""

from dataclasses import dataclass
from pathlib import Path

from docx import Document as DocxDocument
from docx.table import Table
from docx.text.paragraph import Paragraph
from pypdf import PdfReader
from pypdf.errors import PdfReadError


class ExtractionError(Exception):
    """Raised when a source document cannot be read.

    `reason` is a short, human-readable string suitable for display directly
    in the UI (e.g. "This PDF is password-protected and cannot be read.") --
    never a raw library traceback or internal exception repr.
    """

    def __init__(self, reason: str) -> None:
        self.reason = reason
        super().__init__(reason)


@dataclass(frozen=True)
class ExtractedPage:
    """One unit of extracted text. `page_number` is 1-based for PDFs, and
    `None` for formats with no native page concept (DOCX, TXT, MD)."""

    page_number: int | None
    text: str


def extract_document(path: Path, file_type: str) -> list[ExtractedPage]:
    """Extract text from `path`, a file of kind `file_type`.

    `file_type` is the lower-cased extension without the leading dot (e.g.
    "pdf", "docx", "txt", "md") -- matching `Document.file_type` in
    `app/models.py`. Raises `ExtractionError` for any unreadable input:
    corrupt, password-protected, or undecodable.
    """
    normalized = (file_type or "").lower().lstrip(".")
    if normalized == "pdf":
        return _extract_pdf(path)
    if normalized == "docx":
        return _extract_docx(path)
    if normalized in ("txt", "md"):
        return _extract_plain_text(path)

    raise ExtractionError(f"Unsupported file type: {file_type}")


def _extract_pdf(path: Path) -> list[ExtractedPage]:
    try:
        reader = PdfReader(str(path))
    except PdfReadError as exc:
        raise ExtractionError("This PDF is corrupt and could not be read.") from exc
    except FileNotFoundError as exc:
        raise ExtractionError("The file could not be found.") from exc
    except Exception as exc:  # noqa: BLE001 -- any other pypdf failure is unreadable input
        raise ExtractionError("This PDF could not be read.") from exc

    if reader.is_encrypted:
        # pypdf can sometimes decrypt with an empty password; try that before
        # giving up, since some "encrypted" PDFs have no real password.
        try:
            if reader.decrypt("") == 0:
                raise ExtractionError(
                    "This PDF is password-protected and could not be read."
                )
        except Exception as exc:  # noqa: BLE001
            raise ExtractionError(
                "This PDF is password-protected and could not be read."
            ) from exc

    try:
        pages: list[ExtractedPage] = []
        for index, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            pages.append(ExtractedPage(page_number=index, text=text))
    except Exception as exc:  # noqa: BLE001 -- unreadable page content
        raise ExtractionError("This PDF could not be read.") from exc

    return pages


def _iter_block_items(docx_document: DocxDocument) -> list[Paragraph | Table]:
    """Yield paragraphs and tables in document order.

    `python-docx` exposes `.paragraphs` and `.tables` separately, each losing
    the original interleaving -- walking the body's XML children directly is
    the only way to recover document order (AC-033).
    """
    from docx.oxml.table import CT_Tbl
    from docx.oxml.text.paragraph import CT_P

    body = docx_document.element.body
    items: list[Paragraph | Table] = []
    for child in body.iterchildren():
        if isinstance(child, CT_P):
            items.append(Paragraph(child, docx_document))
        elif isinstance(child, CT_Tbl):
            items.append(Table(child, docx_document))
    return items


def _extract_docx(path: Path) -> list[ExtractedPage]:
    try:
        document = DocxDocument(str(path))
    except Exception as exc:  # noqa: BLE001 -- any failure to open is unreadable input
        raise ExtractionError("This DOCX file could not be read.") from exc

    try:
        parts: list[str] = []
        for item in _iter_block_items(document):
            if isinstance(item, Paragraph):
                if item.text.strip():
                    parts.append(item.text)
            elif isinstance(item, Table):
                for row in item.rows:
                    for cell in row.cells:
                        if cell.text.strip():
                            parts.append(cell.text)
    except Exception as exc:  # noqa: BLE001
        raise ExtractionError("This DOCX file could not be read.") from exc

    text = "\n".join(parts)
    return [ExtractedPage(page_number=None, text=text)]


def _extract_plain_text(path: Path) -> list[ExtractedPage]:
    try:
        raw = path.read_bytes()
    except FileNotFoundError as exc:
        raise ExtractionError("The file could not be found.") from exc

    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ExtractionError(
            "This file is not valid UTF-8 text and could not be read."
        ) from exc

    return [ExtractedPage(page_number=None, text=text)]
