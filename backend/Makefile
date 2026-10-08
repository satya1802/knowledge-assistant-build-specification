# One documented command to run the whole system locally (AC-101).
#
#   make dev        starts backend + frontend + local SQLite database
#   make db-up      (optional) starts a local Postgres+pgvector via docker compose
#   make db-down    stops that optional Postgres container
#
# See README.md in this directory for the full walkthrough.

.PHONY: dev db-up db-down

dev:
	@bash scripts/dev.sh

db-up:
	docker compose up -d db

db-down:
	docker compose down
