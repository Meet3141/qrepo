"""
Provider abstraction. QRepo business logic depends on AIProvider only; SDK-specific code
lives in concrete implementations (e.g. app.ai.gemini.GeminiProvider).
"""
import logging
import random
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Callable, Optional, TypeVar
from app.ai.exceptions import AIException
from app.ai.prompts.base import BuiltPrompt

logger = logging.getLogger("qrepo.ai")

T = TypeVar("T")


@dataclass(frozen=True)
class ProviderResponse:
    """Raw structured output from a provider. Not trusted until validated by the service."""
    raw_json: str
    provider: str
    model: str
    latency_ms: int
    attempts: int


@dataclass(frozen=True)
class ProviderHealth:
    available: bool
    provider: str
    model: str
    latency_ms: Optional[int] = None
    error_category: Optional[str] = None


class AIProvider(ABC):
    name: str
    model: str

    @abstractmethod
    def generate_questions(self, prompt: BuiltPrompt) -> ProviderResponse:
        """Return the provider's structured JSON output or raise an AIException subclass."""

    @abstractmethod
    def health_check(self) -> ProviderHealth:
        """Cheap connectivity/credential check. Must not raise."""


@dataclass(frozen=True)
class RetryPolicy:
    max_retries: int = 2
    base_delay: float = 1.0
    max_delay: float = 8.0

    def delay_for(self, retry_number: int) -> float:
        # Exponential backoff with full jitter, bounded by max_delay
        ceiling = min(self.max_delay, self.base_delay * (2 ** (retry_number - 1)))
        return random.uniform(0, ceiling) if ceiling > 0 else 0.0


def call_with_retry(
    operation: Callable[[], T],
    policy: RetryPolicy,
    *,
    sleep: Callable[[float], None] = time.sleep,
    on_attempt: Optional[Callable[[int], None]] = None,
) -> T:
    """
    Run `operation`, retrying only AIExceptions marked retryable (429, 408, 5xx, network/timeouts).
    Non-retryable errors (400/401/403, invalid key, bad output) propagate immediately.
    """
    attempt = 0
    while True:
        attempt += 1
        if on_attempt:
            on_attempt(attempt)
        try:
            return operation()
        except AIException as exc:
            retries_used = attempt - 1
            if not exc.retryable or retries_used >= policy.max_retries:
                raise
            delay = policy.delay_for(attempt)
            logger.warning(
                "AI provider transient failure (category=%s, attempt=%d); retrying in %.2fs",
                exc.category.value, attempt, delay,
            )
            sleep(delay)
