"""
Vegetation index calculation utilities.

Pure numpy implementations of vegetation index formulas for use with
CDSE/openEO provider and other numpy-based satellite data processing.
"""

import logging
from typing import Dict, List, Callable, Any
import numpy as np

logger = logging.getLogger(__name__)


# =============================================================================
# Band Grouping for Index Calculations
# =============================================================================

def prepare_bands(
    blue: np.ndarray,
    green: np.ndarray,
    red: np.ndarray,
    red_edge: np.ndarray,
    red_edge_2: np.ndarray,
    red_edge_3: np.ndarray,
    nir: np.ndarray,
    nir_narrow: np.ndarray,
    swir1: np.ndarray,
    swir2: np.ndarray,
) -> Dict[str, np.ndarray]:
    """
    Prepare band dictionary for index calculations.

    Args:
        blue: B2 band (490 nm)
        green: B3 band (560 nm)
        red: B4 band (665 nm)
        red_edge: B5 band (705 nm)
        red_edge_2: B6 band (740 nm)
        red_edge_3: B7 band (783 nm)
        nir: B8 band (842 nm)
        nir_narrow: B8A band (865 nm)
        swir1: B11 band (1610 nm)
        swir2: B12 band (2190 nm)

    Returns:
        Dictionary mapping band names to arrays
    """
    return {
        "blue": blue.astype(np.float32),
        "green": green.astype(np.float32),
        "red": red.astype(np.float32),
        "red_edge": red_edge.astype(np.float32),
        "red_edge_2": red_edge_2.astype(np.float32),
        "red_edge_3": red_edge_3.astype(np.float32),
        "nir": nir.astype(np.float32),
        "nir_narrow": nir_narrow.astype(np.float32),
        "swir1": swir1.astype(np.float32),
        "swir2": swir2.astype(np.float32),
    }


# =============================================================================
# Vegetation Index Calculation Functions
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
    result = np.zeros_like(nir, dtype=np.float32)
    mask = (nir + red) != 0
    result[mask] = (nir[mask] - red[mask]) / (nir[mask] + red[mask])
    return result


def calculate_ndre(nir: np.ndarray, red_edge: np.ndarray) -> np.ndarray:
    """
    Calculate Normalized Difference Red Edge Index.

    NDRE = (NIR - RedEdge) / (NIR + RedEdge)

    Range: -1 to 1
    - Sensitive to later growth stages and canopy structure
    - Useful for monitoring crop health during reproductive stages
    """
    result = np.zeros_like(nir, dtype=np.float32)
    mask = (nir + red_edge) != 0
    result[mask] = (nir[mask] - red_edge[mask]) / (nir[mask] + red_edge[mask])
    return result


def calculate_ndmi(nir: np.ndarray, swir1: np.ndarray) -> np.ndarray:
    """
    Calculate Normalized Difference Moisture Index.

    NDMI = (NIR - SWIR1) / (NIR + SWIR1)

    Range: -1 to 1
    - Higher values indicate more vegetation moisture
    - Lower values indicate water stress
    """
    result = np.zeros_like(nir, dtype=np.float32)
    mask = (nir + swir1) != 0
    result[mask] = (nir[mask] - swir1[mask]) / (nir[mask] + swir1[mask])
    return result


def calculate_mndwi(green: np.ndarray, swir1: np.ndarray) -> np.ndarray:
    """
    Calculate Modified Normalized Difference Water Index.

    MNDWI = (Green - SWIR1) / (Green + SWIR1)

    Range: -1 to 1
    - Positive values typically indicate water bodies
    - Negative values indicate land
    """
    result = np.zeros_like(green, dtype=np.float32)
    mask = (green + swir1) != 0
    result[mask] = (green[mask] - swir1[mask]) / (green[mask] + swir1[mask])
    return result


def calculate_gci(nir: np.ndarray, green: np.ndarray) -> np.ndarray:
    """
    Calculate Green Chlorophyll Index.

    GCI = NIR / Green - 1

    Range: 0 to ~5+
    - Higher values indicate higher chlorophyll content
    """
    result = np.zeros_like(nir, dtype=np.float32)
    mask = green != 0
    result[mask] = nir[mask] / green[mask] - 1
    return result


def calculate_savi(
    nir: np.ndarray, red: np.ndarray, L: float = 0.5
) -> np.ndarray:
    """
    Calculate Soil Adjusted Vegetation Index.

    SAVI = ((NIR - Red) / (NIR + Red + L)) * (1 + L)

    Range: -1 to 1
    - L is a soil brightness correction factor (typically 0.5)
    - Reduces soil background influence
    """
    result = np.zeros_like(nir, dtype=np.float32)
    mask = (nir + red + L) != 0
    result[mask] = ((nir[mask] - red[mask]) * (1 + L)) / (nir[mask] + red[mask] + L)
    return result


def calculate_osavi(nir: np.ndarray, red: np.ndarray) -> np.ndarray:
    """
    Calculate Optimized Soil Adjusted Vegetation Index.

    OSAVI = (NIR - Red) / (NIR + Red + 0.16)

    Range: -1 to 1
    - Uses optimized soil adjustment factor of 0.16
    """
    result = np.zeros_like(nir, dtype=np.float32)
    mask = (nir + red + 0.16) != 0
    result[mask] = (nir[mask] - red[mask]) / (nir[mask] + red[mask] + 0.16)
    return result


def calculate_msavi2(nir: np.ndarray, red: np.ndarray) -> np.ndarray:
    """
    Calculate Modified Soil Adjusted Vegetation Index 2.

    MSAVI2 = (2 * NIR + 1 - sqrt((2 * NIR + 1)^2 - 8 * (NIR - Red))) / 2

    Range: -1 to 1
    - Minimizes soil brightness effects
    - No required soil adjustment factor
    """
    term1 = 2 * nir + 1
    discriminant = term1**2 - 8 * (nir - red)
    # Ensure discriminant is non-negative for sqrt
    discriminant = np.maximum(discriminant, 0)
    return (term1 - np.sqrt(discriminant)) / 2


def calculate_pri(
    red_edge: np.ndarray, red_edge_2: np.ndarray
) -> np.ndarray:
    """
    Calculate Photochemical Reflectance Index.

    PRI = (RedEdge1 - RedEdge2) / (RedEdge1 + RedEdge2)

    Range: -1 to 1
    - Sensitive to changes in carotenoid pigment content
    - Used for light use efficiency assessment
    """
    result = np.zeros_like(red_edge, dtype=np.float32)
    mask = (red_edge + red_edge_2) != 0
    result[mask] = (red_edge[mask] - red_edge_2[mask]) / (red_edge[mask] + red_edge_2[mask])
    return result


def calculate_msi(swir1: np.ndarray, nir: np.ndarray) -> np.ndarray:
    """
    Calculate Moisture Stress Index.

    MSI = SWIR1 / NIR

    Range: 0 to ~3+
    - Higher values indicate water stress
    - Lower values indicate adequate moisture
    """
    result = np.zeros_like(swir1, dtype=np.float32)
    mask = nir != 0
    result[mask] = swir1[mask] / nir[mask]
    return result


def calculate_mcari(
    red_edge: np.ndarray, red: np.ndarray, green: np.ndarray
) -> np.ndarray:
    """
    Calculate Modified Chlorophyll Absorption Ratio Index.

    MCARI = (RedEdge - Red) - 0.2 * (RedEdge - Green) * (RedEdge / Green)

    Range: -1 to 1+
    - Sensitive to chlorophyll content
    """
    result = np.zeros_like(red_edge, dtype=np.float32)
    mask = green != 0
    result[mask] = (
        (red_edge[mask] - red[mask])
        - 0.2 * (red_edge[mask] - green[mask]) * (red_edge[mask] / green[mask])
    )
    return result


def calculate_tcari(
    red_edge: np.ndarray, red: np.ndarray, green: np.ndarray
) -> np.ndarray:
    """
    Calculate Transformed Chlorophyll Absorption Ratio Index.

    TCARI = 3 * ((RedEdge - Red) - 0.2 * (RedEdge - Red) * (RedEdge / Red))

    Range: -1 to 1+
    - Works well with OSAVI for chlorophyll estimation
    """
    result = np.zeros_like(red_edge, dtype=np.float32)
    mask = red != 0
    result[mask] = 3 * (
        (red_edge[mask] - red[mask])
        - 0.2 * (red_edge[mask] - red[mask]) * (red_edge[mask] / red[mask])
    )
    return result


# =============================================================================
# Batch Index Calculation
# =============================================================================

def calculate_all_indices(
    bands: Dict[str, np.ndarray],
    indices: List[str],
) -> Dict[str, np.ndarray]:
    """
    Calculate multiple vegetation indices from band data.

    Args:
        bands: Dictionary of band arrays (keys: blue, green, red, red_edge, etc.)
        indices: List of index names to calculate

    Returns:
        Dictionary mapping index names to computed arrays
    """
    results = {}

    # Required bands for each index
    requirements = {
        "NDVI": ["nir", "red"],
        "NDRE": ["nir", "red_edge"],
        "NDMI": ["nir", "swir1"],
        "MNDWI": ["green", "swir1"],
        "GCI": ["nir", "green"],
        "SAVI": ["nir", "red"],
        "OSAVI": ["nir", "red"],
        "MSAVI2": ["nir", "red"],
        "PRI": ["red_edge", "red_edge_2"],
        "MSI": ["swir1", "nir"],
        "MCARI": ["red_edge", "red", "green"],
        "TCARI": ["red_edge", "red", "green"],
    }

    for index_name in indices:
        required_bands = requirements.get(index_name, [])

        # Check if all required bands are available
        missing_bands = [b for b in required_bands if b not in bands]

        if missing_bands:
            logger.warning(
                f"Cannot calculate {index_name}: missing bands {missing_bands}"
            )
            # Create empty array with correct shape
            if bands:
                sample_shape = next(iter(bands.values())).shape
                results[index_name] = np.zeros(sample_shape, dtype=np.float32)
            continue

        try:
            if index_name == "NDVI":
                results[index_name] = calculate_ndvi(bands["nir"], bands["red"])
            elif index_name == "NDRE":
                results[index_name] = calculate_ndre(
                    bands["nir"], bands["red_edge"]
                )
            elif index_name == "NDMI":
                results[index_name] = calculate_ndmi(bands["nir"], bands["swir1"])
            elif index_name == "MNDWI":
                results[index_name] = calculate_mndwi(
                    bands["green"], bands["swir1"]
                )
            elif index_name == "GCI":
                results[index_name] = calculate_gci(bands["nir"], bands["green"])
            elif index_name == "SAVI":
                results[index_name] = calculate_savi(bands["nir"], bands["red"])
            elif index_name == "OSAVI":
                results[index_name] = calculate_osavi(bands["nir"], bands["red"])
            elif index_name == "MSAVI2":
                results[index_name] = calculate_msavi2(bands["nir"], bands["red"])
            elif index_name == "PRI":
                results[index_name] = calculate_pri(
                    bands["red_edge"], bands["red_edge_2"]
                )
            elif index_name == "MSI":
                results[index_name] = calculate_msi(bands["swir1"], bands["nir"])
            elif index_name == "MCARI":
                results[index_name] = calculate_mcari(
                    bands["red_edge"], bands["red"], bands["green"]
                )
            elif index_name == "TCARI":
                results[index_name] = calculate_tcari(
                    bands["red_edge"], bands["red"], bands["green"]
                )
            else:
                logger.warning(f"Unknown index: {index_name}")

        except Exception as e:
            logger.error(f"Error calculating {index_name}: {e}")
            # Create empty array on error
            sample_shape = next(iter(bands.values())).shape
            results[index_name] = np.zeros(sample_shape, dtype=np.float32)

    return results


def get_required_bands(indices: List[str]) -> List[str]:
    """
    Get the list of Sentinel-2 bands required for calculating specified indices.

    Args:
        indices: List of vegetation index names

    Returns:
        List of Sentinel-2 band names (e.g., "B02", "B03", "B04")
    """
    # Band mapping
    band_map = {
        "blue": "B02",
        "green": "B03",
        "red": "B04",
        "red_edge": "B05",
        "red_edge_2": "B06",
        "red_edge_3": "B07",
        "nir": "B08",
        "nir_narrow": "B8A",
        "swir1": "B11",
        "swir2": "B12",
    }

    # Band requirements per index
    index_requirements = {
        "NDVI": ["nir", "red"],
        "NDRE": ["nir", "red_edge"],
        "NDMI": ["nir", "swir1"],
        "MNDWI": ["green", "swir1"],
        "GCI": ["nir", "green"],
        "SAVI": ["nir", "red"],
        "OSAVI": ["nir", "red"],
        "MSAVI2": ["nir", "red"],
        "PRI": ["red_edge", "red_edge_2"],
        "MSI": ["swir1", "nir"],
        "MCARI": ["red_edge", "red", "green"],
        "TCARI": ["red_edge", "red", "green"],
    }

    # Collect all required bands
    required_bands = set()
    for index in indices:
        if index in index_requirements:
            required_bands.update(index_requirements[index])

    # Map to Sentinel-2 band names
    return [band_map[band] for band in required_bands if band in band_map]
