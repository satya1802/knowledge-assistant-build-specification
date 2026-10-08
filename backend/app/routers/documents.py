"""Document upload, listing and original-file download (KNOW9BAE95-18-1).

Originals are written to `settings.DOCUMENT_STORAGE_DIR` under a generated,
collision-safe name; the row keeps the uploader's original filename for
display and for the download response. Text extraction, chunking and
embedding are out of scope this sprint: every row is created, and stays, at
status "processing". Writes (`POST`, `DELETE`) require
`app.services.authz.require_admin`; reads (`GET`) are open to any signed-in
user.
"""

import mimetypes
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select

from app.config import settings
from app.models import Document
from app.routers.auth import CurrentUser, DbSession
from app.schemas import DocumentOut
from app.services.authz import AdminUser

router = APIRouter(prefix="/documents", tags=["documents"])

# AC-024: the only formats accepted. Keyed by lower-cased file extension;
# each maps to the content types a browser/client may reasonably send for it.
# A generic/empty content type is tolerated -- the extension is authoritative
# when the client does not know better -- but a content type that names a
# *different* format is rejected even if the extension looks fine.
_ALLOWED_FORMATS: dict[str, set[str]] = {
    ".pdf": {"application/pdf"},
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    ".txt": {"text/plain"},
    ".md": {"text/markdown", "text/x-markdown", "text/plain"},
}
_ACCEPTED_FORMATS_MESSAGE = "Accepted formats: PDF, DOCX, TXT, MD"
_GENERIC_CONTENT_TYPES = {"", "application/octet-stream", "binary/octet-stream"}

# AC-025. Enforced by counting bytes as they stream to disk, never by
# buffering the whole upload in memory first.
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
_CHUNK_SIZE = 1024 * 1024


def _storage_dir() -> Path:
    path = Path(settings.DOCUMENT_STORAGE_DIR)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _validate_format(filename: str, content_type: str | None) -> str:
    """Return the lower-cased extension, or raise 400 (AC-024)."""
    ext = Path(filename).suffix.lower()
    allowed_content_types = _ALLOWED_FORMATS.get(ext)
    if allowed_content_types is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. {_ACCEPTED_FORMATS_MESSAGE}",
        )

    normalized_ct = (content_type or "").split(";")[0].strip().lower()
    if normalized_ct not in _GENERIC_CONTENT_TYPES and normalized_ct not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. {_ACCEPTED_FORMATS_MESSAGE}",
        )

    return ext


@router.get("", response_model=list[DocumentOut])
def list_documents(current_user: CurrentUser, db: DbSession) -> list[Document]:
    return list(db.scalars(select(Document).order_by(Document.uploaded_at.desc())).all())


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    admin: AdminUser,
    db: DbSession,
    file: UploadFile = File(...),
) -> Document:
    original_filename = file.filename or ""
    ext = _validate_format(original_filename, file.content_type)

    stored_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = _storage_dir() / stored_filename

    size_bytes = 0
    exceeded = False
    try:
        with open(dest_path, "wb") as out:
            while True:
                chunk = await file.read(_CHUNK_SIZE)
                if not chunk:
                    break
                size_bytes += len(chunk)
                if size_bytes > MAX_UPLOAD_BYTES:
                    exceeded = True
                    break
                out.write(chunk)
    finally:
        await file.close()

    if exceeded:
        dest_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds the 25 MB size limit",
        )

    content_type = file.content_type or mimetypes.guess_type(original_filename)[0] or (
        "application/octet-stream"
    )

    document = Document(
        filename=original_filename,
        stored_filename=stored_filename,
        content_type=content_type,
        file_type=ext.lstrip("."),
        size_bytes=size_bytes,
        status="processing",
        uploaded_by=admin.id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    current_user: CurrentUser,
    db: DbSession,
) -> FileResponse:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    file_path = _storage_dir() / document.stored_filename
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return FileResponse(
        path=file_path,
        filename=document.filename,
        media_type=document.content_type,
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: str,
    admin: AdminUser,
    db: DbSession,
) -> None:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    file_path = _storage_dir() / document.stored_filename
    file_path.unlink(missing_ok=True)

    db.delete(document)
    db.commit()
