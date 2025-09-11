from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    StatisticsRequest,
    StatisticsResponse,
    ErrorResponse
)
from app.services import earth_engine_service
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/statistics", response_model=StatisticsResponse)
async def get_statistics(request: StatisticsRequest):
    """Calculate statistics for multiple indices over a date range"""
    try:
        statistics = earth_engine_service.get_statistics(
            request.aoi.geometry.dict(),
            request.date_range.start_date,
            request.date_range.end_date,
            [idx.value for idx in request.indices]
        )
        
        # Format statistics
        formatted_stats = {}
        for index_name, stats in statistics.items():
            formatted_stats[index_name] = {
                "mean": stats.get(f"{index_name}_mean"),
                "std": stats.get(f"{index_name}_stdDev"),
                "p2": stats.get(f"{index_name}_p2"),
                "p25": stats.get(f"{index_name}_p25"),
                "median": stats.get(f"{index_name}_p50"),
                "p75": stats.get(f"{index_name}_p75"),
                "p98": stats.get(f"{index_name}_p98")
            }
        
        return StatisticsResponse(
            aoi_name=request.aoi.name,
            date_range=request.date_range,
            statistics=formatted_stats,
            metadata={
                "cloud_coverage": request.cloud_coverage,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    except Exception as e:
        logger.error(f"Error calculating statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare")
async def compare_periods(
    aoi: dict,
    period1: dict,
    period2: dict,
    indices: list
):
    """Compare vegetation indices between two time periods"""
    try:
        # Calculate statistics for period 1
        stats1 = earth_engine_service.get_statistics(
            aoi,
            period1['start_date'],
            period1['end_date'],
            indices
        )
        
        # Calculate statistics for period 2
        stats2 = earth_engine_service.get_statistics(
            aoi,
            period2['start_date'],
            period2['end_date'],
            indices
        )
        
        # Calculate differences
        comparison = {}
        for index in indices:
            if index in stats1 and index in stats2:
                comparison[index] = {
                    "period1": {
                        "mean": stats1[index].get(f"{index}_mean"),
                        "median": stats1[index].get(f"{index}_p50")
                    },
                    "period2": {
                        "mean": stats2[index].get(f"{index}_mean"),
                        "median": stats2[index].get(f"{index}_p50")
                    },
                    "change": {
                        "mean_diff": stats2[index].get(f"{index}_mean", 0) - stats1[index].get(f"{index}_mean", 0),
                        "median_diff": stats2[index].get(f"{index}_p50", 0) - stats1[index].get(f"{index}_p50", 0),
                        "mean_pct": ((stats2[index].get(f"{index}_mean", 0) - stats1[index].get(f"{index}_mean", 0)) / 
                                    stats1[index].get(f"{index}_mean", 1)) * 100 if stats1[index].get(f"{index}_mean") else 0
                    }
                }
        
        return {
            "comparison": comparison,
            "period1": period1,
            "period2": period2,
            "indices": indices
        }
    
    except Exception as e:
        logger.error(f"Error comparing periods: {e}")
        raise HTTPException(status_code=500, detail=str(e))