from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    StatisticsRequest,
    StatisticsResponse,
    CloudCoverageCheckRequest,
    CloudCoverageCheckResponse,
    IndexImageRequest,
    IndexImageResponse,
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
            request.aoi.geometry.model_dump(),
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

@router.post("/cloud-coverage", response_model=CloudCoverageCheckResponse)
async def check_cloud_coverage(request: CloudCoverageCheckRequest):
    """Check cloud coverage availability for given parameters"""
    try:
        result = earth_engine_service.check_cloud_coverage(
            request.geometry.model_dump(),
            request.date_range.start_date,
            request.date_range.end_date,
            request.max_cloud_coverage or 10.0
        )

        return CloudCoverageCheckResponse(
            has_suitable_images=result['has_suitable_images'],
            available_images_count=result['available_images_count'],
            suitable_images_count=result.get('suitable_images_count', 0),
            min_cloud_coverage=result.get('min_cloud_coverage'),
            max_cloud_coverage=result.get('max_cloud_coverage'),
            avg_cloud_coverage=result.get('avg_cloud_coverage'),
            recommended_date=result.get('recommended_date'),
            metadata=result.get('metadata', {})
        )

    except Exception as e:
        logger.error(f"Error checking cloud coverage: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-index-image", response_model=IndexImageResponse)
async def generate_index_image(request: IndexImageRequest):
    """Generate a visual image representation of a vegetation index"""
    try:
        logger.info(f"Received request: {request}")
        logger.info(f"AOI: {request.aoi}")
        logger.info(f"Date range: {request.date_range}")
        logger.info(f"Index: {request.index}")
        logger.info(f"Cloud coverage: {request.cloud_coverage}")

        # Get the best available date for the given parameters
        cloud_result = earth_engine_service.check_cloud_coverage(
            request.aoi.geometry.model_dump(),
            request.date_range.start_date,
            request.date_range.end_date,
            request.cloud_coverage
        )

        if not cloud_result['has_suitable_images']:
            raise HTTPException(
                status_code=404,
                detail=f"No suitable images found with cloud coverage < {request.cloud_coverage}%"
            )

        best_date = cloud_result.get('recommended_date', request.date_range.start_date)

        # Generate the index image URL
        image_url = earth_engine_service.export_index_map(
            request.aoi.geometry.model_dump(),
            best_date,
            request.index.value
        )

        return IndexImageResponse(
            image_url=image_url,
            index=request.index,
            date=best_date,
            cloud_coverage=cloud_result.get('min_cloud_coverage', 0),
            metadata={
                "available_images": cloud_result.get('available_images_count', 0),
                "suitable_images": cloud_result.get('suitable_images_count', 0)
            }
        )

    except Exception as e:
        logger.error(f"Error generating index image: {e}")
        raise HTTPException(status_code=500, detail=str(e))