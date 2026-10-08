# Knowledge Assistant — backend

## Prerequisites

- Python 3.12
- Node.js (for the frontend dev server; see `frontend/package.json`)
- Optional: Docker + Docker Compose, only if you want Postgres/pgvector instead of SQLite

## One command, local start (AC-101)

```
cd backend
pip install -r requirements.txt       # first time only
cd ../frontend && npm install && cd ../backend   # first time only
cp .env.example .env                  # then fill in GEMINI_API_KEY, or set GEMINI_OFFLINE=1
make dev
```

`make dev` starts the FastAPI backend on `http://localhost:8000`, the Vite
frontend on `http://localhost:5173`, and creates/migrates the local SQLite
schema automatically (the existing `Base.metadata.create_all` path in
`app/main.py`) -- no separate migration step. The frontend's Sign in page is
then reachable at `http://localhost:5173`.

If `backend/.env` does not exist yet, the command exits immediately with a
readable error instead of starting half the system:

```
error: .../backend/.env is missing.
Copy backend/.env.example to backend/.env and fill it in (or set GEMINI_OFFLINE=1
to run without a real Gemini key), then re-run 'make dev' from backend/.
```

## Stopping

Press `Ctrl+C`: the script stops both the backend and the frontend it
started. If you also started Postgres via `make db-up` (below), stop it
separately with `make db-down`.

## Environment variables (`backend/.env`)

See `.env.example` for the full list and comments. The ones this ticket
wires end-to-end:

- `DATABASE_URL` -- defaults to a local SQLite file (`sqlite:///./app.db`).
  Point it at a Postgres URL with pgvector installed, e.g.
  `postgresql://knowledge:knowledge@localhost:5432/knowledge`, to switch
  embedding storage and similarity search to pgvector. No code change is
  needed: the scheme alone selects the backend
  (`app/services/vector_store.py`), and the `vector` extension is created
  automatically on startup against a Postgres database (`app/database.py`).
- `SESSION_COOKIE_SECURE` -- `0` by default, so sign-in over plain
  `http://localhost` works in current Safari and Chrome. Set to `1` behind
  a real https deployment.
- `ALLOWED_ORIGINS` -- comma-separated browser origins the API accepts
  requests from. Left unset locally, which defaults to the Vite dev server
  origins (`http://localhost:5173`, `http://127.0.0.1:5173`).
- `GEMINI_API_KEY`, `GEMINI_OFFLINE`, `GEMINI_EMBEDDING_MODEL`,
  `GEMINI_ANSWER_MODEL` -- see `.env.example`; set `GEMINI_OFFLINE=1` to run
  fully offline against the deterministic local stub provider.

## Optional: Postgres + pgvector instead of SQLite

```
make db-up                 # starts a local Postgres with pgvector via docker compose
```

Then set, in `backend/.env`:

```
DATABASE_URL=postgresql://knowledge:knowledge@localhost:5432/knowledge
```

and run `make dev` as above -- embedding storage and similarity search now
go through pgvector, driven only by this environment variable. Docker is
never required for the default SQLite path.

Stop the database with `make db-down`.
