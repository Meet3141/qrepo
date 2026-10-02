import copy
import logging
import time
from typing import Any, Callable, Dict, Optional
import httpx
from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types

from app.ai.config import AISettings
from app.ai.exceptions import (
    AIException,
    AIConfigurationError,
    AIAuthenticationError,
    AIRateLimitError,
    AITimeoutError,
    AIProviderError,
    AIOutputValidationError,
)
from app.ai.prompts.base import BuiltPrompt
from app.ai.provider import AIProvider, ProviderResponse, ProviderHealth, RetryPolicy, call_with_retry
from app.ai.schemas import GeneratedQuestionBatch

logger = logging.getLogger("qrepo.ai")

_BAD_KEY_MARKERS = ("api key not valid", "api_key_invalid", "invalid api key")
# Finish reasons that mean the model did not produce a usable, complete answer
_BLOCKED_FINISH_REASONS = {"SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT", "SPII", "OTHER"}


def map_provider_error(exc: Exception) -> AIException:
    """Translate an SDK/transport exception into QRepo's AI error model."""
    if isinstance(exc, AIException):
        return exc

    if isinstance(exc, genai_errors.APIError):
        code = exc.code or 0
        status = (exc.status or "").upper()
        message = (exc.message or "").lower()
        detail = f"Gemini API error {code} {status}"

        if code in (401, 403) or status in ("UNAUTHENTICATED", "PERMISSION_DENIED") \
                or any(m in message for m in _BAD_KEY_MARKERS):
            return AIAuthenticationError(detail)
        if code == 429 or status == "RESOURCE_EXHAUSTED":
            return AIRateLimitError(detail)
        if code in (408, 504) or status == "DEADLINE_EXCEEDED":
            return AITimeoutError(detail)
        if code == 404:
            # Almost always a misconfigured GEMINI_MODEL
            return AIConfigurationError(f"{detail} (check GEMINI_MODEL)")
        if code >= 500:
            return AIProviderError(detail, retryable=True)
        return AIProviderError(detail, retryable=False)  # 400 / other 4xx: invalid request

    if isinstance(exc, httpx.TimeoutException):
        return AITimeoutError(f"Transport timeout: {type(exc).__name__}")
    if isinstance(exc, httpx.TransportError):
        return AIProviderError(f"Network error: {type(exc).__name__}", retryable=True)

    return AIProviderError(f"Unexpected provider error: {type(exc).__name__}", retryable=False)


def _strip_additional_properties(schema: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively remove 'additionalProperties' from a JSON schema dict.
    Pydantic v2 with extra='forbid' emits additionalProperties:false, which the
    Gemini API rejects with INVALID_ARGUMENT 400.
    """
    def _recurse(obj: Any) -> None:
        if isinstance(obj, dict):
            obj.pop("additionalProperties", None)
            for v in obj.values():
                _recurse(v)
        elif isinstance(obj, list):
            for item in obj:
                _recurse(item)

    result = copy.deepcopy(schema)
    _recurse(result)
    return result


class GeminiProvider(AIProvider):
    name = "gemini"

    def __init__(
        self,
        settings: AISettings,
        client: Optional[genai.Client] = None,
        sleep: Callable[[float], None] = time.sleep,
    ):
        api_key = settings.GEMINI_API_KEY.get_secret_value().strip() if settings.GEMINI_API_KEY else ""
        model = (settings.GEMINI_MODEL or "").strip()
        if not api_key:
            raise AIConfigurationError("GEMINI_API_KEY is not set")
        if not model:
            raise AIConfigurationError("GEMINI_MODEL is not set")

        self.model = model
        self.temperature = settings.GEMINI_TEMPERATURE
        self.max_output_tokens = settings.GEMINI_MAX_OUTPUT_TOKENS
        self.retry_policy = RetryPolicy(
            max_retries=settings.GEMINI_MAX_RETRIES,
            base_delay=settings.GEMINI_RETRY_BASE_DELAY_SECONDS,
            max_delay=settings.GEMINI_RETRY_MAX_DELAY_SECONDS,
        )
        self._sleep = sleep
        self._client = client or genai.Client(
            api_key=api_key,
            http_options=genai_types.HttpOptions(
                timeout=int(settings.GEMINI_TIMEOUT_SECONDS * 1000),  # SDK expects milliseconds
                # Disable SDK-level retries; retries are owned by call_with_retry so they stay bounded
                retry_options=genai_types.HttpRetryOptions(attempts=1),
            ),
        )

    def __repr__(self) -> str:
        return f"GeminiProvider(model={self.model!r})"

    def _generation_config(self, prompt: BuiltPrompt) -> genai_types.GenerateContentConfig:
        return genai_types.GenerateContentConfig(
            system_instruction=prompt.system_instruction,
            temperature=self.temperature,
            max_output_tokens=self.max_output_tokens,
            candidate_count=1,
            response_mime_type="application/json",
            response_schema=GeneratedQuestionBatch,
        )

    def _generate_once(self, prompt: BuiltPrompt) -> str:
        try:
            response = self._client.models.generate_content(
                model=self.model,
                contents=prompt.user_content,
                config=self._generation_config(prompt),
            )
        except Exception as exc:
            raise map_provider_error(exc) from exc

        candidates = response.candidates or []
        if not candidates:
            block_reason = getattr(response.prompt_feedback, "block_reason", None) if response.prompt_feedback else None
            raise AIProviderError(f"No candidates returned (block_reason={block_reason})")

        finish_reason = candidates[0].finish_reason
        finish_name = getattr(finish_reason, "value", None) or str(finish_reason or "")
        if finish_name == "MAX_TOKENS":
            raise AIOutputValidationError("Output truncated at GEMINI_MAX_OUTPUT_TOKENS")
        if finish_name in _BLOCKED_FINISH_REASONS:
            raise AIProviderError(f"Generation stopped (finish_reason={finish_name})")

        text = response.text
        if not text or not text.strip():
            raise AIOutputValidationError("Empty response text")
        return text

    def generate_questions(self, prompt: BuiltPrompt) -> ProviderResponse:
        attempts = 0

        def _track(n: int) -> None:
            nonlocal attempts
            attempts = n

        start = time.perf_counter()
        try:
            raw = call_with_retry(lambda: self._generate_once(prompt), self.retry_policy,
                                  sleep=self._sleep, on_attempt=_track)
        except AIException as exc:
            exc.attempts = attempts  # surfaced in observability metadata
            raise
        latency_ms = int((time.perf_counter() - start) * 1000)
        return ProviderResponse(raw_json=raw, provider=self.name, model=self.model,
                                latency_ms=latency_ms, attempts=attempts)

    def health_check(self) -> ProviderHealth:
        start = time.perf_counter()
        try:
            # Metadata lookup only: validates key + model without spending generation tokens
            self._client.models.get(model=self.model)
        except Exception as exc:
            mapped = map_provider_error(exc)
            logger.warning("Gemini health check failed: category=%s detail=%s",
                           mapped.category.value, mapped.internal_detail)
            return ProviderHealth(available=False, provider=self.name, model=self.model,
                                  latency_ms=int((time.perf_counter() - start) * 1000),
                                  error_category=mapped.category.value)
        return ProviderHealth(available=True, provider=self.name, model=self.model,
                              latency_ms=int((time.perf_counter() - start) * 1000))
