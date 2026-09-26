from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        # Read from .env file (either in backend/ or root project folder)
        env_file=(".env", "../.env"), 
        env_file_encoding="utf-8", 
        extra="ignore"
    )
    
    PORT: int = 8000
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

# Instantiate settings to export globally
settings = Settings()
