"""LLM provider: one interface, two implementations, selected by config.

`get_provider()` is the only thing ingestion, retrieval and chat should ever
import from this package. Which concrete provider it returns is decided once,
here, from `settings.GEMINI_OFFLINE` -- callers never branch on offline mode
themselves (contract for KNOW9BAE95-37-1).
"""

from app.config import settings
from app.services.llm.base import EMBEDDING_DIM, LLMProvider, LLMProviderError
from app.services.llm.gemini_provider import GeminiProvider
from app.services.llm.stub_provider import StubProvider

__all__ = ["EMBEDDING_DIM", "LLMProvider", "LLMProviderError", "get_provider"]

_provider: LLMProvider | None = None


def get_provider() -> LLMProvider:
    """Return the process-wide provider instance, created on first use."""
    global _provider
    if _provider is None:
        _provider = StubProvider() if settings.GEMINI_OFFLINE else GeminiProvider()
    return _provider
