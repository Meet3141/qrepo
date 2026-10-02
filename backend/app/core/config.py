from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    DOCUMENT_STORAGE_DIR: str = "media/documents"
    MAX_DOCUMENT_SIZE: int = 10 * 1024 * 1024 # 10 MB
    # Optional storage quota shown on the admin dashboard (bytes); unset = no quota
    STORAGE_QUOTA_BYTES: Optional[int] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        # .env is shared with other settings classes (e.g. app.ai.config); ignore their keys
        extra="ignore"
    )


settings = Settings()