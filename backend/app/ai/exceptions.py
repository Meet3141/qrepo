from enum import Enum
from app.core.exceptions import AppException


class AIErrorCategory(str, Enum):
    CONFIGURATION = "AI_CONFIGURATION_ERROR"
    AUTHENTICATION = "AI_AUTHENTICATION_ERROR"
    RATE_LIMIT = "AI_RATE_LIMIT_ERROR"
    TIMEOUT = "AI_TIMEOUT_ERROR"
    PROVIDER = "AI_PROVIDER_ERROR"
    OUTPUT_VALIDATION = "AI_OUTPUT_VALIDATION_ERROR"


class AIException(AppException):
    """
    Base AI error. `message` is user-facing and must never contain provider details,
    stack traces or secrets. `internal_detail` is for server logs only.
    """
    category: AIErrorCategory = AIErrorCategory.PROVIDER
    default_message: str = "The AI service failed to process the request. Please try again later."
    default_status: int = 502
    retryable: bool = False

    def __init__(self, internal_detail: str = "", *, message: str | None = None, retryable: bool | None = None):
        super().__init__(message or self.default_message, status_code=self.default_status)
        self.internal_detail = internal_detail
        self.attempts = 0
        if retryable is not None:
            self.retryable = retryable


class AIConfigurationError(AIException):
    category = AIErrorCategory.CONFIGURATION
    default_message = "AI question generation is not configured on this server."
    default_status = 503


class AIAuthenticationError(AIException):
    # 502 rather than 401: this is the *server's* credential failing, not the user's session
    category = AIErrorCategory.AUTHENTICATION
    default_message = "The AI service is currently unavailable. Please contact an administrator."
    default_status = 502


class AIRateLimitError(AIException):
    category = AIErrorCategory.RATE_LIMIT
    default_message = "The AI service is busy. Please try again in a moment."
    default_status = 503
    retryable = True


class AITimeoutError(AIException):
    category = AIErrorCategory.TIMEOUT
    default_message = "The AI service took too long to respond. Please try again."
    default_status = 504
    retryable = True


class AIProviderError(AIException):
    category = AIErrorCategory.PROVIDER


class AIOutputValidationError(AIException):
    category = AIErrorCategory.OUTPUT_VALIDATION
    default_message = "The AI service returned an invalid result. Please try again."
    default_status = 502
