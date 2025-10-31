from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List
import os

class Settings(BaseSettings):
    # Service configuration
    SERVICE_NAME: str = "agritech-backend-service"
    VERSION: str = "2.0.0"
    DEBUG: bool = False
    
    # API Configuration
    API_PREFIX: str = "/api"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # Google Earth Engine
    GEE_SERVICE_ACCOUNT: str = os.getenv("GEE_SERVICE_ACCOUNT", "")
    GEE_PRIVATE_KEY: str = os.getenv("GEE_PRIVATE_KEY", "")
    GEE_PROJECT_ID: str = os.getenv("GEE_PROJECT_ID", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    
    # Supabase integration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_SERVICE_KEY", ""))
    
    # Storage
    TEMP_STORAGE_PATH: str = "/tmp/satellite-data"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    
    # Processing limits
    MAX_CLOUD_COVERAGE: float = 10.0
    DEFAULT_SCALE: int = 10  # meters
    MAX_PIXELS: int = 1e13
    
    # Automated processing
    AUTOMATED_PROCESSING_ENABLED: bool = os.getenv("AUTOMATED_PROCESSING_ENABLED", "false").lower() == "true"
    PROCESSING_INTERVAL: int = int(os.getenv("PROCESSING_INTERVAL", "3600"))  # seconds
    DEFAULT_INDICES: List[str] = ["NDVI", "NDRE", "GCI", "SAVI"]
    DEFAULT_DAYS_BACK: int = int(os.getenv("DEFAULT_DAYS_BACK", "7"))
    
    # Background tasks
    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True
    )

settings = Settings()