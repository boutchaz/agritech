from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import health, indices, analysis, supabase, billing
from app.core.config import settings

app = FastAPI(
    title="AgriTech Backend Service",
    description="Agricultural technology backend service for satellite imagery analysis, PDF generation, and data processing",
    version="2.0.0"
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
app.include_router(supabase.router, prefix="/api/supabase", tags=["supabase"])
app.include_router(billing.router, prefix="/api/billing", tags=["billing"])

@app.get("/")
async def root():
    return {
        "service": "AgriTech Backend Service",
        "version": "2.0.0",
        "status": "operational",
        "features": ["satellite-indices", "pdf-generation", "data-processing"]
    }