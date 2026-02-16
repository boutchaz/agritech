"""
Shared types, constants, and utilities for satellite data processing.

This module contains common data structures, Sentinel-2 band mappings,
vegetation index formulas, and visualization parameters used across
all satellite providers.
"""

from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass
from enum import Enum
import numpy as np

# Import ProviderType from interfaces to avoid circular dependency
from app.services.satellite.interfaces import ProviderType


# =============================================================================
# Sentinel-2 Band Mappings
# =============================================================================

class Sentinel2Band(str, Enum):
    """Sentinel-2 band identifiers"""
    # 10m resolution bands
    B2 = "B2"  # Blue (490 nm)
    B3 = "B3"  # Green (560 nm)
    B4 = "B4"  # Red (665 nm)
    B8 = "B8"  # NIR (842 nm)

    # 20m resolution bands
    B5 = "B5"   # Red Edge 1 (705 nm)
    B6 = "B6"   # Red Edge 2 (740 nm)
    B7 = "B7"   # Red Edge 3 (783 nm)
    B8A = "B8A" # Red Edge 4 (865 nm)
    B11 = "B11" # SWIR 1 (1610 nm)
    B12 = "B12" # SWIR 2 (2190 nm)

    # Quality bands
    QA60 = "QA60"  # Cloud mask (60m)
    SCL = "SCL"    # Scene Classification Layer (20m)


# Sentinel-2 band wavelength information (in nanometers)
SENTINEL2_BAND_WAVELENGTHS = {
    Sentinel2Band.B2: 490,
    Sentinel2Band.B3: 560,
    Sentinel2Band.B4: 665,
    Sentinel2Band.B5: 705,
    Sentinel2Band.B6: 740,
    Sentinel2Band.B7: 783,
    Sentinel2Band.B8: 842,
    Sentinel2Band.B8A: 865,
    Sentinel2Band.B11: 1610,
    Sentinel2Band.B12: 2190,
}


# =============================================================================
# Scene Classification Layer (SCL) Values
# =============================================================================

class SCLClass(int, Enum):
    """Sentinel-2 Scene Classification Layer classes"""
    NO_DATA = 0
    SATURATED_OR_DEFECTIVE = 1
    DARK_AREA_PIXELS = 2
    CLOUD_SHADOWS = 3
    VEGETATION = 4
    NOT_VEGETATED = 5
    WATER = 6
    UNCLASSIFIED = 7
    CLOUD_MEDIUM_PROBABILITY = 8
    CLOUD_HIGH_PROBABILITY = 9
    THIN_CIRRUS = 10
    SNOW_OR_ICE = 11


# SCL values that should be masked (considered invalid/obscured)
SCL_MASK_VALUES = [
    SCLClass.NO_DATA,
    SCLClass.SATURATED_OR_DEFECTIVE,
    SCLClass.CLOUD_SHADOWS,
    SCLClass.CLOUD_MEDIUM_PROBABILITY,
    SCLClass.CLOUD_HIGH_PROBABILITY,
    SCLClass.THIN_CIRRUS,
]

# SCL values for clear/valid pixels
SCL_CLEAR_VALUES = [
    SCLClass.VEGETATION,
    SCLClass.NOT_VEGETATED,
    SCLClass.WATER,
    SCLClass.UNCLASSIFIED,
    SCLClass.DARK_AREA_PIXELS,
    SCLClass.SNOW_OR_ICE,
]


# =============================================================================
# Vegetation Index Formulas
# =============================================================================

class VegetationIndex(str, Enum):
    """Supported vegetation indices"""
    NDVI = "NDVI"     # Normalized Difference Vegetation Index
    NDRE = "NDRE"     # Normalized Difference Red Edge Index
    NDMI = "NDMI"     # Normalized Difference Moisture Index
    MNDWI = "MNDWI"   # Modified Normalized Difference Water Index
    GCI = "GCI"       # Green Chlorophyll Index
    SAVI = "SAVI"     # Soil Adjusted Vegetation Index
    OSAVI = "OSAVI"   # Optimized Soil Adjusted Vegetation Index
    MSAVI2 = "MSAVI2" # Modified Soil Adjusted Vegetation Index 2
    NIRv = "NIRv"     # Near-Infrared Reflectance of vegetation
    EVI = "EVI"       # Enhanced Vegetation Index
    MSI = "MSI"       # Moisture Stress Index
    MCARI = "MCARI"   # Modified Chlorophyll Absorption Ratio Index
    TCARI = "TCARI"   # Transformed Chlorophyll Absorption Ratio Index


# =============================================================================
# Vegetation Index Calculation Functions (NumPy-based)
# =============================================================================

def calculate_ndvi(nir: np.ndarray, red: np.ndarray) -> np.ndarray:
    """
    Calculate Normalized Difference Vegetation Index.

    NDVI = (NIR - Red) / (NIR + Red)

    Range: -1 to 1
    - Values near 1 indicate healthy vegetation
    - Values near 0 indicate bare soil or water
    - Negative values typically indicate water
    """
    return np.divide(
        nir - red,
        nir + red,
        out=np.zeros_like(nir, dtype=np.float32),
        where=(nir + red) != 0
    )


def calculate_ndre(nir: np.ndarray, red_edge: np.ndarray) -> np.ndarray:
    """
    Calculate Normalized Difference Red Edge Index.

    NDRE = (NIR - RedEdge) / (NIR + RedEdge)

    Range: -1 to 1
    - Sensitive to later growth stages and canopy structure
    - Useful for monitoring crop health during reproductive stages
    """
    return np.divide(
        nir - red_edge,
        nir + red_edge,
        out=np.zeros_like(nir, dtype=np.float32),
        where=(nir + red_edge) != 0
    )


def calculate_ndmi(nir: np.ndarray, swir1: np.ndarray) -> np.ndarray:
    """
    Calculate Normalized Difference Moisture Index.

    NDMI = (NIR - SWIR1) / (NIR + SWIR1)

    Range: -1 to 1
    - Higher values indicate more vegetation moisture
    - Lower values indicate water stress
    """
    return np.divide(
        nir - swir1,
        nir + swir1,
        out=np.zeros_like(nir, dtype=np.float32),
        where=(nir + swir1) != 0
    )


def calculate_mndwi(green: np.ndarray, swir1: np.ndarray) -> np.ndarray:
    """
    Calculate Modified Normalized Difference Water Index.

    MNDWI = (Green - SWIR1) / (Green + SWIR1)

    Range: -1 to 1
    - Positive values typically indicate water bodies
    - Negative values indicate land
    """
    return np.divide(
        green - swir1,
        green + swir1,
        out=np.zeros_like(green, dtype=np.float32),
        where=(green + swir1) != 0
    )


def calculate_gci(nir: np.ndarray, green: np.ndarray) -> np.ndarray:
    """
    Calculate Green Chlorophyll Index.

    GCI = NIR / Green - 1

    Range: 0 to ~5+
    - Higher values indicate higher chlorophyll content
    """
    return np.divide(nir, green, out=np.zeros_like(nir, dtype=np.float32), where=green != 0) - 1


def calculate_savi(nir: np.ndarray, red: np.ndarray, L: float = 0.5) -> np.ndarray:
    """
    Calculate Soil Adjusted Vegetation Index.

    SAVI = ((NIR - Red) / (NIR + Red + L)) * (1 + L)

    Range: -1 to 1
    - L is a soil brightness correction factor (typically 0.5)
    - Reduces soil background influence
    """
    return np.divide(
        (nir - red) * (1 + L),
        nir + red + L,
        out=np.zeros_like(nir, dtype=np.float32),
        where=(nir + red + L) != 0
    )


def calculate_osavi(nir: np.ndarray, red: np.ndarray) -> np.ndarray:
    """
    Calculate Optimized Soil Adjusted Vegetation Index.

    OSAVI = (NIR - Red) / (NIR + Red + 0.16)

    Range: -1 to 1
    - Uses optimized soil adjustment factor of 0.16
    """
    return np.divide(
        nir - red,
        nir + red + 0.16,
        out=np.zeros_like(nir, dtype=np.float32),
        where=(nir + red + 0.16) != 0
    )


def calculate_msavi2(nir: np.ndarray, red: np.ndarray) -> np.ndarray:
    """
    Calculate Modified Soil Adjusted Vegetation Index 2.

    MSAVI2 = (2 * NIR + 1 - sqrt((2 * NIR + 1)^2 - 8 * (NIR - Red))) / 2

    Range: -1 to 1
    - Minimizes soil brightness effects
    - No required soil adjustment factor
    """
    term1 = 2 * nir + 1
    discriminant = term1 ** 2 - 8 * (nir - red)
    # Ensure discriminant is non-negative for sqrt
    discriminant = np.maximum(discriminant, 0)
    return (term1 - np.sqrt(discriminant)) / 2


def calculate_nirv(nir: np.ndarray, red: np.ndarray) -> np.ndarray:
    """
    Calculate Near-Infrared Reflectance of vegetation.

    NIRv = NDVI * NIR
    NDVI = (NIR - Red) / (NIR + Red)

    Typical range: 0 to ~0.6
    - Reduces bare-soil influence compared to NDVI
    - Strong proxy for canopy photosynthetic activity
    """
    ndvi = np.divide(
        nir - red,
        nir + red,
        out=np.zeros_like(nir, dtype=np.float32),
        where=(nir + red) != 0
    )
    return ndvi * nir


def calculate_evi(nir: np.ndarray, red: np.ndarray, blue: np.ndarray) -> np.ndarray:
    """
    Calculate Enhanced Vegetation Index.

    EVI = 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)

    Typical range: -1 to 1
    - Less prone to saturation in dense canopies than NDVI
    - More resilient to atmospheric and soil background effects
    """
    denominator = nir + 6 * red - 7.5 * blue + 1
    return np.divide(
        2.5 * (nir - red),
        denominator,
        out=np.zeros_like(nir, dtype=np.float32),
        where=denominator != 0
    )


def calculate_msi(swir1: np.ndarray, nir: np.ndarray) -> np.ndarray:
    """
    Calculate Moisture Stress Index.

    MSI = SWIR1 / NIR

    Range: 0 to ~3+
    - Higher values indicate water stress
    - Lower values indicate adequate moisture
    """
    return np.divide(swir1, nir, out=np.zeros_like(swir1, dtype=np.float32), where=nir != 0)


def calculate_mcari(red_edge: np.ndarray, red: np.ndarray, green: np.ndarray) -> np.ndarray:
    """
    Calculate Modified Chlorophyll Absorption Ratio Index.

    MCARI = (RedEdge - Red) - 0.2 * (RedEdge - Green) * (RedEdge / Green)

    Range: -1 to 1+
    - Sensitive to chlorophyll content
    """
    return ((red_edge - red) - 0.2 * (red_edge - green) * np.divide(
        red_edge, green, out=np.zeros_like(red_edge, dtype=np.float32), where=green != 0
    ))


def calculate_tcari(red_edge: np.ndarray, red: np.ndarray, green: np.ndarray) -> np.ndarray:
    """
    Calculate Transformed Chlorophyll Absorption Ratio Index.

    TCARI = 3 * ((RedEdge - Red) - 0.2 * (RedEdge - Red) * (RedEdge / Red))

    Range: -1 to 1+
    - Works well with OSAVI for chlorophyll estimation
    """
    return 3 * ((red_edge - red) - 0.2 * (red_edge - red) * np.divide(
        red_edge, red, out=np.zeros_like(red_edge, dtype=np.float32), where=red != 0
    ))


# Map of index name to calculation function
VEGETATION_INDEX_CALCULATORS: Dict[str, callable] = {
    VegetationIndex.NDVI: lambda bands: calculate_ndvi(bands["nir"], bands["red"]),
    VegetationIndex.NDRE: lambda bands: calculate_ndre(bands["nir"], bands["red_edge"]),
    VegetationIndex.NDMI: lambda bands: calculate_ndmi(bands["nir"], bands["swir1"]),
    VegetationIndex.MNDWI: lambda bands: calculate_mndwi(bands["green"], bands["swir1"]),
    VegetationIndex.GCI: lambda bands: calculate_gci(bands["nir"], bands["green"]),
    VegetationIndex.SAVI: lambda bands: calculate_savi(bands["nir"], bands["red"]),
    VegetationIndex.OSAVI: lambda bands: calculate_osavi(bands["nir"], bands["red"]),
    VegetationIndex.MSAVI2: lambda bands: calculate_msavi2(bands["nir"], bands["red"]),
    VegetationIndex.NIRv: lambda bands: calculate_nirv(bands["nir"], bands["red"]),
    VegetationIndex.EVI: lambda bands: calculate_evi(bands["nir"], bands["red"], bands["blue"]),
    VegetationIndex.MSI: lambda bands: calculate_msi(bands["swir1"], bands["nir"]),
    VegetationIndex.MCARI: lambda bands: calculate_mcari(bands["red_edge"], bands["red"], bands["green"]),
    VegetationIndex.TCARI: lambda bands: calculate_tcari(bands["red_edge"], bands["red"], bands["green"]),
}


# =============================================================================
# Visualization Parameters
# =============================================================================

@dataclass
class VisualizationParams:
    """Visualization parameters for vegetation index display"""
    min: float
    max: float
    palette: List[str]
    description: Optional[str] = None


# Visualization parameters for each index
VISUALIZATION_PARAMS: Dict[str, VisualizationParams] = {
    "NDVI": VisualizationParams(
        min=0.1,
        max=0.5,
        palette=["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
        description="Normalized Difference Vegetation Index"
    ),
    "NDRE": VisualizationParams(
        min=-0.2,
        max=0.4,
        palette=["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
        description="Normalized Difference Red Edge Index"
    ),
    "NDMI": VisualizationParams(
        min=-0.5,
        max=0.5,
        palette=["#8B4513", "#FF4500", "#FFD700", "#00BFFF", "#0000FF"],
        description="Normalized Difference Moisture Index"
    ),
    "MNDWI": VisualizationParams(
        min=-1,
        max=1,
        palette=["#FFFFFF", "#87CEEB", "#4682B4", "#000080"],
        description="Modified Normalized Difference Water Index"
    ),
    "GCI": VisualizationParams(
        min=0,
        max=3,
        palette=["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
        description="Green Chlorophyll Index"
    ),
    "SAVI": VisualizationParams(
        min=-0.1,
        max=0.6,
        palette=["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
        description="Soil Adjusted Vegetation Index"
    ),
    "OSAVI": VisualizationParams(
        min=-0.1,
        max=0.6,
        palette=["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
        description="Optimized Soil Adjusted Vegetation Index"
    ),
    "MSAVI2": VisualizationParams(
        min=-0.1,
        max=0.6,
        palette=["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
        description="Modified Soil Adjusted Vegetation Index 2"
    ),
    "EVI": VisualizationParams(
        min=-0.2,
        max=0.8,
        palette=["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
        description="Enhanced Vegetation Index"
    ),
    "NIRv": VisualizationParams(
        min=0.0,
        max=0.4,
        palette=["#8B0000", "#FF4500", "#FFD700", "#ADFF2F", "#00FF00"],
        description="Near-Infrared Reflectance of vegetation"
    ),
    "MSI": VisualizationParams(
        min=0,
        max=3,
        palette=["#00FF00", "#FFD700", "#FF4500", "#8B0000"],
        description="Moisture Stress Index (inverted scale)"
    ),
}


def get_visualization_params(index: str) -> VisualizationParams:
    """Get visualization parameters for a vegetation index"""
    return VISUALIZATION_PARAMS.get(
        index,
        VISUALIZATION_PARAMS["NDVI"]  # Default to NDVI params
    )


# =============================================================================
# Time Interval Types
# =============================================================================

class TimeInterval(str, Enum):
    """Time aggregation intervals"""
    DAY = "day"
    WEEK = "week"
    MONTH = "month"
    YEAR = "year"


# =============================================================================
# Provider Configuration
# =============================================================================

@dataclass
class ProviderConfig:
    """Configuration for a satellite provider"""
    provider_type: ProviderType
    enabled: bool = True
    priority: int = 0  # Lower = higher priority
    credentials: Dict[str, Any] = None

    def __post_init__(self):
        if self.credentials is None:
            self.credentials = {}


# =============================================================================
# Utility Functions
# =============================================================================

def parse_geometry(geometry: Dict) -> Tuple[float, float, float, float]:
    """
    Parse GeoJSON geometry and return bounding box.

    Returns:
        Tuple of (min_lon, max_lon, min_lat, max_lat)
    """
    geo_type = geometry.get("type")
    coordinates = geometry.get("coordinates", [])

    if geo_type == "Polygon":
        # Flatten all coordinates
        all_coords = []
        for ring in coordinates:
            all_coords.extend(ring)
    elif geo_type == "MultiPolygon":
        all_coords = []
        for polygon in coordinates:
            for ring in polygon:
                all_coords.extend(ring)
    elif geo_type == "Point":
        all_coords = [coordinates]
    else:
        raise ValueError(f"Unsupported geometry type: {geo_type}")

    lons = [c[0] for c in all_coords]
    lats = [c[1] for c in all_coords]

    return (min(lons), max(lons), min(lats), max(lats))


def validate_date(date_str: str) -> bool:
    """
    Validate date string format (YYYY-MM-DD).

    Returns:
        True if valid, False otherwise
    """
    try:
        from datetime import datetime
        datetime.strptime(date_str, "%Y-%m-%d")
        return True
    except ValueError:
        return False


def validate_date_range(start_date: str, end_date: str) -> bool:
    """
    Validate that start_date is before end_date.

    Returns:
        True if valid, False otherwise
    """
    try:
        from datetime import datetime
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
        return start < end
    except ValueError:
        return False


def get_band_mapping(bands: List[str]) -> Dict[str, int]:
    """
    Create a mapping from band name to index.

    Args:
        bands: List of band names

    Returns:
        Dictionary mapping band names to indices
    """
    return {band: i for i, band in enumerate(bands)}
