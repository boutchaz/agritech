from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.models.schemas import HealthResponse
from app.services import earth_engine_service
from app.core.config import settings

router = APIRouter()

@router.get("/", response_model=HealthResponse)
async def health_check():
    """Check service health and Earth Engine connectivity"""
    try:
        # Try to initialize Earth Engine
        earth_engine_service.initialize()
        ee_status = True
    except Exception:
        ee_status = False
    
    return HealthResponse(
        status="healthy" if ee_status else "degraded",
        version=settings.VERSION,
        earth_engine=ee_status,
        timestamp=datetime.utcnow()
    )

@router.get("/ready")
async def readiness_check():
    """Kubernetes readiness probe endpoint"""
    try:
        earth_engine_service.initialize()
        return {"ready": True}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))