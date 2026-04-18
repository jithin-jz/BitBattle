from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://arena:arena_secret_2024@localhost:5432/arena_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    SECRET_KEY: str = "super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # GitHub OAuth
    GITHUB_CLIENT_ID: str = "your_github_client_id"
    GITHUB_CLIENT_SECRET: str = "your_github_client_secret"

    # Frontend
    FRONTEND_URL: str = "http://localhost:3000"

    # Environment
    ENVIRONMENT: str = "development"

    # OTP
    OTP_TTL_SECONDS: int = 300  # 5 minutes
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RATE_LIMIT_SECONDS: int = 30

    # SMTP Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    # Use leetcode battle name
    SMTP_FROM_NAME: str = "LeetCode Battle"
    SMTP_USE_TLS: bool = True

    # ELO
    ELO_K_FACTOR: int = 32
    ELO_DEFAULT_RATING: int = 1200
    MATCHMAKING_RANGE: int = 200

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
