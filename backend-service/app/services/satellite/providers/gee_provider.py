"""
Google Earth Engine (GEE) Satellite Provider

Wraps the existing EarthEngineService to implement the ISatelliteProvider interface.
This provider serves as the development/fallback option for satellite data access.
"""

import logging
from typing import Dict, List, Optional, Any, Union
import ee

from app.services.satellite.interfaces import (
    ISatelliteProvider,
    CloudCoverageInfo,
    TimeSeries,
    TimeSeriesPoint,
    HeatmapData,
    ExportResult,
    StatisticsResult,
)
from app.services.earth_engine import earth_engine_service
from app.services.satellite.types import parse_geometry
from app.services.satellite.utils.sentinel2_dates import dedupe_s2_available_dates_by_day

logger = logging.getLogger(__name__)


def _gee_ts_item_to_point(item: Dict[str, Any]) -> TimeSeriesPoint:
    """Build provider TimeSeriesPoint from earth_engine_service.get_time_series dict."""
    v = item.get("value")
    if v is None:
        raise ValueError("time series item missing value")
    kwargs: Dict[str, Any] = {
        "date": str(item.get("date", "")),
        "value": float(v),
    }
    for key in (
        "min_value",
        "max_value",
        "std_value",
        "median_value",
        "percentile_25",
        "percentile_75",
        "percentile_90",
    ):
        raw = item.get(key)
        if raw is not None:
            try:
                kwargs[key] = float(raw)
            except (TypeError, ValueError):
                pass
    pc = item.get("pixel_count")
    if pc is not None:
        try:
            kwargs["pixel_count"] = int(pc)
        except (TypeError, ValueError):
            pass
    cc = item.get("cloud_coverage")
    if cc is not None:
        try:
            kwargs["cloud_coverage"] = float(cc)
        except (TypeError, ValueError):
            pass
    return TimeSeriesPoint(**kwargs)


class GEEProvider(ISatelliteProvider):
    """
    Google Earth Engine provider implementation.

    Wraps the existing EarthEngineService singleton to provide a unified
    interface compatible with other satellite providers.
    """

    def __init__(self):
        """Initialize the GEE provider"""
        self._provider_name = "Google Earth Engine"
        self._initialized = False

    def initialize(self) -> None:
        """Initialize the GEE provider using the existing earth_engine_service"""
        try:
            earth_engine_service.initialize()
            self._initialized = True
            logger.info("GEE Provider initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize GEE Provider: {e}")
            raise

    def check_cloud_coverage(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        max_cloud_coverage: float = 10.0,
    ) -> CloudCoverageInfo:
        """
        Check cloud coverage for available images in the date range.

        Delegates to earth_engine_service.check_cloud_coverage().
        """
        self._ensure_initialized()

        result = earth_engine_service.check_cloud_coverage(
            geometry=geometry,
            start_date=start_date,
            end_date=end_date,
            max_cloud_coverage=max_cloud_coverage,
        )

        return CloudCoverageInfo(
            has_suitable_images=result.get("has_suitable_images", False),
            available_images_count=result.get("available_images_count", 0),
            suitable_images_count=result.get("suitable_images_count", 0),
            min_cloud_coverage=result.get("min_cloud_coverage"),
            max_cloud_coverage=result.get("max_cloud_coverage"),
            avg_cloud_coverage=result.get("avg_cloud_coverage"),
            recommended_date=result.get("recommended_date"),
            metadata=result.get("metadata", {}),
        )

    def calculate_vegetation_indices(
        self,
        image: Any,
        indices: List[str],
    ) -> Dict[str, Any]:
        """
        Calculate vegetation indices for an image.

        Args:
            image: ee.Image object
            indices: List of index names to calculate

        Returns:
            Dictionary mapping index names to ee.Image objects
        """
        self._ensure_initialized()

        if not isinstance(image, ee.Image):
            raise TypeError(f"Expected ee.Image, got {type(image)}")

        return earth_engine_service.calculate_vegetation_indices(image, indices)

    def get_time_series(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        index: str,
        interval: str = "month",
    ) -> TimeSeries:
        """
        Get time series data for a specific vegetation index.

        Delegates to earth_engine_service.get_time_series().
        """
        self._ensure_initialized()

        data = earth_engine_service.get_time_series(
            geometry=geometry,
            start_date=start_date,
            end_date=end_date,
            index=index,
            interval=interval,
            use_aoi_cloud_filter=False,
        )

        time_series_points: List[TimeSeriesPoint] = []
        for item in data:
            try:
                time_series_points.append(_gee_ts_item_to_point(item))
            except (ValueError, TypeError) as e:
                logger.debug(f"Skipping invalid time series item: {item!r} ({e})")

        # Calculate statistics
        values = [p.value for p in time_series_points if p.value is not None]
        statistics = None
        if values:
            import numpy as np
            statistics = {
                "mean": float(np.mean(values)),
                "std": float(np.std(values)),
                "min": float(np.min(values)),
                "max": float(np.max(values)),
                "median": float(np.median(values)),
            }

        return TimeSeries(
            index=index,
            aoi_name=None,
            start_date=start_date,
            end_date=end_date,
            data=time_series_points,
            statistics=statistics,
            metadata={"provider": self.provider_name},
        )

    async def export_heatmap_data(
        self,
        geometry: Dict,
        date: str,
        index: str,
        grid_size: int = 1000,
    ) -> HeatmapData:
        """
        Export heatmap data for visualization.

        Delegates to earth_engine_service.export_heatmap_data().
        """
        self._ensure_initialized()

        data = await earth_engine_service.export_heatmap_data(
            geometry=geometry,
            date=date,
            index=index,
            sample_points=grid_size,
        )

        return HeatmapData(
            date=data.get("date", date),
            index=data.get("index", index),
            bounds=data.get("bounds", {}),
            pixel_data=data.get("pixel_data", []),
            aoi_boundary=data.get("aoi_boundary", []),
            statistics=data.get("statistics", {}),
            visualization=data.get("visualization", {}),
            metadata={
                **data.get("metadata", {}),
                "provider": self.provider_name,
            },
        )

    async def export_interactive_data(
        self,
        geometry: Dict,
        date: str,
        index: str,
        scale: int = 30,
        max_pixels: int = 10000,
    ) -> HeatmapData:
        """
        Export interactive pixel data for scatter plot visualization.

        Delegates to earth_engine_service.export_interactive_data().
        """
        self._ensure_initialized()

        data = await earth_engine_service.export_interactive_data(
            geometry=geometry,
            date=date,
            index=index,
            scale=scale,
            max_pixels=max_pixels,
        )

        return HeatmapData(
            date=data.get("date", date),
            index=data.get("index", index),
            bounds=data.get("bounds", {}),
            pixel_data=data.get("pixel_data", []),
            aoi_boundary=[],
            statistics=data.get("statistics", {}),
            visualization=data.get("visualization", {}),
            metadata={
                **data.get("metadata", {}),
                "provider": self.provider_name,
            },
        )

    async def export_index_map(
        self,
        geometry: Dict,
        date: str,
        index: str,
        scale: int = 10,
        organization_id: Optional[str] = None,
        interactive: bool = False,
    ) -> Union[ExportResult, HeatmapData]:
        """
        Export vegetation index map as GeoTIFF or interactive data.

        Delegates to earth_engine_service.export_index_map().
        """
        self._ensure_initialized()

        result = await earth_engine_service.export_index_map(
            geometry=geometry,
            date=date,
            index=index,
            scale=scale,
            organization_id=organization_id,
            interactive=interactive,
        )

        if interactive or isinstance(result, dict):
            # Return as HeatmapData for interactive mode
            return HeatmapData(
                date=result.get("date", date),
                index=result.get("index", index),
                bounds=result.get("bounds", {}),
                pixel_data=result.get("pixel_data", []),
                aoi_boundary=result.get("aoi_boundary", []),
                statistics=result.get("statistics", {}),
                visualization=result.get("visualization", {}),
                metadata={
                    **result.get("metadata", {}),
                    "provider": self.provider_name,
                },
            )

        # Return as ExportResult for static export
        return ExportResult(
            url=result.get("url", ""),
            file_format="GeoTIFF",
            metadata={
                **result.get("metadata", {}),
                "provider": self.provider_name,
            },
        )

    def get_statistics(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        indices: List[str],
    ) -> Dict[str, StatisticsResult]:
        """
        Calculate statistics for multiple indices over a date range.

        Delegates to earth_engine_service.get_statistics().
        """
        self._ensure_initialized()

        stats = earth_engine_service.get_statistics(
            geometry=geometry,
            start_date=start_date,
            end_date=end_date,
            indices=indices,
        )

        results = {}
        for index_name, index_stats in stats.items():
            results[index_name] = StatisticsResult(
                index=index_name,
                statistics=index_stats,
                metadata={"provider": self.provider_name},
            )

        return results

    def get_available_dates(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        max_cloud_coverage: float = 30.0,
    ) -> Dict[str, Any]:
        """
        Get dates with available satellite imagery.

        Returns available dates with cloud coverage information.
        """
        self._ensure_initialized()

        # For available-dates use tile-level cloud metadata only (no AOI
        # per-pixel filtering) to keep the query fast.
        collection = earth_engine_service.get_sentinel2_collection(
            geometry=geometry,
            start_date=start_date,
            end_date=end_date,
            max_cloud_coverage=max_cloud_coverage,
        )

        # Get image dates and metadata
        import ee
        aoi = ee.Geometry(geometry)

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

                if date_str not in dates_dict or dates_dict[date_str]['cloud_coverage'] > cloud_coverage:
                    dates_dict[date_str] = {
                        'date': date_str,
                        'cloud_coverage': round(cloud_coverage, 2) if cloud_coverage else 0,
                        'timestamp': timestamp,
                        'available': True
                    }

        # Sort by date; dedupe if multiple images share a calendar day for this AOI
        available_dates = dedupe_s2_available_dates_by_day(
            sorted(dates_dict.values(), key=lambda x: x["date"])
        )

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
            "metadata": {
                "provider": self.provider_name,
            }
        }

    @property
    def provider_name(self) -> str:
        """Return the name of this provider"""
        return self._provider_name

    @property
    def is_initialized(self) -> bool:
        """Check if provider is initialized and authenticated"""
        return self._initialized

    def _ensure_initialized(self) -> None:
        """Ensure the provider is initialized before use"""
        if not self._initialized:
            self.initialize()
