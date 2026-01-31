from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import List, Dict, Optional
import uuid
from datetime import datetime
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
    ErrorResponse
)
from app.services.satellite import get_satellite_provider
import logging
import ee

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/calculate", response_model=IndexCalculationResponse)
async def calculate_indices(
    request: IndexCalculationRequest,
    provider: Optional[str] = Query(None, description="Satellite provider (gee, cdse, or auto)")
):
    """Calculate vegetation indices for a given AOI and date range"""
    try:
        # Get satellite provider
        satellite_provider = get_satellite_provider(provider)

        # For GEE provider, use the existing service directly for collection access
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            # Get Sentinel-2 collection with AOI-based cloud filtering if requested
            collection = earth_engine_service.get_sentinel2_collection(
                request.aoi.geometry.model_dump(),
                request.date_range.start_date,
                request.date_range.end_date,
                request.cloud_coverage,
                use_aoi_cloud_filter=request.use_aoi_cloud_filter,
                cloud_buffer_meters=request.cloud_buffer_meters
            )

            # Get the median composite
            import ee
            composite = collection.median()

            # Calculate requested indices
            index_results = earth_engine_service.calculate_vegetation_indices(
                composite,
                [idx.value for idx in request.indices]
            )

            # Calculate mean values for each index
            aoi = ee.Geometry(request.aoi.geometry.model_dump())
            index_values = []

            for index_name, index_image in index_results.items():
                mean_value = index_image.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=aoi,
                    scale=request.scale,
                    maxPixels=1e13
                ).get(index_name).getInfo()

                index_values.append(IndexValue(
                    index=index_name,
                    value=mean_value if mean_value is not None else 0.0,
                    timestamp=datetime.utcnow()
                ))

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
                    "image_count": collection.size().getInfo(),
                    "provider": "Google Earth Engine"
                }
            )
        else:
            # CDSE provider - use the statistics method to get mean values
            index_values = []

            try:
                # Get statistics for all indices at once
                stats_results = satellite_provider.get_statistics(
                    geometry=request.aoi.geometry.model_dump(),
                    start_date=request.date_range.start_date,
                    end_date=request.date_range.end_date,
                    indices=[idx.value for idx in request.indices]
                )

                for idx in request.indices:
                    if idx.value in stats_results:
                        stats = stats_results[idx.value].statistics
                        mean_val = stats.get("mean", 0.0)
                    else:
                        mean_val = 0.0

                    index_values.append(IndexValue(
                        index=idx.value,
                        value=mean_val,
                        timestamp=datetime.utcnow()
                    ))
            except Exception as e:
                logger.warning(f"Failed to get statistics from CDSE: {e}")
                # Return zero values if statistics fail
                for idx in request.indices:
                    index_values.append(IndexValue(
                        index=idx.value,
                        value=0.0,
                        timestamp=datetime.utcnow()
                    ))

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
                    "provider": satellite_provider.provider_name
                }
            )

    except Exception as e:
        logger.error(f"Error calculating indices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/timeseries", response_model=TimeSeriesResponse)
async def get_time_series(
    request: TimeSeriesRequest,
    provider: Optional[str] = Query(None, description="Satellite provider (gee, cdse, or auto)")
):
    """Get time series data for a specific vegetation index"""
    try:
        satellite_provider = get_satellite_provider(provider)

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service
            time_series_data = earth_engine_service.get_time_series(
                request.aoi.geometry.model_dump(),
                request.date_range.start_date,
                request.date_range.end_date,
                request.index.value,
                request.interval.value
            )
        else:
            # Use the provider interface
            ts_result = satellite_provider.get_time_series(
                geometry=request.aoi.geometry.model_dump(),
                start_date=request.date_range.start_date,
                end_date=request.date_range.end_date,
                index=request.index.value,
                interval=request.interval.value
            )
            time_series_data = [{"date": p.date, "value": p.value} for p in ts_result.data]
        
        # Calculate statistics
        if time_series_data:
            values = [point['value'] for point in time_series_data if point['value'] is not None]
            if values:
                import numpy as np
                statistics = {
                    "mean": float(np.mean(values)),
                    "std": float(np.std(values)),
                    "min": float(np.min(values)),
                    "max": float(np.max(values)),
                    "median": float(np.median(values))
                }
            else:
                statistics = None
        else:
            statistics = None
        
        return TimeSeriesResponse(
            index=request.index.value,
            aoi_name=request.aoi.name,
            start_date=request.date_range.start_date,
            end_date=request.date_range.end_date,
            data=time_series_data,
            statistics=statistics
        )
    
    except Exception as e:
        logger.error(f"Error getting time series: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export")
async def export_index_map(
    request: ExportRequest,
    provider: Optional[str] = Query(None, description="Satellite provider (gee, cdse, or auto)")
):
    """Export vegetation index map as GeoTIFF or interactive data"""
    try:
        satellite_provider = get_satellite_provider(provider)

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service
            result = await earth_engine_service.export_index_map(
                request.aoi.geometry.model_dump(),
                request.date,
                request.index.value,
                request.scale,
                interactive=request.interactive
            )
        else:
            # Use the provider interface for CDSE and other providers
            result = await satellite_provider.export_index_map(
                geometry=request.aoi.geometry.model_dump(),
                date=request.date,
                index=request.index.value,
                scale=request.scale,
                interactive=request.interactive
            )

        if request.interactive:
            # Return interactive data for ECharts
            return HeatmapDataResponse(**result)
        else:
            # Return traditional export response
            from datetime import timedelta
            expires_at = datetime.utcnow() + timedelta(hours=24)

            # Handle different result formats from providers
            download_url = result.get("url", "") if isinstance(result, dict) else getattr(result, "url", "")

            return ExportResponse(
                request_id=str(uuid.uuid4()),
                download_url=download_url,
                expires_at=expires_at,
                file_format=request.format,
                index=request.index.value,
                metadata={
                    "date": request.date,
                    "scale": request.scale,
                    "aoi_name": request.aoi.name
                }
            )

    except Exception as e:
        logger.error(f"Error exporting index map: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/interactive", response_model=InteractiveDataResponse)
async def get_interactive_data(
    request: InteractiveRequest,
    provider: Optional[str] = Query(None, description="Satellite provider (gee, cdse, or auto)")
):
    """Get interactive pixel data for scatter plot visualization"""
    try:
        satellite_provider = get_satellite_provider(provider)

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service
            data = await earth_engine_service.export_interactive_data(
                request.aoi.geometry.model_dump(),
                request.date,
                request.index.value,
                request.scale,
                request.max_pixels
            )
        else:
            # Use the provider interface for CDSE and other providers
            data = await satellite_provider.export_interactive_data(
                geometry=request.aoi.geometry.model_dump(),
                date=request.date,
                index=request.index.value,
                scale=request.scale,
                max_pixels=request.max_pixels
            )

        return InteractiveDataResponse(**data)

    except Exception as e:
        logger.error(f"Error getting interactive data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/heatmap", response_model=HeatmapDataResponse)
async def get_heatmap_data(
    request: HeatmapRequest,
    provider: Optional[str] = Query(None, description="Satellite provider (gee, cdse, or auto)")
):
    """Get heatmap data for ECharts heatmap visualization"""
    try:
        satellite_provider = get_satellite_provider(provider)

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service
            data = await earth_engine_service.export_heatmap_data(
                request.aoi.geometry.model_dump(),
                request.date,
                request.index.value,
                request.grid_size
            )
        else:
            # Use the provider interface for CDSE and other providers
            data = await satellite_provider.export_heatmap_data(
                geometry=request.aoi.geometry.model_dump(),
                date=request.date,
                index=request.index.value,
                grid_size=request.grid_size
            )

        # Convert dataclass to dict for response
        if hasattr(data, 'model_dump'):
            # Pydantic model
            data_dict = data.model_dump()
        elif hasattr(data, '__dict__'):
            # Dataclass
            data_dict = data.__dict__
        else:
            # Dict
            data_dict = data
        return HeatmapDataResponse(**data_dict)

    except Exception as e:
        logger.error(f"Error getting heatmap data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available", response_model=List[str])
async def get_available_indices(
    provider: Optional[str] = Query(None, description="Satellite provider (gee, cdse, or auto)")
):
    """Get list of available vegetation indices"""
    from app.models.schemas import VegetationIndex

    # Get provider info to see which indices are supported
    satellite_provider = get_satellite_provider(provider)

    # All providers support the same indices for now
    return [idx.value for idx in VegetationIndex]


@router.get("/provider-info")
async def get_provider_info():
    """Get information about available and configured satellite providers"""
    from app.services.satellite.factory import get_provider_info

    return get_provider_info()

@router.post("/available-dates")
async def get_available_dates(
    request: Dict,
    provider: Optional[str] = Query(None, description="Satellite provider (gee, cdse, or auto)")
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

            # Get Sentinel-2 collection
            aoi = ee.Geometry(aoi_geometry)

            # Try with AOI-based cloud filtering first
            collection = earth_engine_service.get_sentinel2_collection(
                aoi_geometry,
                start_date,
                end_date,
                max_cloud_coverage,
                use_aoi_cloud_filter=True,
                cloud_buffer_meters=300
            )

            # Check collection size first
            collection_size = collection.size().getInfo()
            logger.info(f"Collection size with AOI cloud filter: {collection_size}")

            # If no images found with AOI filtering, try without it (fallback)
            if collection_size == 0:
                logger.info("No images with AOI cloud filter, trying tile-based filtering...")
                collection = earth_engine_service.get_sentinel2_collection(
                    aoi_geometry,
                    start_date,
                    end_date,
                    max_cloud_coverage,
                    use_aoi_cloud_filter=False  # Disable AOI-based filtering
                )
                collection_size = collection.size().getInfo()
                logger.info(f"Collection size with tile-based filter: {collection_size}")

            if collection_size == 0:
                logger.warning(f"No images found for AOI in date range {start_date} to {end_date} with cloud coverage < {max_cloud_coverage}%")
                return {
                    "available_dates": [],
                    "total_images": 0,
                    "date_range": {
                        "start": start_date,
                        "end": end_date
                    },
                    "filters": {
                        "max_cloud_coverage": max_cloud_coverage
                    },
                    "debug_info": {
                        "message": "No Sentinel-2 images found for this location and time period",
                        "suggestion": "Try increasing cloud coverage threshold or expanding date range"
                    },
                    "provider": satellite_provider.provider_name
                }

            # Get image dates and cloud coverage
            def extract_date_info(image):
                date = ee.Date(image.get('system:time_start'))
                return ee.Feature(None, {
                    'date': date.format('YYYY-MM-dd'),
                    'cloud_coverage': image.get('CLOUDY_PIXEL_PERCENTAGE'),
                    'timestamp': date.millis()
                })

            features = collection.map(extract_date_info)
            date_info = features.reduceColumns(
                ee.Reducer.toList(3), ['date', 'cloud_coverage', 'timestamp']
            ).get('list').getInfo()

            # Process and deduplicate dates
            dates_dict = {}
            for item in date_info:
                if item and len(item) >= 3:
                    date_str = item[0]
                    cloud_coverage = item[1]
                    timestamp = item[2]

                    # Keep the image with lowest cloud coverage for each date
                    if date_str not in dates_dict or dates_dict[date_str]['cloud_coverage'] > cloud_coverage:
                        dates_dict[date_str] = {
                            'date': date_str,
                            'cloud_coverage': round(cloud_coverage, 2),
                            'timestamp': timestamp,
                            'available': True
                        }

            # Sort by date and return
            available_dates = sorted(dates_dict.values(), key=lambda x: x['date'])

            return {
                "available_dates": available_dates,
                "total_images": len(available_dates),
                "date_range": {
                    "start": start_date,
                    "end": end_date
                },
                "filters": {
                    "max_cloud_coverage": max_cloud_coverage
                },
                "provider": satellite_provider.provider_name
            }
        else:
            # Use the provider interface for CDSE and other providers
            result = satellite_provider.get_available_dates(
                geometry=aoi_geometry,
                start_date=start_date,
                end_date=end_date,
                max_cloud_coverage=max_cloud_coverage
            )

            # Ensure provider info is in the response
            if "provider" not in result:
                result["provider"] = satellite_provider.provider_name

            return result

    except Exception as e:
        logger.error(f"Error getting available dates: {e}")
        raise HTTPException(status_code=500, detail=str(e))