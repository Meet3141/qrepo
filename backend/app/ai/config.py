from typing import Optional
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class AISettings(BaseSettings):
    """
    Backend-only AI configuration. Never serialize this object into an API response.

    GEMINI_API_KEY and GEMINI_MODEL are required to *use* the provider, but are optional
    here so the rest of QRepo can boot without AI configured. The provider raises
    AIConfigurationError at construction time if they are missing.
    """
    AI_PROVIDER: str = "gemini"

    GEMINI_API_KEY: Optional[SecretStr] = None
    GEMINI_MODEL: Optional[str] = None
    GEMINI_TEMPERATURE: float = Field(0.4, ge=0.0, le=2.0)
    GEMINI_MAX_OUTPUT_TOKENS: int = Field(8192, ge=256, le=65536)
    GEMINI_TIMEOUT_SECONDS: float = Field(60.0, gt=0, le=300)
    GEMINI_MAX_RETRIES: int = Field(2, ge=0, le=2)  # application-level retries, hard-capped at 2
    GEMINI_RETRY_BASE_DELAY_SECONDS: float = Field(1.0, ge=0, le=10)
    GEMINI_RETRY_MAX_DELAY_SECONDS: float = Field(8.0, ge=0, le=30)

    # Maximum characters of extracted document text injected into a prompt
    AI_CONTEXT_MAX_CHARS: int = Field(12000, ge=0, le=100000)

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"
    )

    def __repr__(self) -> str:
        # SecretStr already masks the key; keep repr minimal anyway
        return f"AISettings(provider={self.AI_PROVIDER!r}, model={self.GEMINI_MODEL!r})"


def get_ai_settings() -> AISettings:
    return AISettings()
