from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional
from app.models.schemas import (
    StatisticsRequest,
    StatisticsResponse,
    CloudCoverageCheckRequest,
    CloudCoverageCheckResponse,
    IndexImageRequest,
    IndexImageResponse,
    ErrorResponse,
)
from app.services.satellite import get_satellite_provider
from datetime import datetime, timedelta
import logging

from app.middleware.auth import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])
logger = logging.getLogger(__name__)


def _cloud_info_to_dict(info) -> dict:
    if isinstance(info, dict):
        return info
    return {
        "has_suitable_images": info.has_suitable_images,
        "available_images_count": info.available_images_count,
        "suitable_images_count": info.suitable_images_count,
        "min_cloud_coverage": info.min_cloud_coverage,
        "max_cloud_coverage": info.max_cloud_coverage,
        "avg_cloud_coverage": info.avg_cloud_coverage,
        "recommended_date": info.recommended_date,
        "metadata": info.metadata,
    }


@router.post("/statistics", response_model=StatisticsResponse)
async def get_statistics(
    request: StatisticsRequest,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    try:
        satellite_provider = get_satellite_provider(provider)
        index_names = [idx.value for idx in request.indices]

        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            statistics = earth_engine_service.get_statistics(
                request.aoi.geometry.model_dump(),
                request.date_range.start_date,
                request.date_range.end_date,
                index_names,
            )

            formatted_stats = {}
            for index_name, stats in statistics.items():
                formatted_stats[index_name] = {
                    "mean": stats.get(f"{index_name}_mean"),
                    "std": stats.get(f"{index_name}_stdDev"),
                    "p2": stats.get(f"{index_name}_p2"),
                    "p25": stats.get(f"{index_name}_p25"),
                    "median": stats.get(f"{index_name}_p50"),
                    "p75": stats.get(f"{index_name}_p75"),
                    "p98": stats.get(f"{index_name}_p98"),
                }
        else:
            stats_results = satellite_provider.get_statistics(
                geometry=request.aoi.geometry.model_dump(),
                start_date=request.date_range.start_date,
                end_date=request.date_range.end_date,
                indices=index_names,
            )
            formatted_stats = {}
            for index_name, stat_result in stats_results.items():
                s = stat_result.statistics
                formatted_stats[index_name] = {
                    "mean": s.get("mean"),
                    "std": s.get("std"),
                    "p2": s.get("p2"),
                    "p25": s.get("p25"),
                    "median": s.get("median"),
                    "p75": s.get("p75"),
                    "p98": s.get("p98"),
                }

        return StatisticsResponse(
            aoi_name=request.aoi.name,
            date_range=request.date_range,
            statistics=formatted_stats,
            metadata={
                "cloud_coverage": request.cloud_coverage,
                "timestamp": datetime.utcnow().isoformat(),
                "provider": satellite_provider.provider_name,
            },
        )

    except Exception as e:
        logger.error(f"Error calculating statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare")
async def compare_periods(
    aoi: dict,
    period1: dict,
    period2: dict,
    indices: list,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    try:
        satellite_provider = get_satellite_provider(provider)

        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            stats1 = earth_engine_service.get_statistics(
                aoi, period1["start_date"], period1["end_date"], indices
            )
            stats2 = earth_engine_service.get_statistics(
                aoi, period2["start_date"], period2["end_date"], indices
            )
            get_val = lambda stats, idx, suffix: stats[idx].get(f"{idx}_{suffix}", 0)
        else:
            raw1 = satellite_provider.get_statistics(
                geometry=aoi,
                start_date=period1["start_date"],
                end_date=period1["end_date"],
                indices=indices,
            )
            raw2 = satellite_provider.get_statistics(
                geometry=aoi,
                start_date=period2["start_date"],
                end_date=period2["end_date"],
                indices=indices,
            )
            stats1 = {k: v.statistics for k, v in raw1.items()}
            stats2 = {k: v.statistics for k, v in raw2.items()}
            get_val = lambda stats, idx, suffix: stats[idx].get(suffix, 0)

        comparison = {}
        for index in indices:
            if index in stats1 and index in stats2:
                mean1 = get_val(stats1, index, "mean")
                mean2 = get_val(stats2, index, "mean")
                med1 = get_val(stats1, index, "median") or get_val(stats1, index, "p50")
                med2 = get_val(stats2, index, "median") or get_val(stats2, index, "p50")

                comparison[index] = {
                    "period1": {"mean": mean1, "median": med1},
                    "period2": {"mean": mean2, "median": med2},
                    "change": {
                        "mean_diff": (mean2 or 0) - (mean1 or 0),
                        "median_diff": (med2 or 0) - (med1 or 0),
                        "mean_pct": (((mean2 or 0) - (mean1 or 0)) / mean1 * 100)
                        if mean1
                        else 0,
                    },
                }

        return {
            "comparison": comparison,
            "period1": period1,
            "period2": period2,
            "indices": indices,
            "provider": satellite_provider.provider_name,
        }

    except Exception as e:
        logger.error(f"Error comparing periods: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cloud-coverage", response_model=CloudCoverageCheckResponse)
async def check_cloud_coverage(
    request: CloudCoverageCheckRequest,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    try:
        satellite_provider = get_satellite_provider(provider)
        max_cloud_threshold = request.max_cloud_coverage or 10.0

        result_obj = satellite_provider.check_cloud_coverage(
            geometry=request.geometry.model_dump(),
            start_date=request.date_range.start_date,
            end_date=request.date_range.end_date,
            max_cloud_coverage=max_cloud_threshold,
        )
        result = _cloud_info_to_dict(result_obj)

        if (
            not result["has_suitable_images"]
            and result["available_images_count"] > 0
            and max_cloud_threshold < 50
        ):
            logger.info(
                f"No images found with {max_cloud_threshold}% cloud threshold, trying 50%"
            )
            result_obj = satellite_provider.check_cloud_coverage(
                geometry=request.geometry.model_dump(),
                start_date=request.date_range.start_date,
                end_date=request.date_range.end_date,
                max_cloud_coverage=50.0,
            )
            result = _cloud_info_to_dict(result_obj)

        return CloudCoverageCheckResponse(
            has_suitable_images=result["has_suitable_images"],
            available_images_count=result["available_images_count"],
            suitable_images_count=result.get("suitable_images_count", 0),
            min_cloud_coverage=result.get("min_cloud_coverage"),
            max_cloud_coverage=result.get("max_cloud_coverage"),
            avg_cloud_coverage=result.get("avg_cloud_coverage"),
            recommended_date=result.get("recommended_date"),
            metadata=result.get("metadata", {}),
        )

    except Exception as e:
        logger.error(f"Error checking cloud coverage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-index-image")
async def generate_index_image(
    request: dict,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    try:
        satellite_provider = get_satellite_provider(provider)

        aoi = request.get("aoi", {})
        date_range = request.get("date_range", {})
        index = request.get("index")
        cloud_coverage = request.get("cloud_coverage", 10)
        organization_id = request.get("organization_id")

        logger.info(
            f"generate_index_image: index={index}, provider={satellite_provider.provider_name}"
        )

        cloud_thresholds = [cloud_coverage, 20, 30, 50, 80]
        cloud_result = None
        used_threshold = cloud_coverage

        for threshold in cloud_thresholds:
            try:
                cloud_obj = satellite_provider.check_cloud_coverage(
                    geometry=aoi.get("geometry", {}),
                    start_date=date_range.get("start_date"),
                    end_date=date_range.get("end_date"),
                    max_cloud_coverage=threshold,
                )
                cloud_result = _cloud_info_to_dict(cloud_obj)

                if cloud_result["has_suitable_images"]:
                    used_threshold = threshold
                    logger.info(
                        f"Found suitable images with cloud coverage threshold: {threshold}%"
                    )
                    break

            except Exception as e:
                logger.warning(
                    f"Cloud coverage check failed at threshold {threshold}%: {e}"
                )
                continue

        if not cloud_result or not cloud_result["has_suitable_images"]:
            current_date = datetime.now()

            extended_ranges = [
                (30, "last 30 days"),
                (90, "last 3 months"),
                (180, "last 6 months"),
                (365, "last year"),
            ]

            for days, description in extended_ranges:
                end_date_ext = current_date
                start_date_ext = current_date - timedelta(days=days)

                logger.info(f"Trying with extended date range: {description}")
                try:
                    cloud_obj = satellite_provider.check_cloud_coverage(
                        geometry=aoi.get("geometry", {}),
                        start_date=start_date_ext.strftime("%Y-%m-%d"),
                        end_date=end_date_ext.strftime("%Y-%m-%d"),
                        max_cloud_coverage=90,
                    )
                    cloud_result = _cloud_info_to_dict(cloud_obj)

                    if cloud_result and cloud_result["has_suitable_images"]:
                        used_threshold = 90
                        logger.info(
                            f"Found suitable images with {description} and 90% cloud threshold"
                        )
                        break

                except Exception as e:
                    logger.warning(
                        f"Extended date range check failed for {description}: {e}"
                    )
                    continue

        if not cloud_result or not cloud_result["has_suitable_images"]:
            if cloud_result and cloud_result.get("available_images_count", 0) > 0:
                logger.info(
                    f"Found {cloud_result['available_images_count']} images but none meet cloud coverage threshold"
                )
                best_date = cloud_result.get("recommended_date")
                if best_date:
                    try:
                        image_result = await satellite_provider.export_index_map(
                            geometry=aoi.get("geometry", {}),
                            date=best_date,
                            index=index,
                            organization_id=organization_id,
                        )
                        image_url = (
                            image_result
                            if isinstance(image_result, (str, dict))
                            else getattr(image_result, "url", image_result)
                        )
                        return {
                            "image_url": image_url,
                            "index": index,
                            "date": best_date,
                            "cloud_coverage": cloud_result.get("min_cloud_coverage", 0),
                            "metadata": {
                                "available_images": cloud_result.get(
                                    "available_images_count", 0
                                ),
                                "suitable_images": cloud_result.get(
                                    "suitable_images_count", 0
                                ),
                                "threshold_used": used_threshold,
                                "requested_threshold": cloud_coverage,
                                "provider": satellite_provider.provider_name,
                                "warning": f"Using image with {cloud_result.get('min_cloud_coverage', 0):.1f}% cloud coverage (exceeds requested {cloud_coverage}%)",
                            },
                        }
                    except Exception as e:
                        logger.warning(
                            f"Failed to generate image with available data: {e}"
                        )

            logger.info("No satellite data available, returning demo response")
            return {
                "image_url": "https://via.placeholder.com/400x400/228B22/FFFFFF?text=DEMO+"
                + index
                + "+Index",
                "index": index,
                "date": date_range.get("start_date", "2025-01-01"),
                "cloud_coverage": 0,
                "metadata": {
                    "available_images": cloud_result.get("available_images_count", 0)
                    if cloud_result
                    else 0,
                    "suitable_images": cloud_result.get("suitable_images_count", 0)
                    if cloud_result
                    else 0,
                    "threshold_used": used_threshold,
                    "requested_threshold": cloud_coverage,
                    "demo_mode": True,
                    "provider": satellite_provider.provider_name,
                    "message": f"No satellite data available for {aoi.get('name', 'this location')}. Showing demo visualization.",
                    "error_details": cloud_result.get("metadata", {}).get("error")
                    if cloud_result
                    else None,
                },
            }

        requested_date = date_range.get("start_date")
        logger.info(f"Using requested date: {requested_date}")

        try:
            image_result = await satellite_provider.export_index_map(
                geometry=aoi.get("geometry", {}),
                date=requested_date,
                index=index,
                organization_id=organization_id,
            )
            image_url = (
                image_result
                if isinstance(image_result, (str, dict))
                else getattr(image_result, "url", image_result)
            )

            return {
                "image_url": image_url,
                "index": index,
                "date": requested_date,
                "cloud_coverage": cloud_result.get("min_cloud_coverage", 0),
                "metadata": {
                    "available_images": cloud_result.get("available_images_count", 0),
                    "suitable_images": cloud_result.get("suitable_images_count", 0),
                    "threshold_used": used_threshold,
                    "requested_threshold": cloud_coverage,
                    "provider": satellite_provider.provider_name,
                    "file_type": "geotiff",
                    "storage_method": "supabase"
                    if organization_id
                    else "direct_download",
                },
            }
        except Exception as e:
            logger.warning(
                f"Failed to generate image for exact date {requested_date}: {e}"
            )
            best_date = cloud_result.get("recommended_date", requested_date)
            logger.info(f"Falling back to best available date: {best_date}")

            image_result = await satellite_provider.export_index_map(
                geometry=aoi.get("geometry", {}),
                date=best_date,
                index=index,
                organization_id=organization_id,
            )
            image_url = (
                image_result
                if isinstance(image_result, (str, dict))
                else getattr(image_result, "url", image_result)
            )

            return {
                "image_url": image_url,
                "index": index,
                "date": best_date,
                "cloud_coverage": cloud_result.get("min_cloud_coverage", 0),
                "metadata": {
                    "available_images": cloud_result.get("available_images_count", 0),
                    "suitable_images": cloud_result.get("suitable_images_count", 0),
                    "threshold_used": used_threshold,
                    "requested_threshold": cloud_coverage,
                    "provider": satellite_provider.provider_name,
                    "file_type": "geotiff",
                    "storage_method": "supabase"
                    if organization_id
                    else "direct_download",
                    "note": f"Using best available date (exact date {requested_date} not available)",
                },
            }

    except Exception as e:
        logger.error(f"Error generating index image: {e}")
        raise HTTPException(status_code=500, detail=str(e))
