from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    """
    Application settings and environment variables.
    """
    DATABASE_URL: str
    REDIS_URL: str
    GEMINI_API_KEY: Optional[str] = ""
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000"
    
    AMFI_BASE_URL: str = "https://api.mfapi.in"
    AMFI_SCHEME_MASTER_URL: str = "https://portal.amfiindia.com/spages/NAVAll.txt"
    
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        extra="ignore"
    )

settings = Settings()
