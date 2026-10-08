#!/usr/bin/env bash
# One documented command (AC-101): starts the FastAPI backend, the Vite
# frontend and the local SQLite database (schema created via the existing
# create_all path) together. Fails fast and readably if backend/.env is
# missing, rather than starting half the system.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$(cd "$BACKEND_DIR/../frontend" && pwd)"
ENV_FILE="$BACKEND_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "error: $ENV_FILE is missing." >&2
  echo "Copy backend/.env.example to backend/.env and fill it in (or set GEMINI_OFFLINE=1" >&2
  echo "to run without a real Gemini key), then re-run 'make dev' from backend/." >&2
  exit 1
fi

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "Stopping..."
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Starting backend (FastAPI on http://localhost:8000)..."
( cd "$BACKEND_DIR" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload ) &
BACKEND_PID=$!

echo "Starting frontend (Vite on http://localhost:5173)..."
( cd "$FRONTEND_DIR" && npm run dev ) &
FRONTEND_PID=$!

wait -n "$BACKEND_PID" "$FRONTEND_PID"
