from app.ai.config import AISettings, get_ai_settings
from app.ai.exceptions import AIConfigurationError
from app.ai.provider import AIProvider


def create_provider(settings: AISettings) -> AIProvider:
    """Select the provider implementation from backend configuration."""
    provider_name = settings.AI_PROVIDER.strip().lower()
    if provider_name == "gemini":
        from app.ai.gemini import GeminiProvider  # lazy: keep the SDK import off the app's startup path
        return GeminiProvider(settings)
    raise AIConfigurationError(f"Unsupported AI_PROVIDER: {provider_name!r}")


def get_provider() -> AIProvider:
    """
    Create the AI provider from current environment settings.
    Not cached — this ensures .env changes are always picked up on reload.
    The constructor itself is cheap (no network calls at init time).
    """
    return create_provider(get_ai_settings())
