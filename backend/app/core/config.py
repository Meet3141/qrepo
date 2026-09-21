from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    DOCUMENT_STORAGE_DIR: str = "media/documents"
    MAX_DOCUMENT_SIZE: int = 10 * 1024 * 1024 # 10 MB

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )


settings = Settings()