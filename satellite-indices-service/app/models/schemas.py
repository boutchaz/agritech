from pydantic import BaseModel, Field, validator
from typing import List, Dict, Optional, Any
from datetime import datetime
from enum import Enum

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
    
    @validator('coordinates')
    def validate_coordinates(cls, v, values):
        geometry_type = values.get('type')
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
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        start = values.get('start_date')
        if start and v < start:
            raise ValueError("End date must be after start date")
        return v

class IndexCalculationRequest(BaseModel):
    aoi: AOIRequest
    date_range: DateRangeRequest
    indices: List[VegetationIndex] = Field(..., min_items=1, description="List of indices to calculate")
    cloud_coverage: Optional[float] = Field(10.0, ge=0, le=100, description="Maximum cloud coverage percentage")
    scale: Optional[int] = Field(10, ge=10, le=1000, description="Pixel scale in meters")

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