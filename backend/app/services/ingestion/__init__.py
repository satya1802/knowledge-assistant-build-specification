"""Document ingestion: text extraction and chunking.

Pure library code -- no FastAPI, no database access, no HTTP. The ingestion
pipeline (US-009-1) imports and calls these functions; this package does not
import anything from `app.routers` or `app.database`.
"""
