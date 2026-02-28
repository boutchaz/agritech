import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import List, Dict, Optional, Tuple
import uuid
from datetime import datetime, timedelta
from app.models.schemas import (
    IndexCalculationRequest,
    IndexCalculationResponse,
    TimeSeriesRequest,
    TimeSeriesResponse,
    ExportRequest,
    ExportResponse,
    InteractiveRequest,
    InteractiveDataResponse,
    HeatmapRequest,
    HeatmapDataResponse,
    IndexValue,
    ErrorResponse,
)
from app.services.satellite import get_satellite_provider
from app.services.supabase_service import supabase_service
import logging
import ee
import httpx

router = APIRouter()
logger = logging.getLogger(__name__)


async def _to_thread(fn, *args, **kwargs):
    """Run a blocking function in a thread pool so it doesn't block the async event loop.

    GEE's .getInfo() calls are synchronous and can take 10-120+ seconds.
    Running them on the main event loop blocks ALL concurrent requests.
    """
    return await asyncio.to_thread(fn, *args, **kwargs)


def _run_coro_sync(async_fn, *args, **kwargs):
    """Run an async-def-but-actually-blocking function synchronously.

    Some earth_engine_service methods are marked 'async def' but internally
    only call synchronous getInfo(). This helper lets us run them via to_thread.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(async_fn(*args, **kwargs))
    finally:
        loop.close()


def _extract_centroid(geometry: Dict) -> Optional[Tuple[float, float]]:
    """Extract a simple centroid (lat, lon) from GeoJSON geometry coordinates."""
    geo_type = geometry.get("type")
    coordinates = geometry.get("coordinates", [])

    points: List[List[float]] = []
    if geo_type == "Polygon" and coordinates:
        points = coordinates[0]
    elif geo_type == "MultiPolygon" and coordinates and coordinates[0]:
        points = coordinates[0][0]
    elif (
        geo_type == "Point" and isinstance(coordinates, list) and len(coordinates) == 2
    ):
        points = [coordinates]

    if not points:
        return None

    lons = [p[0] for p in points]
    lats = [p[1] for p in points]
    return (sum(lats) / len(lats), sum(lons) / len(lons))


async def _fetch_daily_par(
    latitude: float,
    longitude: float,
    start_date: str,
    end_date: str,
) -> Dict[str, float]:
    """
    Fetch daily PAR approximation from Open-Meteo archive.
    PAR ≈ 0.48 * shortwave_radiation_sum.

    Note: The archive API typically has a 2-5 day delay, so we cap the end date
    to 5 days ago to avoid requesting data that isn't available yet.
    """
    # Cap end date to 5 days ago (archive API delay)
    today = datetime.utcnow().date()
    max_available_date = today - timedelta(days=5)
    capped_end_date = min(
        datetime.strptime(end_date[:10], "%Y-%m-%d").date(), max_available_date
    )

    # Don't request if start_date is after capped_end_date
    start_dt = datetime.strptime(start_date[:10], "%Y-%m-%d").date()
    if start_dt > capped_end_date:
        logger.info(
            f"PAR data not available yet for {start_date} to {end_date} "
            f"(archive delay: max available is {max_available_date})"
        )
        return {}

    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date[:10],
        "end_date": capped_end_date.strftime("%Y-%m-%d"),
        "daily": "shortwave_radiation_sum",
        "timezone": "UTC",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()

        daily = payload.get("daily", {})
        dates = daily.get("time", [])
        shortwave = daily.get("shortwave_radiation_sum", [])

        par_by_date: Dict[str, float] = {}
        for date_str, sw in zip(dates, shortwave):
            if sw is None:
                continue
            par_by_date[date_str] = float(sw) * 0.48

        logger.info(
            f"Fetched PAR data for {len(par_by_date)} days "
            f"({start_date[:10]} to {capped_end_date})"
        )
        return par_by_date
    except Exception as exc:
        logger.warning(f"Failed to fetch PAR data from Open-Meteo: {exc}")
        return {}


def _window_par_mean(
    start_date: str,
    step_days: int,
    par_by_date: Dict[str, float],
) -> Optional[float]:
    """Compute mean PAR over [start_date, start_date + step_days)."""
    start_dt = datetime.strptime(start_date[:10], "%Y-%m-%d")
    values: List[float] = []

    for offset in range(max(step_days, 1)):
        current = (start_dt + timedelta(days=offset)).strftime("%Y-%m-%d")
        par_value = par_by_date.get(current)
        if par_value is not None:
            values.append(par_value)

    if not values:
        return None
    return sum(values) / len(values)


def _daily_date_range(start_date: str, end_date: str) -> List[str]:
    """Build an inclusive YYYY-MM-DD date range."""
    start_dt = datetime.strptime(start_date[:10], "%Y-%m-%d")
    end_dt = datetime.strptime(end_date[:10], "%Y-%m-%d")
    dates: List[str] = []

    current = start_dt
    while current <= end_dt:
        dates.append(current.strftime("%Y-%m-%d"))
        current += timedelta(days=1)

    return dates


@router.post("/calculate", response_model=IndexCalculationResponse)
async def calculate_indices(
    request: IndexCalculationRequest,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    """Calculate vegetation indices for a given AOI and date range"""
    try:
        # Get satellite provider
        satellite_provider = get_satellite_provider(provider)

        # For GEE provider, use the existing service directly for collection access
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            def _gee_calculate_indices():
                # Get Sentinel-2 collection with AOI-based cloud filtering if requested
                collection = earth_engine_service.get_sentinel2_collection(
                    request.aoi.geometry.model_dump(),
                    request.date_range.start_date,
                    request.date_range.end_date,
                    request.cloud_coverage,
                    use_aoi_cloud_filter=request.use_aoi_cloud_filter,
                    cloud_buffer_meters=request.cloud_buffer_meters,
                )

                # Get the median composite
                composite = collection.median()

                # Calculate requested indices
                index_results = earth_engine_service.calculate_vegetation_indices(
                    composite, [idx.value for idx in request.indices]
                )

                # Calculate mean values for each index
                aoi = ee.Geometry(request.aoi.geometry.model_dump())
                calculated_values = []

                for index_name, index_image in index_results.items():
                    mean_value = (
                        index_image.reduceRegion(
                            reducer=ee.Reducer.mean(),
                            geometry=aoi,
                            scale=request.scale,
                            maxPixels=1e13,
                            # Use native projection to avoid "geometry outside projection validity" errors
                        )
                        .get(index_name)
                        .getInfo()
                    )
                    calculated_values.append(
                        {
                            "index": index_name,
                            "value": mean_value if mean_value is not None else 0.0,
                        }
                    )

                return calculated_values, collection.size().getInfo()

            calculated_values, image_count = await _to_thread(_gee_calculate_indices)
            index_values = [
                IndexValue(
                    index=item["index"],
                    value=item["value"],
                    timestamp=datetime.utcnow(),
                )
                for item in calculated_values
            ]

            return IndexCalculationResponse(
                request_id=str(uuid.uuid4()),
                timestamp=datetime.utcnow(),
                aoi_name=request.aoi.name,
                indices=index_values,
                metadata={
                    "start_date": request.date_range.start_date,
                    "end_date": request.date_range.end_date,
                    "cloud_coverage": request.cloud_coverage,
                    "scale": request.scale,
                    "image_count": image_count,
                    "provider": "Google Earth Engine",
                },
            )
        else:
            # CDSE provider - use the statistics method to get mean values
            index_values = []

            try:
                # Get statistics for all indices at once
                stats_results = await _to_thread(
                    satellite_provider.get_statistics,
                    geometry=request.aoi.geometry.model_dump(),
                    start_date=request.date_range.start_date,
                    end_date=request.date_range.end_date,
                    indices=[idx.value for idx in request.indices],
                )

                for idx in request.indices:
                    if idx.value in stats_results:
                        stats = stats_results[idx.value].statistics
                        mean_val = stats.get("mean", 0.0)
                    else:
                        mean_val = 0.0

                    index_values.append(
                        IndexValue(
                            index=idx.value, value=mean_val, timestamp=datetime.utcnow()
                        )
                    )
            except Exception as e:
                logger.warning(f"Failed to get statistics from CDSE: {e}")
                # Return zero values if statistics fail
                for idx in request.indices:
                    index_values.append(
                        IndexValue(
                            index=idx.value, value=0.0, timestamp=datetime.utcnow()
                        )
                    )

            return IndexCalculationResponse(
                request_id=str(uuid.uuid4()),
                timestamp=datetime.utcnow(),
                aoi_name=request.aoi.name,
                indices=index_values,
                metadata={
                    "start_date": request.date_range.start_date,
                    "end_date": request.date_range.end_date,
                    "cloud_coverage": request.cloud_coverage,
                    "scale": request.scale,
                    "provider": satellite_provider.provider_name,
                },
            )

    except Exception as e:
        logger.error(f"Error calculating indices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/timeseries", response_model=TimeSeriesResponse)
async def get_time_series(
    request: TimeSeriesRequest,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    """Get time series data for a specific vegetation index"""
    try:
        satellite_provider = get_satellite_provider(provider)
        requested_index = request.index.value
        base_index = "NIRv" if requested_index == "NIRvP" else requested_index

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            time_series_data = await _to_thread(
                earth_engine_service.get_time_series,
                request.aoi.geometry.model_dump(),
                request.date_range.start_date,
                request.date_range.end_date,
                base_index,
                request.interval.value,
                max_cloud_coverage=request.cloud_coverage,
                use_aoi_cloud_filter=request.use_aoi_cloud_filter,
            )
        else:
            # Use the provider interface
            ts_result = await _to_thread(
                satellite_provider.get_time_series,
                geometry=request.aoi.geometry.model_dump(),
                start_date=request.date_range.start_date,
                end_date=request.date_range.end_date,
                index=base_index,
                interval=request.interval.value,
            )
            time_series_data = [
                {"date": p.date, "value": p.value} for p in ts_result.data
            ]

        # Build NIRvP = NIRv * PAR for time-series use cases
        if requested_index == "NIRvP":
            centroid = _extract_centroid(request.aoi.geometry.model_dump())
            interval_days = {"day": 1, "week": 7, "month": 30, "year": 365}
            step_days = interval_days.get(request.interval.value, 30)

            par_by_date: Dict[str, float] = {}
            if centroid is not None:
                latitude, longitude = centroid

                # 1) Read cache
                par_by_date = await supabase_service.get_cached_par_data(
                    latitude=latitude,
                    longitude=longitude,
                    start_date=request.date_range.start_date,
                    end_date=request.date_range.end_date,
                )

                # 2) Fetch and persist only missing days
                required_dates = set(
                    _daily_date_range(
                        request.date_range.start_date,
                        request.date_range.end_date,
                    )
                )
                missing_dates = sorted(required_dates - set(par_by_date.keys()))

                if missing_dates:
                    fetched_par = await _fetch_daily_par(
                        latitude=latitude,
                        longitude=longitude,
                        start_date=request.date_range.start_date,
                        end_date=request.date_range.end_date,
                    )
                    if fetched_par:
                        missing_par = {
                            date_key: value
                            for date_key, value in fetched_par.items()
                            if date_key in missing_dates
                        }
                        par_by_date.update(missing_par)

                        if missing_par:
                            await supabase_service.upsert_par_data(
                                latitude=latitude,
                                longitude=longitude,
                                par_by_date=missing_par,
                            )
                    else:
                        logger.warning(
                            "PAR fetch returned no data for NIRvP "
                            f"({request.date_range.start_date} -> {request.date_range.end_date})"
                        )

            fallback_par = (
                sum(par_by_date.values()) / len(par_by_date) if par_by_date else None
            )

            nirvp_series = []
            for point in time_series_data:
                point_date = str(point["date"])[:10]
                par_mean = _window_par_mean(point_date, step_days, par_by_date)
                if par_mean is None:
                    par_mean = fallback_par
                if par_mean is None:
                    logger.warning(
                        f"Skipping NIRvP point {point_date}: no PAR data available"
                    )
                    continue
                nirvp_series.append(
                    {
                        "date": point_date,
                        "value": float(point["value"]) * float(par_mean),
                    }
                )
            time_series_data = nirvp_series

        # Calculate statistics
        if time_series_data:
            values = [
                point["value"]
                for point in time_series_data
                if point["value"] is not None
            ]
            if values:
                import numpy as np

                statistics = {
                    "mean": float(np.mean(values)),
                    "std": float(np.std(values)),
                    "min": float(np.min(values)),
                    "max": float(np.max(values)),
                    "median": float(np.median(values)),
                }
            else:
                statistics = None
        else:
            statistics = None

        return TimeSeriesResponse(
            index=requested_index,
            aoi_name=request.aoi.name,
            start_date=request.date_range.start_date,
            end_date=request.date_range.end_date,
            data=time_series_data,
            statistics=statistics,
        )

    except Exception as e:
        logger.error(f"Error getting time series: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export")
async def export_index_map(
    request: ExportRequest,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    """Export vegetation index map as GeoTIFF or interactive data"""
    try:
        satellite_provider = get_satellite_provider(provider)

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            result = await _to_thread(
                _run_coro_sync,
                earth_engine_service.export_index_map,
                request.aoi.geometry.model_dump(),
                request.date,
                request.index.value,
                request.scale,
                interactive=request.interactive,
            )
        else:
            # Use the provider interface for CDSE and other providers
            result = await _to_thread(
                _run_coro_sync,
                satellite_provider.export_index_map,
                geometry=request.aoi.geometry.model_dump(),
                date=request.date,
                index=request.index.value,
                scale=request.scale,
                interactive=request.interactive,
            )

        if request.interactive:
            # Return interactive data for ECharts
            return HeatmapDataResponse(**result)
        else:
            # Return traditional export response
            from datetime import timedelta

            expires_at = datetime.utcnow() + timedelta(hours=24)

            # Handle different result formats from providers
            download_url = (
                result.get("url", "")
                if isinstance(result, dict)
                else getattr(result, "url", "")
            )

            return ExportResponse(
                request_id=str(uuid.uuid4()),
                download_url=download_url,
                expires_at=expires_at,
                file_format=request.format,
                index=request.index.value,
                metadata={
                    "date": request.date,
                    "scale": request.scale,
                    "aoi_name": request.aoi.name,
                },
            )

    except Exception as e:
        logger.error(f"Error exporting index map: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interactive", response_model=InteractiveDataResponse)
async def get_interactive_data(
    request: InteractiveRequest,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    """Get interactive pixel data for scatter plot visualization"""
    try:
        satellite_provider = get_satellite_provider(provider)

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            data = await _to_thread(
                _run_coro_sync,
                earth_engine_service.export_interactive_data,
                request.aoi.geometry.model_dump(),
                request.date,
                request.index.value,
                request.scale,
                request.max_pixels,
            )
        else:
            # Use the provider interface for CDSE and other providers
            data = await _to_thread(
                _run_coro_sync,
                satellite_provider.export_interactive_data,
                geometry=request.aoi.geometry.model_dump(),
                date=request.date,
                index=request.index.value,
                scale=request.scale,
                max_pixels=request.max_pixels,
            )

        return InteractiveDataResponse(**data)

    except Exception as e:
        logger.error(f"Error getting interactive data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/heatmap", response_model=HeatmapDataResponse)
async def get_heatmap_data(
    request: HeatmapRequest,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    """Get heatmap data for ECharts heatmap visualization"""
    try:
        satellite_provider = get_satellite_provider(provider)

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            data = await _to_thread(
                _run_coro_sync,
                earth_engine_service.export_heatmap_data,
                request.aoi.geometry.model_dump(),
                request.date,
                request.index.value,
                request.grid_size,
            )
        else:
            # Use the provider interface for CDSE and other providers
            data = await _to_thread(
                _run_coro_sync,
                satellite_provider.export_heatmap_data,
                geometry=request.aoi.geometry.model_dump(),
                date=request.date,
                index=request.index.value,
                grid_size=request.grid_size,
            )

        # Convert dataclass to dict for response
        if hasattr(data, "model_dump"):
            # Pydantic model
            data_dict = data.model_dump()
        elif hasattr(data, "__dict__"):
            # Dataclass
            data_dict = data.__dict__
        else:
            # Dict
            data_dict = data
        return HeatmapDataResponse(**data_dict)

    except ValueError as e:
        logger.warning(f"No heatmap data available: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting heatmap data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/available", response_model=List[str])
async def get_available_indices():
    """Get list of available vegetation indices"""
    from app.models.schemas import VegetationIndex

    return [idx.value for idx in VegetationIndex]


@router.get("/provider-info")
async def get_provider_info():
    """Get information about available and configured satellite providers"""
    from app.services.satellite.factory import get_provider_info

    return get_provider_info()


@router.post("/available-dates")
async def get_available_dates(
    request: Dict,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    """Get dates with available satellite imagery for a given AOI and date range"""
    try:
        # Parse request parameters
        aoi_geometry = request.get("aoi", {}).get("geometry")
        start_date = request.get("start_date")
        end_date = request.get("end_date")
        max_cloud_coverage = request.get("cloud_coverage", 30)

        if not all([aoi_geometry, start_date, end_date]):
            raise HTTPException(status_code=400, detail="Missing required parameters")

        # Get satellite provider
        satellite_provider = get_satellite_provider(provider)

        logger.info(f"Using provider: {satellite_provider.provider_name}")

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            # Initialize Earth Engine
            earth_engine_service.initialize()

            aoi = ee.Geometry(aoi_geometry)

            # For available-dates we use TILE-LEVEL cloud metadata only.
            # AOI-based per-pixel cloud filtering is too slow for a date
            # discovery query and causes 504 timeouts.  The detailed
            # AOI-level filtering is applied later when the user selects a
            # date for heatmap / timeseries analysis.
            end_dt_inclusive = (
                datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            ).strftime("%Y-%m-%d")

            collection = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(aoi)
                .filterDate(start_date, end_dt_inclusive)
                .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", max_cloud_coverage))
            )

            # Extract date info in a single getInfo() call
            def extract_date_info(image):
                date = ee.Date(image.get("system:time_start"))
                return ee.Feature(
                    None,
                    {
                        "date": date.format("YYYY-MM-dd"),
                        "cloud_coverage": image.get("CLOUDY_PIXEL_PERCENTAGE"),
                        "timestamp": date.millis(),
                    },
                )

            def _gee_get_dates():
                features = collection.map(extract_date_info)
                return (
                    features.reduceColumns(
                        ee.Reducer.toList(3), ["date", "cloud_coverage", "timestamp"]
                    )
                    .get("list")
                    .getInfo()
                )

            date_info = await _to_thread(_gee_get_dates)

            if not date_info:
                logger.warning(
                    f"No images found for AOI in date range {start_date} to {end_date} "
                    f"with cloud coverage < {max_cloud_coverage}%"
                )
                return {
                    "available_dates": [],
                    "total_images": 0,
                    "date_range": {"start": start_date, "end": end_date},
                    "filters": {"max_cloud_coverage": max_cloud_coverage},
                    "debug_info": {
                        "message": "No Sentinel-2 images found for this location and time period",
                        "suggestion": "Try increasing cloud coverage threshold or expanding date range",
                    },
                    "provider": satellite_provider.provider_name,
                }

            # Process and deduplicate dates
            dates_dict = {}
            for item in date_info:
                if item and len(item) >= 3:
                    date_str = item[0]
                    cloud_coverage = item[1]
                    timestamp = item[2]

                    # Keep the image with lowest cloud coverage for each date
                    if (
                        date_str not in dates_dict
                        or dates_dict[date_str]["cloud_coverage"] > cloud_coverage
                    ):
                        dates_dict[date_str] = {
                            "date": date_str,
                            "cloud_coverage": round(cloud_coverage, 2),
                            "timestamp": timestamp,
                            "available": True,
                        }

            # Sort by date and return
            available_dates = sorted(dates_dict.values(), key=lambda x: x["date"])

            return {
                "available_dates": available_dates,
                "total_images": len(available_dates),
                "date_range": {"start": start_date, "end": end_date},
                "filters": {"max_cloud_coverage": max_cloud_coverage},
                "provider": satellite_provider.provider_name,
            }
        else:
            # Use the provider interface for CDSE and other providers
            result = await _to_thread(
                satellite_provider.get_available_dates,
                geometry=aoi_geometry,
                start_date=start_date,
                end_date=end_date,
                max_cloud_coverage=max_cloud_coverage,
            )

            # Ensure provider info is in the response
            if "provider" not in result:
                result["provider"] = satellite_provider.provider_name

            return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting available dates: {e}")
        raise HTTPException(status_code=500, detail=str(e))
