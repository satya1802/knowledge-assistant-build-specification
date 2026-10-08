"""Chunking: splits extracted page text into fixed-size, citeable chunks.

Pure library module: no FastAPI, no database access, no HTTP. Deterministic
for a given input -- same `pages` in, same chunk count and boundaries out --
so callers (and tests) can assert chunk counts without flakiness.
"""

from dataclasses import dataclass

from app.services.ingestion.extract import ExtractedPage

# Target chunk size in characters. Deliberately simple (character count, not
# tokens) so chunking has no dependency on a tokenizer and stays deterministic
# and fast. Small enough to keep a chunk's embedding meaningfully specific,
# large enough to avoid one word per chunk.
_CHUNK_SIZE = 1000


@dataclass(frozen=True)
class Chunk:
    """One chunk of text, attributable to a page (or `None` when the source
    format has no page concept) and its position in the overall sequence."""

    text: str
    page_number: int | None
    ordinal: int


def chunk_pages(pages: list[ExtractedPage]) -> list[Chunk]:
    """Split `pages` into `Chunk`s, preserving each chunk's originating page
    number and assigning a document-wide, zero-based `ordinal`.

    A page's text is split on paragraph boundaries first, then packed
    greedily into chunks up to `_CHUNK_SIZE` characters so a chunk never
    splits a word. A page that produces no text (blank page, empty file)
    contributes no chunk. The whole function is a pure, deterministic
    transform of its input.
    """
    chunks: list[Chunk] = []
    ordinal = 0

    for page in pages:
        for chunk_text in _split_text(page.text):
            chunks.append(Chunk(text=chunk_text, page_number=page.page_number, ordinal=ordinal))
            ordinal += 1

    return chunks


def _split_text(text: str) -> list[str]:
    """Split one page/section's text into `_CHUNK_SIZE`-ish pieces.

    Paragraphs (split on blank lines) are packed greedily; a paragraph
    longer than `_CHUNK_SIZE` on its own is further split on whitespace so no
    single chunk silently exceeds the target by an unbounded amount.
    """
    paragraphs = [p.strip() for p in text.split("\n\n")]
    paragraphs = [p for p in paragraphs if p]

    if not paragraphs:
        return []

    pieces: list[str] = []
    for paragraph in paragraphs:
        if len(paragraph) <= _CHUNK_SIZE:
            pieces.append(paragraph)
        else:
            pieces.extend(_split_long_paragraph(paragraph))

    chunks: list[str] = []
    current = ""
    for piece in pieces:
        if not current:
            current = piece
        elif len(current) + 2 + len(piece) <= _CHUNK_SIZE:
            current = f"{current}\n\n{piece}"
        else:
            chunks.append(current)
            current = piece
    if current:
        chunks.append(current)

    return chunks


def _split_long_paragraph(paragraph: str) -> list[str]:
    words = paragraph.split()
    pieces: list[str] = []
    current = ""
    for word in words:
        if not current:
            current = word
        elif len(current) + 1 + len(word) <= _CHUNK_SIZE:
            current = f"{current} {word}"
        else:
            pieces.append(current)
            current = word
    if current:
        pieces.append(current)
    return pieces
