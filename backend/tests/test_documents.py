"""KNOW9BAE95-18-1: document upload, listing, download, admin-only writes."""

import io
import uuid

from fastapi.testclient import TestClient

from app.database import SessionLocal
from app.main import app
from app.models import Document, User
from app.routers.auth import _hash_password

_PASSWORD = "a-strong-test-password-123"


def _make_user(role: str) -> tuple[str, str]:
    email = f"{uuid.uuid4().hex}@example.com"
    db = SessionLocal()
    try:
        user = User(email=email, password_hash=_hash_password(_PASSWORD), role=role, is_enabled=True)
        db.add(user)
        db.commit()
    finally:
        db.close()
    return email, _PASSWORD


def _logged_in_client(role: str) -> TestClient:
    email, password = _make_user(role)
    client = TestClient(app)
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200
    return client


def admin_client() -> TestClient:
    return _logged_in_client("admin")


def employee_client() -> TestClient:
    return _logged_in_client("employee")


def test_upload_pdf_creates_processing_document_and_is_listed() -> None:
    """AC-023."""
    client = admin_client()
    files = {"file": ("report.pdf", io.BytesIO(b"%PDF-1.4 fake pdf body"), "application/pdf")}

    upload = client.post("/documents", files=files)

    assert upload.status_code == 201
    body = upload.json()
    assert body["filename"] == "report.pdf"
    assert body["file_type"] == "pdf"
    assert body["status"] == "processing"
    assert body["size_bytes"] == len(b"%PDF-1.4 fake pdf body")
    assert "id" in body and "uploaded_at" in body and "uploaded_by" in body

    listing = client.get("/documents")
    assert listing.status_code == 200
    ids = [doc["id"] for doc in listing.json()]
    assert body["id"] in ids


def test_upload_rejects_unsupported_format_before_any_processing() -> None:
    """AC-024: no record and no stored file for a disallowed format."""
    client = admin_client()
    files = {"file": ("virus.exe", io.BytesIO(b"not a real document"), "application/x-msdownload")}

    response = client.post("/documents", files=files)

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "PDF" in detail and "DOCX" in detail and "TXT" in detail and "MD" in detail

    db = SessionLocal()
    try:
        count = db.query(Document).filter(Document.filename == "virus.exe").count()
    finally:
        db.close()
    assert count == 0


def test_upload_rejects_file_over_25mb_without_creating_a_record() -> None:
    """AC-025."""
    client = admin_client()
    oversized = b"a" * (25 * 1024 * 1024 + 1)
    files = {"file": ("big.txt", io.BytesIO(oversized), "text/plain")}

    response = client.post("/documents", files=files)

    assert response.status_code == 400
    assert "25 MB" in response.json()["detail"]

    db = SessionLocal()
    try:
        count = db.query(Document).filter(Document.filename == "big.txt").count()
    finally:
        db.close()
    assert count == 0


def test_duplicate_filename_creates_a_separate_document_row() -> None:
    """AC-026."""
    client = admin_client()
    content = b"plain text notes"
    files = {"file": ("notes.txt", io.BytesIO(content), "text/plain")}

    first = client.post("/documents", files=files)
    second = client.post(
        "/documents",
        files={"file": ("notes.txt", io.BytesIO(content), "text/plain")},
    )

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] != second.json()["id"]

    first_download = client.get(f"/documents/{first.json()['id']}/download")
    second_download = client.get(f"/documents/{second.json()['id']}/download")
    assert first_download.status_code == 200
    assert second_download.status_code == 200
    assert first_download.content == content
    assert second_download.content == content


def test_non_admin_forbidden_for_upload_and_delete_but_not_reads() -> None:
    """AC-027."""
    admin = admin_client()
    employee = employee_client()

    files = {"file": ("shared.md", io.BytesIO(b"# heading"), "text/markdown")}
    created = admin.post("/documents", files=files)
    assert created.status_code == 201
    document_id = created.json()["id"]

    forbidden_upload = employee.post(
        "/documents",
        files={"file": ("another.md", io.BytesIO(b"# other"), "text/markdown")},
    )
    assert forbidden_upload.status_code == 403

    forbidden_delete = employee.delete(f"/documents/{document_id}")
    assert forbidden_delete.status_code == 403

    listing = employee.get("/documents")
    assert listing.status_code == 200

    download = employee.get(f"/documents/{document_id}/download")
    assert download.status_code == 200


def test_download_streams_original_filename_and_content_type() -> None:
    client = admin_client()
    files = {"file": ("quarterly.pdf", io.BytesIO(b"%PDF-1.4 content"), "application/pdf")}
    created = client.post("/documents", files=files)
    document_id = created.json()["id"]

    response = client.get(f"/documents/{document_id}/download")

    assert response.status_code == 200
    assert response.content == b"%PDF-1.4 content"
    assert "quarterly.pdf" in response.headers.get("content-disposition", "")
    assert response.headers.get("content-type", "").startswith("application/pdf")


def test_admin_can_delete_a_document() -> None:
    client = admin_client()
    files = {"file": ("to-delete.txt", io.BytesIO(b"temp"), "text/plain")}
    created = client.post("/documents", files=files)
    document_id = created.json()["id"]

    response = client.delete(f"/documents/{document_id}")

    assert response.status_code == 204
    follow_up = client.get(f"/documents/{document_id}/download")
    assert follow_up.status_code == 404
