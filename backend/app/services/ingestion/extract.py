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

import logging
from dataclasses import dataclass
from pathlib import Path

from docx import Document as DocxDocument
from docx.table import Table
from docx.text.paragraph import Paragraph
from pypdf import PdfReader
from pypdf.errors import PdfReadError

logger = logging.getLogger(__name__)

# Local OCR for scanned PDF pages (KNOW9BAE95-22-2): both the PDF renderer
# and the Tesseract wrapper are optional imports. Neither Tesseract nor its
# Python bindings are a hard dependency -- a deployment missing either must
# still start and ingest text-bearing documents normally; only scanned pages
# are affected (AC-037).
try:
    import pypdfium2 as _pdfium
except ImportError:  # pragma: no cover - exercised by a deployment without the renderer
    _pdfium = None

try:
    import pytesseract as _pytesseract
except ImportError:  # pragma: no cover - exercised by a deployment without Tesseract
    _pytesseract = None

# A pypdf page whose extracted text is shorter than this (after stripping
# whitespace) is treated as a scanned image rather than real text (AC-035).
_OCR_MIN_CHARS = 20


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
    `None` for formats with no native page concept (DOCX, TXT, MD).

    `ocr_unavailable` is set (text left empty) when a PDF page was detected
    as a scanned image (AC-035) but could not be OCR'd because Tesseract
    and/or the PDF renderer are not installed (AC-037) -- the pipeline
    reads this flag to record a readable `Document.status_reason` note
    without failing the whole document.
    """

    page_number: int | None
    text: str
    ocr_unavailable: bool = False


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
                raise ExtractionError("This PDF is password-protected and could not be read.")
        except Exception as exc:  # noqa: BLE001
            raise ExtractionError("This PDF is password-protected and could not be read.") from exc

    ocr_ready = _ocr_runtime_available()

    try:
        pages: list[ExtractedPage] = []
        for index, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if len(text.strip()) >= _OCR_MIN_CHARS:
                pages.append(ExtractedPage(page_number=index, text=text))
                continue

            # Almost no text: treat as a scanned page (AC-035).
            if not ocr_ready:
                pages.append(ExtractedPage(page_number=index, text="", ocr_unavailable=True))
                continue

            ocr_text = _ocr_page_text(path, index)
            if ocr_text is None:
                pages.append(ExtractedPage(page_number=index, text="", ocr_unavailable=True))
            else:
                pages.append(ExtractedPage(page_number=index, text=ocr_text))
    except Exception as exc:  # noqa: BLE001 -- unreadable page content
        raise ExtractionError("This PDF could not be read.") from exc

    return pages


def _ocr_runtime_available() -> bool:
    """Whether both the PDF renderer and a working Tesseract install are
    present. Checked once per document rather than cached at import time, so
    a deployment that installs Tesseract later does not need a restart."""
    if _pdfium is None or _pytesseract is None:
        return False
    try:
        _pytesseract.get_tesseract_version()
    except Exception:  # noqa: BLE001 -- any probe failure means "not available"
        return False
    return True


def _ocr_page_text(path: Path, page_number: int) -> str | None:
    """Render `page_number` (1-based) of the PDF at `path` to an image and
    recognise its text with Tesseract (English). Returns `None` on any
    failure -- rendering or recognition errors degrade the page to "skipped",
    never a crash or a raised traceback (AC-037)."""
    try:
        pdf = _pdfium.PdfDocument(str(path))
        try:
            page = pdf[page_number - 1]
            bitmap = page.render(scale=2.0)
            image = bitmap.to_pil()
        finally:
            pdf.close()
        return _pytesseract.image_to_string(image, lang="eng")
    except Exception:  # noqa: BLE001 -- OCR failure degrades to "skipped", not a crash
        logger.warning("OCR failed for page %s of %s", page_number, path, exc_info=True)
        return None


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
        raise ExtractionError("This file is not valid UTF-8 text and could not be read.") from exc

    return [ExtractedPage(page_number=None, text=text)]
