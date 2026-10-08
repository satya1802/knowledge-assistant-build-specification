"""Application entrypoint.

Generated from the approved architecture: one router per component that owns
endpoints, one route per endpoint the API spec declares. Every generated route
is a stub that returns a typed placeholder, so the service starts, serves its
OpenAPI document and passes its tests before a single handler is implemented.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401 -- imported so the tables register before create_all
from app.database import Base, engine

app = FastAPI(
    title="Knowledge Assistant \u00b7 Build specification",
    description="Knowledge Assistant \u00b7 Build specification Page 1 Knowledge Assistant Build \"Knowledge Assistant\": an enterprise RAG chatbot that answers employees' questions from a shared company knowledge base, citing its sources. Stack FastAPI (Python 3.12) + SQLAlchemy, SQLite locally / Postgres + pgvector in production; React + TypeScript + Vite + Tailwind; Google Gemini; Tesseract OCR. One command starts everything locally. Features \u007f Sign-in: \u2013 Email + password; create account (admins can turn this off); change password. \u2013 Passwords hashed with bcrypt; HTTP-only session cookie. Make its Secure flag a setting, off for local http. \u2013 5 failed sign-ins in 15 minutes locks that email for 15 minutes; one generic error for wrong email or password. \u2013 The first account is the admin. Admins manage users: add, disable, make/remove admin, reset password. \u007f Knowledge base: \u2013 Upload PDF, DOCX, TXT, MD (up to 25 MB), shared with everyone, processed in the background. \u2013 Status: processing / ready / failed with a readable reason; the page updates live. \u2013 Stat tiles, an upload dropzone, and a document table with search, filters, download and delete. \u007f Reading files: \u2013 PDF text with pypdf; DOCX paragraphs AND tables. \u2013 A PDF page with almost no text is treated as a scan and read with local Tesseract OCR. The app still works if Tesseract isn't installed. \u007f Chunking: about 1,000 characters with 150 overlap, breaking only in the second half of each window, so chunk counts stay sensible. \u007f Chat: \u2013 Search the documents first (Gemini embeddings, 768 dimensions; cosine similarity threshold 0.62). \u2013 Stream the answer live, with numbered source chips that open a side panel. \u2013 If nothing matches, answer from general knowledge with a \"not from your documents\" badge. \u2013 Copy, read aloud, regenerate and stop. \u2013 Private chat history grouped by date, with search and delete. \u007f Gemini: \u2013 Key in a gitignored backend/.env, never logged; models configurable (Flash-Lite for answers). \u2013 First words in about 2",
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


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe, and the only route here that is not a stub."""
    return {"status": "ok"}
