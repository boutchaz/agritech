from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, indices, analysis
from app.core.config import settings

app = FastAPI(
    title="Satellite Indices Service",
    description="Agricultural satellite imagery analysis service for vegetation indices calculation",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(indices.router, prefix="/api/indices", tags=["indices"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["analysis"])

@app.get("/")
async def root():
    return {
        "service": "Satellite Indices Service",
        "version": "1.0.0",
        "status": "operational"
    }