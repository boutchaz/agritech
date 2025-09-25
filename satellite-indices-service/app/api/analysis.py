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

@router.post("/generate-index-image")
async def generate_index_image(request: dict):
    """Generate a visual image representation of a vegetation index"""
    try:
        logger.info(f"Received raw request: {request}")
        logger.info(f"Request type: {type(request)}")
        logger.info(f"Request keys: {list(request.keys()) if isinstance(request, dict) else 'Not a dict'}")

        # Extract data from request
        aoi = request.get('aoi', {})
        date_range = request.get('date_range', {})
        index = request.get('index')
        cloud_coverage = request.get('cloud_coverage', 10)
        organization_id = request.get('organization_id')

        logger.info(f"AOI: {aoi}")
        logger.info(f"Date range: {date_range}")
        logger.info(f"Index: {index}")
        logger.info(f"Cloud coverage: {cloud_coverage}")

        # Try progressive cloud coverage thresholds if the initial one is too strict
        cloud_thresholds = [cloud_coverage, 20, 30, 50, 80]
        cloud_result = None
        used_threshold = cloud_coverage

        for threshold in cloud_thresholds:
            try:
                cloud_result = earth_engine_service.check_cloud_coverage(
                    aoi.get('geometry', {}),
                    date_range.get('start_date'),
                    date_range.get('end_date'),
                    threshold
                )

                if cloud_result['has_suitable_images']:
                    used_threshold = threshold
                    logger.info(f"Found suitable images with cloud coverage threshold: {threshold}%")
                    break

            except Exception as e:
                logger.warning(f"Cloud coverage check failed at threshold {threshold}%: {e}")
                continue

        if not cloud_result or not cloud_result['has_suitable_images']:
            # Try multiple extended date ranges with very lenient cloud coverage
            from datetime import datetime, timedelta
            current_date = datetime.now()

            extended_ranges = [
                (30, "last 30 days"),
                (90, "last 3 months"),
                (180, "last 6 months"),
                (365, "last year")
            ]

            for days, description in extended_ranges:
                end_date_ext = current_date
                start_date_ext = current_date - timedelta(days=days)

                logger.info(f"Trying with extended date range: {description}")
                try:
                    cloud_result = earth_engine_service.check_cloud_coverage(
                        aoi.get('geometry', {}),
                        start_date_ext.strftime('%Y-%m-%d'),
                        end_date_ext.strftime('%Y-%m-%d'),
                        90  # Very lenient cloud coverage
                    )

                    if cloud_result and cloud_result['has_suitable_images']:
                        used_threshold = 90
                        logger.info(f"Found suitable images with {description} and 90% cloud threshold")
                        break

                except Exception as e:
                    logger.warning(f"Extended date range check failed for {description}: {e}")
                    continue

        if not cloud_result or not cloud_result['has_suitable_images']:
            # Check if we have any images at all, even with high cloud coverage
            if cloud_result and cloud_result.get('available_images_count', 0) > 0:
                # We have images but they don't meet cloud coverage requirements
                logger.info(f"Found {cloud_result['available_images_count']} images but none meet cloud coverage threshold")
                best_date = cloud_result.get('recommended_date')
                if best_date:
                    # Try to generate image with the best available date despite cloud coverage
                    try:
                        image_url = earth_engine_service.export_index_map(
                            aoi.get('geometry', {}),
                            best_date,
                            index,
                            organization_id=organization_id
                        )
                        return {
                            "image_url": image_url,
                            "index": index,
                            "date": best_date,
                            "cloud_coverage": cloud_result.get('min_cloud_coverage', 0),
                            "metadata": {
                                "available_images": cloud_result.get('available_images_count', 0),
                                "suitable_images": cloud_result.get('suitable_images_count', 0),
                                "threshold_used": used_threshold,
                                "requested_threshold": cloud_coverage,
                                "warning": f"Using image with {cloud_result.get('min_cloud_coverage', 0):.1f}% cloud coverage (exceeds requested {cloud_coverage}%)"
                            }
                        }
                    except Exception as e:
                        logger.warning(f"Failed to generate image with available data: {e}")
            
            # As a last resort, return a demo/placeholder response
            logger.info("No satellite data available, returning demo response")
            return {
                "image_url": "https://via.placeholder.com/400x400/228B22/FFFFFF?text=DEMO+" + index + "+Index",
                "index": index,
                "date": date_range.get('start_date', '2025-01-01'),
                "cloud_coverage": 0,
                "metadata": {
                    "available_images": cloud_result.get('available_images_count', 0) if cloud_result else 0,
                    "suitable_images": cloud_result.get('suitable_images_count', 0) if cloud_result else 0,
                    "threshold_used": used_threshold,
                    "requested_threshold": cloud_coverage,
                    "demo_mode": True,
                    "message": f"No satellite data available for {aoi.get('name', 'this location')}. Showing demo visualization.",
                    "error_details": cloud_result.get('metadata', {}).get('error') if cloud_result else None
                }
            }

        # Use the exact requested date instead of finding the best available date
        requested_date = date_range.get('start_date')
        logger.info(f"Using requested date: {requested_date}")

        # Generate the index image as GeoTIFF file
        try:
            image_url = earth_engine_service.export_index_map(
                aoi.get('geometry', {}),
                requested_date,
                index,
                organization_id=organization_id
            )
            
            # For now, return the Earth Engine URL, but we'll enhance this to store in buckets
            return {
                "image_url": image_url,
                "index": index,
                "date": requested_date,
                "cloud_coverage": cloud_result.get('min_cloud_coverage', 0),
                "metadata": {
                    "available_images": cloud_result.get('available_images_count', 0),
                    "suitable_images": cloud_result.get('suitable_images_count', 0),
                    "threshold_used": used_threshold,
                    "requested_threshold": cloud_coverage,
                    "file_type": "geotiff",
                    "note": "Using exact requested date"
                }
            }
        except Exception as e:
            logger.warning(f"Failed to generate image for exact date {requested_date}: {e}")
            # Fallback to best available date if exact date fails
            best_date = cloud_result.get('recommended_date', requested_date)
            logger.info(f"Falling back to best available date: {best_date}")
            
            image_url = earth_engine_service.export_index_map(
                aoi.get('geometry', {}),
                best_date,
                index,
                organization_id=organization_id
            )

            return {
                "image_url": image_url,
                "index": index,
                "date": best_date,
                "cloud_coverage": cloud_result.get('min_cloud_coverage', 0),
                "metadata": {
                    "available_images": cloud_result.get('available_images_count', 0),
                    "suitable_images": cloud_result.get('suitable_images_count', 0),
                    "threshold_used": used_threshold,
                    "requested_threshold": cloud_coverage,
                    "file_type": "geotiff",
                    "note": f"Using best available date (exact date {requested_date} not available)"
                }
            }

    except Exception as e:
        logger.error(f"Error generating index image: {e}")
        raise HTTPException(status_code=500, detail=str(e))