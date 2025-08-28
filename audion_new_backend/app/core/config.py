"""
Core configuration settings for New Audion Backend
Clean, centralized configuration management
"""

from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    # Application
    app_name: str = "Audion New Backend"
    app_version: str = "0.1.0"
    app_env: str = Field(default="development", env="APP_ENV")
    debug: bool = Field(default=True, env="DEBUG")

    # API Configuration
    api_v1_prefix: str = Field(default="/api/v1", env="API_V1_PREFIX")
    cors_origins: list[str] = Field(
        default=[
            "http://localhost:8081", 
            "http://localhost:19006", 
            "http://localhost:8087",  # Frontend port
            "http://localhost:8090"   # Alternative frontend port
        ], env="CORS_ORIGINS"
    )

    # Database
    database_url: str = Field(default="sqlite+aiosqlite:///audion.db", env="DATABASE_URL")
    database_pool_size: int = Field(default=20, env="DATABASE_POOL_SIZE")
    database_max_overflow: int = Field(default=10, env="DATABASE_MAX_OVERFLOW")

    # Security
    jwt_secret_key: str = Field(default="dev-secret-key-change-in-production", env="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", env="JWT_ALGORITHM")
    jwt_access_token_expire_minutes: int = Field(
        default=30, env="JWT_ACCESS_TOKEN_EXPIRE_MINUTES"
    )

    # AI Services
    openai_api_key: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    google_tts_service_account_path: Optional[str] = Field(
        default=None, env="GOOGLE_TTS_SERVICE_ACCOUNT_PATH"
    )

    # AWS Storage
    aws_access_key_id: Optional[str] = Field(default=None, env="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: Optional[str] = Field(
        default=None, env="AWS_SECRET_ACCESS_KEY"
    )
    aws_s3_bucket_name: Optional[str] = Field(default=None, env="AWS_S3_BUCKET_NAME")
    aws_region: str = Field(default="us-east-1", env="AWS_REGION")

    # Redis Cache
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()
