"""Engine, session factory and the request-scoped session dependency.

SQLite by default so a fresh clone runs with nothing but `pip install -r
requirements.txt` -- the approved architecture may name Postgres or MySQL, but
naming one is not the same as having one, and a scaffold that cannot start
without a database server is a scaffold nobody runs. Point `DATABASE_URL` at
the real thing when it exists; nothing else has to change.
"""

from collections.abc import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

# Kept as a module-level name for anything importing `app.database.DATABASE_URL`
# directly; app.config.settings.DATABASE_URL is the single source of truth.
DATABASE_URL = settings.DATABASE_URL

# SQLite rejects a connection made on one thread and used on another, which is
# exactly what happens when FastAPI runs a sync dependency in its threadpool.
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
_IS_POSTGRES = DATABASE_URL.startswith(("postgres://", "postgresql://", "postgresql+"))

engine = create_engine(DATABASE_URL, connect_args=_connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

if _IS_POSTGRES:
    # Additive, idempotent: enables the `vector` type/operators pgvector-backed
    # embedding storage needs (AC-103). A no-op on every start after the first.
    with engine.connect() as _conn:
        _conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        _conn.commit()


class Base(DeclarativeBase):
    """Declarative base that every generated model inherits."""


def get_db() -> Iterator[Session]:
    """One session per request, closed even when the handler raises."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
