"""Chunking: splits extracted page text into fixed-size, overlapping chunks.

Pure library module: no FastAPI, no database access, no HTTP, no provider
calls. Deterministic for a given input -- same `pages` in, same chunk count
and boundaries out -- so callers (and tests) can assert chunk counts without
flakiness.

KNOW9BAE95-22-1 replaces the previous greedy-paragraph packer with a sliding
1,000/150 character window (AC-038): each chunk is up to `_CHUNK_SIZE`
characters, and consecutive chunks share `_OVERLAP` characters so a sentence
split across a chunk boundary still appears whole in at least one chunk. A
natural break (paragraph or sentence boundary) is only honoured within the
*second half* of the window (AC-039) -- i.e. never before half the target
size has been consumed -- so chunk count stays close to `len(text) / 850`
(the window size minus the overlap) and a run of many tiny chunks is never
produced the way an early, over-eager break would cause.
"""

from dataclasses import dataclass

from app.services.ingestion.extract import ExtractedPage

# Target chunk size and inter-chunk overlap, in characters (AC-038).
# Deliberately simple character counts, not tokens: chunking has no
# dependency on a tokenizer this way, and stays deterministic and fast.
_CHUNK_SIZE = 1000
_OVERLAP = 150

# A natural break is only searched for from the midpoint of the window
# onward (AC-039): `window_start` below is `start + _MIN_CHUNK_SIZE`.
_MIN_CHUNK_SIZE = _CHUNK_SIZE // 2

# Checked longest-match-first within the allowed window: a paragraph break
# beats a sentence break, which beats a bare newline.
_SENTENCE_BREAKS = (". ", "! ", "? ", ".\n", "!\n", "?\n")


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

    Each page's text is split independently (overlap never crosses a page
    boundary) by a sliding 1,000/150 character window. A page that produces
    no text (blank page, empty file) contributes no chunk. The whole function
    is a pure, deterministic transform of its input.
    """
    chunks: list[Chunk] = []
    ordinal = 0

    for page in pages:
        for chunk_text in _split_text(page.text):
            chunks.append(Chunk(text=chunk_text, page_number=page.page_number, ordinal=ordinal))
            ordinal += 1

    return chunks


def _split_text(text: str) -> list[str]:
    """Split one page/section's text into overlapping `_CHUNK_SIZE`-ish
    pieces (AC-038/AC-039). See module docstring for the break-point rule."""
    if not text or not text.strip():
        return []

    length = len(text)
    pieces: list[str] = []
    start = 0

    while start < length:
        end = min(start + _CHUNK_SIZE, length)

        if end < length:
            window_start = start + _MIN_CHUNK_SIZE
            natural_break = _find_natural_break(text, window_start, end)
            if natural_break is not None and natural_break > start:
                end = natural_break

        piece = text[start:end].strip()
        if piece:
            pieces.append(piece)

        if end >= length:
            break

        # Advance by at least one character so a degenerate window (e.g. a
        # break found right at window_start) can never loop forever.
        start = max(end - _OVERLAP, start + 1)

    return pieces


def _find_natural_break(text: str, window_start: int, window_end: int) -> int | None:
    """Return the offset of the latest natural break inside
    `text[window_start:window_end]`, or `None` if there is none.

    Only ever called with `window_start` at the midpoint of the current
    window (AC-039) -- never earlier -- so a break is never taken before half
    the target chunk size has been consumed.
    """
    if window_end <= window_start:
        return None

    region = text[window_start:window_end]

    paragraph_idx = region.rfind("\n\n")
    if paragraph_idx != -1:
        return window_start + paragraph_idx + 2

    best_pos = -1
    best_len = 0
    for sep in _SENTENCE_BREAKS:
        pos = region.rfind(sep)
        if pos > best_pos:
            best_pos = pos
            best_len = len(sep)
    if best_pos != -1:
        return window_start + best_pos + best_len

    newline_idx = region.rfind("\n")
    if newline_idx != -1:
        return window_start + newline_idx + 1

    return None
