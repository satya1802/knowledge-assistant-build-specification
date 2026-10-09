"""Application entrypoint.

Generated from the approved architecture: one router per component that owns
endpoints, one route per endpoint the API spec declares. Every generated route
is a stub that returns a typed placeholder, so the service starts, serves its
OpenAPI document and passes its tests before a single handler is implemented.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app import models  # noqa: F401 -- imported so the tables register before create_all
from app.database import Base, engine
from app.routers import account, auth, chat, documents, users
from app.services.vector_store import is_pgvector_backend

_DESCRIPTION = (
    "Knowledge Assistant: an enterprise RAG chatbot that answers employees' "
    "questions from a shared company knowledge base, citing its sources. "
    "Stack: FastAPI (Python 3.12) + SQLAlchemy, SQLite locally / Postgres + "
    "pgvector in production; React + TypeScript + Vite + Tailwind; Google "
    "Gemini; Tesseract OCR. One command starts everything locally."
)

app = FastAPI(
    title="Knowledge Assistant · Build specification",
    description=_DESCRIPTION,
    version="0.1.0",
)

# The SPA runs on a different origin than the API, so the browser refuses its calls
# unless that origin is allowed here. In development that is the Vite dev server; when
# deployed, the platform injects the frontend's real URL as ALLOWED_ORIGINS (comma
# separated). Point ALLOWED_ORIGINS at the real thing and nothing else has to change.
_dev_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
_allowed_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins or _dev_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# The scaffold ships no migrations, so the tables are created from the models on
# startup. Replace this with Alembic before anything holds data worth keeping.
Base.metadata.create_all(bind=engine)

# `create_all` only ever creates missing *tables* -- it never alters one that
# already exists. US-009-1 adds two columns to a `documents` table that may
# already have rows from before this ticket, so they are added by hand here,
# additively and idempotently (never a rename or drop), the first time either
# is missing.
_inspector = inspect(engine)
if "documents" in _inspector.get_table_names():
    _existing_columns = {c["name"] for c in _inspector.get_columns("documents")}
    with engine.begin() as _conn:
        if "status_reason" not in _existing_columns:
            _conn.execute(text("ALTER TABLE documents ADD COLUMN status_reason VARCHAR(500)"))
        if "chunk_count" not in _existing_columns:
            _conn.execute(
                text("ALTER TABLE documents ADD COLUMN chunk_count INTEGER NOT NULL DEFAULT 0")
            )

# KNOW9BAE95-22-1: same additive pattern for document_chunks.embedding, a
# 768-dimension Gemini embedding -- a pgvector `vector(768)` column on
# Postgres, a plain JSON column on SQLite (app.services.vector_store.
# EmbeddingType already encodes that distinction; only the raw ALTER TABLE
# syntax differs here, since SQLAlchemy's reflection runs before the column
# exists).
if "document_chunks" in _inspector.get_table_names():
    _chunk_columns = {c["name"] for c in _inspector.get_columns("document_chunks")}
    if "embedding" not in _chunk_columns:
        with engine.begin() as _conn:
            if is_pgvector_backend():
                _conn.execute(text("ALTER TABLE document_chunks ADD COLUMN embedding vector(768)"))
            else:
                _conn.execute(text("ALTER TABLE document_chunks ADD COLUMN embedding TEXT"))

app.include_router(auth.router)
app.include_router(account.router)
app.include_router(users.router)
app.include_router(documents.router)
app.include_router(chat.router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe, and the only route here that is not a stub."""
    return {"status": "ok"}
