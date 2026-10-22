from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Intelligent API Monitoring & Alert System"
    PROJECT_VERSION: str = "1.0.0"
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    DATABASE_URL: str = "sqlite:///./monitoring.db"

    OPENAI_API_KEY: Optional[str] = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    LATENCY_WARNING_MS: float = 2000.0
    LATENCY_CRITICAL_MS: float = 4000.0

    EMAIL_ENABLED: bool = False
    SMTP_HOST: str = "smtp.ethereal.email"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    ALERT_RECIPIENT_EMAIL: str = "sre-alerts@company.internal"

    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/monitoring.log"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
