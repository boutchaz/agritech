"""
Satellite Service Provider Interface

Defines the abstract interface that all satellite data providers must implement.
This allows for provider-agnostic access to satellite data from different sources.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum


class ProviderType(str, Enum):
    """Supported satellite data provider types"""
    GEE = "gee"
    CDSE = "cdse"
    AUTO = "auto"


@dataclass
class SatelliteResult:
    """Base result class for satellite operations"""
    provider: str
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VegetationIndices:
    """Result of vegetation index calculations"""
    indices: Dict[str, Any]  # index_name -> computed data
    statistics: Dict[str, Dict[str, float]] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class HeatmapData:
    """Heatmap visualization data"""
    date: str
    index: str
    bounds: Dict[str, float]  # min_lon, max_lon, min_lat, max_lat
    pixel_data: List[Dict[str, float]]  # [{lon, lat, value}, ...]
    aoi_boundary: List[List[float]]
    statistics: Dict[str, float]
    visualization: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TimeSeriesPoint:
    """Single point in a time series"""
    date: str
    value: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TimeSeries:
    """Time series data for a vegetation index"""
    index: str
    aoi_name: Optional[str]
    start_date: str
    end_date: str
    data: List[TimeSeriesPoint]
    statistics: Optional[Dict[str, float]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CloudCoverageInfo:
    """Cloud coverage information"""
    has_suitable_images: bool
    available_images_count: int
    suitable_images_count: int
    min_cloud_coverage: Optional[float]
    max_cloud_coverage: Optional[float]
    avg_cloud_coverage: Optional[float]
    recommended_date: Optional[str]
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExportResult:
    """Result of export operation"""
    url: str
    file_format: str
    expires_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class StatisticsResult:
    """Statistical analysis result"""
    index: str
    statistics: Dict[str, float]
    metadata: Dict[str, Any] = field(default_factory=dict)


class ISatelliteProvider(ABC):
    """
    Abstract interface for satellite data providers.

    All providers must implement these methods to ensure compatibility
    with the rest of the application.
    """

    @abstractmethod
    def initialize(self) -> None:
        """
        Initialize the provider and authenticate with the service.

        Should handle any necessary authentication, connection setup,
        and validation of credentials.
        """
        pass

    @abstractmethod
    def check_cloud_coverage(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        max_cloud_coverage: float = 10.0,
    ) -> CloudCoverageInfo:
        """
        Check cloud coverage for available images in the date range.

        Args:
            geometry: AOI geometry (GeoJSON format)
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            max_cloud_coverage: Maximum acceptable cloud coverage percentage

        Returns:
            CloudCoverageInfo with cloud coverage statistics
        """
        pass

    @abstractmethod
    def calculate_vegetation_indices(
        self,
        image: Any,
        indices: List[str],
    ) -> Dict[str, Any]:
        """
        Calculate vegetation indices for an image.

        Args:
            image: Provider-specific image object
            indices: List of index names to calculate (e.g., ["NDVI", "NDRE"])

        Returns:
            Dictionary mapping index names to computed data
        """
        pass

    @abstractmethod
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

        Args:
            geometry: AOI geometry (GeoJSON format)
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            index: Vegetation index name
            interval: Aggregation interval (day, week, month, year)

        Returns:
            TimeSeries with data points and statistics
        """
        pass

    @abstractmethod
    def export_heatmap_data(
        self,
        geometry: Dict,
        date: str,
        index: str,
        grid_size: int = 1000,
    ) -> HeatmapData:
        """
        Export heatmap data for visualization.

        Args:
            geometry: AOI geometry (GeoJSON format)
            date: Date (YYYY-MM-DD)
            index: Vegetation index name
            grid_size: Maximum number of pixels to sample

        Returns:
            HeatmapData with pixel coordinates and values
        """
        pass

    @abstractmethod
    def export_interactive_data(
        self,
        geometry: Dict,
        date: str,
        index: str,
        scale: int = 30,
        max_pixels: int = 10000,
    ) -> HeatmapData:
        """
        Export interactive pixel data for scatter plot visualization.

        Args:
            geometry: AOI geometry (GeoJSON format)
            date: Date (YYYY-MM-DD)
            index: Vegetation index name
            scale: Pixel scale in meters
            max_pixels: Maximum number of pixels to sample

        Returns:
            HeatmapData with pixel coordinates and values
        """
        pass

    @abstractmethod
    def export_index_map(
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

        Args:
            geometry: AOI geometry (GeoJSON format)
            date: Date (YYYY-MM-DD)
            index: Vegetation index name
            scale: Pixel scale in meters
            organization_id: Optional organization ID for storage caching
            interactive: If True, return interactive data instead of export URL

        Returns:
            ExportResult with download URL or HeatmapData if interactive=True
        """
        pass

    @abstractmethod
    def get_statistics(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        indices: List[str],
    ) -> Dict[str, StatisticsResult]:
        """
        Calculate statistics for multiple indices over a date range.

        Args:
            geometry: AOI geometry (GeoJSON format)
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            indices: List of index names to analyze

        Returns:
            Dictionary mapping index names to StatisticsResult
        """
        pass

    @abstractmethod
    def get_available_dates(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        max_cloud_coverage: float = 30.0,
    ) -> Dict[str, Any]:
        """
        Get dates with available satellite imagery.

        Args:
            geometry: AOI geometry (GeoJSON format)
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            max_cloud_coverage: Maximum cloud coverage percentage

        Returns:
            Dictionary with available dates and metadata
        """
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the name of this provider"""
        pass

    @property
    @abstractmethod
    def is_initialized(self) -> bool:
        """Check if provider is initialized and authenticated"""
        pass
