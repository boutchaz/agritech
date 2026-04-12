import re
from collections.abc import Awaitable, Callable
from typing import cast

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing_extensions import override

from .api import (
    health,
    indices,
    analysis,
    supabase,
    billing,
    weather,
    sync,
    calibration,
)
from .core.config import settings
from .middleware.auth import close_http_client
import logging

_startup_logger = logging.getLogger(__name__)


class NormalizePathMiddleware(BaseHTTPMiddleware):
    @override
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if "//" in request.scope["path"]:
            path = cast(str, request.scope["path"])
            request.scope["path"] = re.sub(r"/+", "/", path)
        return await call_next(request)


app = FastAPI(
    title="AgroGina Backend Service",
    description="Agricultural technology backend service for satellite imagery analysis, PDF generation, and data processing",
    version="2.0.0",
)

# CORS: Allow the NestJS API and configured frontend origins.
# In production, CORS_ORIGINS should be set to the actual frontend/API URLs.
_cors_origins = (
    settings.CORS_ORIGINS
    if settings.CORS_ORIGINS != ["*"]
    else [
        "http://localhost:5173",
        "http://localhost:3001",
        "https://agritech-dashboard.thebzlab.online",
        "https://agritech-api.thebzlab.online",
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
    max_age=3600,
)

app.add_middleware(NormalizePathMiddleware)


@app.on_event("startup")
async def startup_event():
    """Log auth config without exposing secrets (length only)."""
    t = (settings.INTERNAL_SERVICE_TOKEN or "").strip()
    _startup_logger.info(
        "INTERNAL_SERVICE_TOKEN: %s (char_length=%s)",
        "loaded" if t else "NOT SET",
        len(t),
    )


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up shared resources on application shutdown."""
    await close_http_client()


# Include routers
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(indices.router, prefix="/api/indices", tags=["indices"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])
app.include_router(supabase.router, prefix="/api/supabase", tags=["supabase"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])
app.include_router(weather.router, prefix="/api/weather", tags=["weather"])
app.include_router(sync.router, prefix="/api/sync", tags=["sync"])
app.include_router(calibration.router, prefix="/api/calibration", tags=["calibration"])


@app.get("/health")
async def health_probe():
    """Alias for operators that probe `/health`. Canonical route: GET /api/health/."""
    return {"status": "healthy", "version": settings.VERSION}


@app.get("/ready")
async def ready_probe():
    """Alias for readiness probes. Canonical route: GET /api/health/ready."""
    return {"ready": True}


@app.get("/")
async def root():
    return {
        "service": "AgroGina Backend Service",
        "version": "2.0.0",
        "status": "operational",
        "features": [
            "satellite-indices",
            "pdf-generation",
            "data-processing",
            "weather-data",
            "calibration",
        ],
    }
