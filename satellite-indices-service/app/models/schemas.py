from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional, Any, Union
from datetime import datetime
from enum import Enum
import uuid

class VegetationIndex(str, Enum):
    NDVI = "NDVI"
    NDRE = "NDRE"
    NDMI = "NDMI"
    MNDWI = "MNDWI"
    GCI = "GCI"
    SAVI = "SAVI"
    OSAVI = "OSAVI"
    MSAVI2 = "MSAVI2"
    PRI = "PRI"
    MSI = "MSI"
    MCARI = "MCARI"
    TCARI = "TCARI"

class TimeInterval(str, Enum):
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"

class GeometryType(str, Enum):
    POINT = "Point"
    POLYGON = "Polygon"
    MULTIPOLYGON = "MultiPolygon"

class GeoJSON(BaseModel):
    type: GeometryType
    coordinates: List[Any]
    
    @field_validator('coordinates')
    @classmethod
    def validate_coordinates(cls, v, info):
        geometry_type = info.data.get('type') if info.data else None
        if geometry_type == GeometryType.POINT:
            if len(v) != 2:
                raise ValueError("Point must have exactly 2 coordinates")
        elif geometry_type == GeometryType.POLYGON:
            if not v or not all(isinstance(ring, list) for ring in v):
                raise ValueError("Polygon coordinates must be a list of rings")
        return v

class AOIRequest(BaseModel):
    geometry: GeoJSON
    name: Optional[str] = Field(None, description="Name of the area of interest")
    
class DateRangeRequest(BaseModel):
    start_date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$', description="Start date in YYYY-MM-DD format")
    end_date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$', description="End date in YYYY-MM-DD format")
    
    @field_validator('end_date')
    @classmethod
    def validate_date_range(cls, v, info):
        start = info.data.get('start_date') if info.data else None
        if start and v < start:
            raise ValueError("End date must be after start date")
        return v

class IndexCalculationRequest(BaseModel):
    aoi: AOIRequest
    date_range: DateRangeRequest
    indices: List[VegetationIndex] = Field(..., min_items=1, description="List of indices to calculate")
    cloud_coverage: Optional[float] = Field(10.0, ge=0, le=100, description="Maximum cloud coverage percentage")
    scale: Optional[int] = Field(10, ge=10, le=1000, description="Pixel scale in meters")
    use_aoi_cloud_filter: Optional[bool] = Field(True, description="Calculate cloud coverage within AOI only")
    cloud_buffer_meters: Optional[float] = Field(300, ge=0, le=5000, description="Buffer around AOI for cloud calculation")

class TimeSeriesRequest(BaseModel):
    aoi: AOIRequest
    date_range: DateRangeRequest
    index: VegetationIndex
    interval: Optional[TimeInterval] = TimeInterval.MONTH
    cloud_coverage: Optional[float] = Field(10.0, ge=0, le=100)

class ExportRequest(BaseModel):
    aoi: AOIRequest
    date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    index: VegetationIndex
    scale: Optional[int] = Field(10, ge=10, le=1000)
    format: Optional[str] = Field("GeoTIFF", description="Export format")
    interactive: Optional[bool] = Field(False, description="Return interactive data for ECharts")

class StatisticsRequest(BaseModel):
    aoi: AOIRequest
    date_range: DateRangeRequest
    indices: List[VegetationIndex]
    cloud_coverage: Optional[float] = Field(10.0, ge=0, le=100)

class IndexValue(BaseModel):
    index: str
    value: float
    unit: Optional[str] = None
    timestamp: Optional[datetime] = None

class TimeSeriesPoint(BaseModel):
    date: str
    value: float

class TimeSeriesResponse(BaseModel):
    index: str
    aoi_name: Optional[str]
    start_date: str
    end_date: str
    data: List[TimeSeriesPoint]
    statistics: Optional[Dict[str, float]] = None

class IndexCalculationResponse(BaseModel):
    request_id: str
    timestamp: datetime
    aoi_name: Optional[str]
    indices: List[IndexValue]
    metadata: Dict[str, Any]

class StatisticsResponse(BaseModel):
    aoi_name: Optional[str]
    date_range: DateRangeRequest
    statistics: Dict[str, Dict[str, float]]
    metadata: Dict[str, Any]

class ExportResponse(BaseModel):
    request_id: str
    download_url: str
    expires_at: datetime
    file_format: str
    index: str
    metadata: Dict[str, Any]

# Interactive Visualization Models

class VisualizationBounds(BaseModel):
    min_lon: float
    max_lon: float
    min_lat: float
    max_lat: float

class PixelData(BaseModel):
    lon: float
    lat: float
    value: float

class HeatmapDataPoint(BaseModel):
    x: int
    y: int
    value: float

class CoordinateSystem(BaseModel):
    lon_step: float
    lat_step: float
    x_axis: List[float]
    y_axis: List[float]

class VisualizationParams(BaseModel):
    min: float
    max: float
    palette: List[str]

class InteractiveDataResponse(BaseModel):
    date: str
    index: str
    bounds: VisualizationBounds
    pixel_data: List[PixelData]
    statistics: Dict[str, float]
    visualization: VisualizationParams
    metadata: Dict[str, Any]

class PixelData(BaseModel):
    lon: float
    lat: float
    value: float

class HeatmapDataResponse(BaseModel):
    date: str
    index: str
    bounds: VisualizationBounds
    pixel_data: List[PixelData]  # Real satellite pixel data with lat/lon
    aoi_boundary: List[List[float]]  # AOI polygon coordinates
    statistics: Dict[str, float]
    visualization: VisualizationParams
    metadata: Optional[Dict[str, Any]] = None

class InteractiveRequest(BaseModel):
    aoi: AOIRequest
    date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    index: VegetationIndex
    scale: Optional[int] = Field(30, ge=10, le=1000)
    max_pixels: Optional[int] = Field(10000, ge=100, le=50000)
    visualization_type: Optional[str] = Field("scatter", pattern="^(scatter|heatmap)$")

class HeatmapRequest(BaseModel):
    aoi: AOIRequest
    date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    index: VegetationIndex
    grid_size: Optional[int] = Field(1000, ge=100, le=50000)  # Allow high-density grids for detailed visualization

class HealthResponse(BaseModel):
    status: str
    version: str
    earth_engine: bool
    timestamp: datetime

class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Database Models - These reference the main consolidated schema
# Note: Actual table structures are defined in the main project schema

# Additional models for satellite processing

class SatelliteAOI(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    farm_id: Optional[str] = None
    parcel_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    geometry: GeoJSON
    area_hectares: Optional[float] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Request/Response Models for Supabase Operations

class GetOrganizationFarmsRequest(BaseModel):
    organization_id: str

class GetFarmParcelsRequest(BaseModel):
    farm_id: str

class GetParcelSatelliteDataRequest(BaseModel):
    parcel_id: str
    date_range: Optional[DateRangeRequest] = None
    indices: Optional[List[VegetationIndex]] = None

class CreateAOIRequest(BaseModel):
    organization_id: str
    farm_id: Optional[str] = None
    parcel_id: Optional[str] = None
    name: str
    geometry: GeoJSON
    description: Optional[str] = None

# Cloud Coverage Check Models

class CloudCoverageCheckRequest(BaseModel):
    geometry: GeoJSON
    date_range: DateRangeRequest
    max_cloud_coverage: float = Field(10.0, ge=0, le=100)

class CloudCoverageCheckResponse(BaseModel):
    has_suitable_images: bool
    available_images_count: int
    min_cloud_coverage: Optional[float] = None
    max_cloud_coverage: Optional[float] = None
    recommended_date: Optional[str] = None
    metadata: Dict[str, Any]

# Index Image Generation Models

class IndexImageRequest(BaseModel):
    aoi: AOIRequest
    date_range: DateRangeRequest
    index: VegetationIndex
    cloud_coverage: Optional[float] = Field(default=10.0, ge=0, le=100)

class IndexImageResponse(BaseModel):
    image_url: str
    index: VegetationIndex
    date: str
    cloud_coverage: float
    metadata: Dict[str, Any] = Field(default_factory=dict)

# Automated Processing Models

class ProcessingJob(BaseModel):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    farm_id: Optional[str] = None
    parcel_id: Optional[str] = None
    job_type: str = Field("batch_processing", pattern="^(batch_processing|single_parcel|cloud_check)$")
    indices: List[VegetationIndex]
    date_range: DateRangeRequest
    cloud_coverage: float = Field(10.0, ge=0, le=100)
    scale: int = Field(10, ge=10, le=1000)
    status: str = Field("pending", pattern="^(pending|running|completed|failed|cancelled)$")
    progress_percentage: float = Field(0.0, ge=0, le=100)
    total_tasks: int = Field(0)
    completed_tasks: int = Field(0)
    failed_tasks: int = Field(0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    results_summary: Optional[Dict[str, Any]] = None

class BatchProcessingRequest(BaseModel):
    organization_id: str
    farm_id: Optional[str] = None  # If None, process all farms in organization
    parcel_id: Optional[str] = None  # If None, process all parcels in farm
    indices: List[VegetationIndex]
    date_range: DateRangeRequest
    cloud_coverage: float = Field(10.0, ge=0, le=100)
    scale: int = Field(10, ge=10, le=1000)
    check_cloud_coverage: bool = Field(True)
    priority: int = Field(5, ge=1, le=10)

class BatchProcessingResponse(BaseModel):
    job_id: str
    total_tasks: int
    created_at: datetime
    estimated_completion: Optional[datetime] = None

# Statistics and Results Models

class SatelliteIndicesData(BaseModel):
    id: Optional[str] = None
    organization_id: str
    farm_id: Optional[str] = None
    parcel_id: str
    processing_job_id: Optional[str] = None
    date: str
    index_name: str
    mean_value: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    std_value: Optional[float] = None
    median_value: Optional[float] = None
    percentile_25: Optional[float] = None
    percentile_75: Optional[float] = None
    percentile_90: Optional[float] = None
    pixel_count: Optional[int] = None
    cloud_coverage_percentage: Optional[float] = None
    image_source: str = "Sentinel-2"
    geotiff_url: Optional[str] = None
    geotiff_expires_at: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ParcelStatistics(BaseModel):
    parcel_id: str
    parcel_name: str
    farm_id: str
    farm_name: str
    date_range: DateRangeRequest
    indices: Dict[str, Dict[str, float]]  # index_name -> statistics
    geotiff_urls: Dict[str, str]  # index_name -> download_url
    metadata: Dict[str, Any]

class FarmStatistics(BaseModel):
    farm_id: str
    farm_name: str
    organization_id: str
    date_range: DateRangeRequest
    parcel_statistics: List[ParcelStatistics]
    summary_statistics: Dict[str, Any]
    generated_at: datetime

class OrganizationStatisticsResponse(BaseModel):
    organization_id: str
    organization_name: str
    date_range: DateRangeRequest
    farm_statistics: List[FarmStatistics]
    summary_statistics: Dict[str, Any]
    generated_at: datetime