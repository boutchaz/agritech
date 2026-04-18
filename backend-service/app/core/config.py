from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List, Union, Any
import os

# Load .env from backend-service root — cwd may be repo root when uvicorn is spawned from IDEs/scripts.
from dotenv import load_dotenv

_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
_ENV_MAIN = _BACKEND_ROOT / ".env"
_ENV_LOCAL = _BACKEND_ROOT / ".env.local"
load_dotenv(_ENV_MAIN)
load_dotenv(_ENV_LOCAL, override=True)


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
    # GEE_PRIVATE_KEY can be a string (JSON) or dict (if parsed by environment loader like Dokploy)
    GEE_SERVICE_ACCOUNT: str = ""
    GEE_PRIVATE_KEY: Union[str, dict, Any] = ""
    GEE_PROJECT_ID: str = ""
    GOOGLE_API_KEY: str = ""

    # Satellite Provider Configuration
    # Provider selection: "gee", "cdse", or "auto"
    SATELLITE_PROVIDER: str = "auto"
    # Commercial mode flag - forces CDSE provider for commercial use
    SATELLITE_COMMERCIAL_MODE: bool = False

    # Copernicus Data Space Ecosystem (CDSE/openEO) Credentials
    CDSE_CLIENT_ID: str = ""
    CDSE_CLIENT_SECRET: str = ""
    CDSE_OPENEO_URL: str = "https://openeo.dataspace.copernicus.eu"

    # Supabase integration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_KEY: str = ""

    # Storage
    TEMP_STORAGE_PATH: str = "/tmp/satellite-data"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB

    # Processing limits
    MAX_CLOUD_COVERAGE: float = 10.0
    DEFAULT_SCALE: int = 10  # meters
    MAX_PIXELS: int = 1e13

    # Automated processing
    AUTOMATED_PROCESSING_ENABLED: bool = False
    PROCESSING_INTERVAL: int = 3600  # seconds
    DEFAULT_INDICES: List[str] = ["NDVI", "NDRE", "NIRv", "EVI", "GCI", "SAVI"]
    DEFAULT_DAYS_BACK: int = 7

    # Shared secret for NestJS→FastAPI internal calls (bypasses user JWT validation)
    INTERNAL_SERVICE_TOKEN: str = ""

    # Background tasks
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    model_config = ConfigDict(
        env_file=(str(_ENV_MAIN), str(_ENV_LOCAL)),
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
