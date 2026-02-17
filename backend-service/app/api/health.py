import asyncio
from fastapi import APIRouter
from datetime import datetime
from app.models.schemas import HealthResponse
from app.core.config import settings

router = APIRouter()


@router.get("/", response_model=HealthResponse)
async def health_check():
    """Quick health check - returns immediately without external dependencies"""
    return HealthResponse(
        status="healthy",
        version=settings.VERSION,
        earth_engine=False,  # Not checked here; use /detailed for full status
        timestamp=datetime.utcnow(),
    )


@router.get("/detailed", response_model=HealthResponse)
async def detailed_health_check():
    """Detailed health check including Earth Engine connectivity (may be slow)"""
    from app.services import earth_engine_service

    try:
        # Run GEE init in a thread with a 15s timeout so it can't hang the server
        loop = asyncio.get_event_loop()
        await asyncio.wait_for(
            loop.run_in_executor(None, earth_engine_service.initialize),
            timeout=15,
        )
        ee_status = True
    except (asyncio.TimeoutError, Exception):
        ee_status = False

    return HealthResponse(
        status="healthy" if ee_status else "degraded",
        version=settings.VERSION,
        earth_engine=ee_status,
        timestamp=datetime.utcnow(),
    )


@router.get("/ready")
async def readiness_check():
    """Readiness probe - checks basic service availability, not external deps"""
    return {"ready": True}
