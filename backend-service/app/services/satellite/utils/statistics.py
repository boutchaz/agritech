"""
Statistics utilities for satellite data processing.

Provides functions for calculating statistical measures on
satellite imagery data using numpy.
"""

import logging
from typing import Dict, List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)


def calculate_statistics_from_array(
    array: np.ndarray,
    percentiles: Optional[List[float]] = None,
) -> Dict[str, float]:
    """
    Calculate comprehensive statistics for a numpy array.

    Args:
        array: Input numpy array (can contain NaN values)
        percentiles: List of percentiles to calculate (default: [10, 25, 50, 75, 90])

    Returns:
        Dictionary with calculated statistics
    """
    if percentiles is None:
        percentiles = [10, 25, 50, 75, 90]

    # Remove NaN values for statistics
    valid_values = array[~np.isnan(array)]

    if len(valid_values) == 0:
        return {
            "count": 0,
            "min": np.nan,
            "max": np.nan,
            "mean": np.nan,
            "median": np.nan,
            "std": np.nan,
        }

    stats = {
        "count": len(valid_values),
        "min": float(np.min(valid_values)),
        "max": float(np.max(valid_values)),
        "mean": float(np.mean(valid_values)),
        "median": float(np.median(valid_values)),
        "std": float(np.std(valid_values)),
    }

    # Add percentiles
    for p in percentiles:
        stats[f"p{p}"] = float(np.percentile(valid_values, p))

    return stats


def calculate_percentiles(
    array: np.ndarray, percentiles: List[float]
) -> Dict[str, float]:
    """
    Calculate specific percentiles for an array.

    Args:
        array: Input numpy array
        percentiles: List of percentiles to calculate (e.g., [10, 50, 90])

    Returns:
        Dictionary mapping percentile names to values
    """
    valid_values = array[~np.isnan(array)]

    if len(valid_values) == 0:
        return {f"p{p}": np.nan for p in percentiles}

    return {f"p{p}": float(np.percentile(valid_values, p)) for p in percentiles}


def calculate_statistics_per_region(
    array: np.ndarray,
    regions: np.ndarray,
    num_regions: int,
) -> Dict[int, Dict[str, float]]:
    """
    Calculate statistics for each region in a labeled array.

    Args:
        array: Data array
        regions: Labeled regions array (same shape as data)
        num_regions: Number of regions (labels from 0 to num_regions-1)

    Returns:
        Dictionary mapping region ID to statistics dictionary
    """
    results = {}

    for region_id in range(num_regions):
        mask = regions == region_id
        region_values = array[mask]

        if len(region_values) > 0:
            results[region_id] = calculate_statistics_from_array(region_values)
        else:
            results[region_id] = {
                "count": 0,
                "min": np.nan,
                "max": np.nan,
                "mean": np.nan,
                "median": np.nan,
                "std": np.nan,
            }

    return results


def calculate_z_score_array(array: np.ndarray) -> np.ndarray:
    """
    Calculate z-scores for an array.

    Args:
        array: Input numpy array

    Returns:
        Array of z-scores (same shape as input)
    """
    mean = np.nanmean(array)
    std = np.nanstd(array)

    if std == 0:
        return np.zeros_like(array)

    return (array - mean) / std


def detect_outliers(
    array: np.ndarray, method: str = "iqr", threshold: float = 1.5
) -> np.ndarray:
    """
    Detect outliers in an array.

    Args:
        array: Input numpy array
        method: Detection method ("iqr" for interquartile range, "zscore")
        threshold: Threshold for outlier detection
            - For IQR: multiplier for IQR (default 1.5)
            - For z-score: number of standard deviations (default 3.0)

    Returns:
        Boolean array where True indicates an outlier
    """
    if method == "iqr":
        q1 = np.nanpercentile(array, 25)
        q3 = np.nanpercentile(array, 75)
        iqr = q3 - q1

        lower_bound = q1 - threshold * iqr
        upper_bound = q3 + threshold * iqr

        return (array < lower_bound) | (array > upper_bound)

    elif method == "zscore":
        z_scores = calculate_z_score_array(array)
        return np.abs(z_scores) > threshold

    else:
        raise ValueError(f"Unknown outlier detection method: {method}")


def mask_values(
    array: np.ndarray,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
) -> np.ndarray:
    """
    Mask values outside a range.

    Args:
        array: Input numpy array
        min_value: Minimum allowed value (None for no minimum)
        max_value: Maximum allowed value (None for no maximum)

    Returns:
        Boolean mask where True indicates values within range
    """
    mask = np.ones_like(array, dtype=bool)

    if min_value is not None:
        mask &= array >= min_value

    if max_value is not None:
        mask &= array <= max_value

    return mask


def compute_histogram(
    array: np.ndarray,
    bins: int = 256,
    range_values: Optional[Tuple[float, float]] = None,
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute histogram of array values.

    Args:
        array: Input numpy array
        bins: Number of histogram bins
        range_values: Optional range for histogram (min, max)

    Returns:
        Tuple of (histogram values, bin edges)
    """
    valid_values = array[~np.isnan(array)]

    if len(valid_values) == 0:
        return np.array([]), np.array([])

    return np.histogram(valid_values, bins=bins, range=range_values)


def calculate_correlation(
    array1: np.ndarray, array2: np.ndarray
) -> Dict[str, float]:
    """
    Calculate correlation statistics between two arrays.

    Args:
        array1: First input array
        array2: Second input array (must have same shape as array1)

    Returns:
        Dictionary with correlation statistics
    """
    # Flatten arrays
    flat1 = array1.flatten()
    flat2 = array2.flatten()

    # Remove pairs where either value is NaN
    valid_mask = ~(np.isnan(flat1) | np.isnan(flat2))
    valid1 = flat1[valid_mask]
    valid2 = flat2[valid_mask]

    if len(valid1) < 2:
        return {
            "pearson": np.nan,
            "spearman": np.nan,
            "covariance": np.nan,
            "n": 0,
        }

    # Pearson correlation
    pearson = np.corrcoef(valid1, valid2)[0, 1]

    # Covariance
    covariance = np.cov(valid1, valid2)[0, 1]

    # Spearman correlation (rank-based)
    from scipy.stats import spearmanr

    spearman, _ = spearmanr(valid1, valid2)

    return {
        "pearson": float(pearson) if not np.isnan(pearson) else 0.0,
        "spearman": float(spearman) if not np.isnan(spearman) else 0.0,
        "covariance": float(covariance) if not np.isnan(covariance) else 0.0,
        "n": len(valid1),
    }


def aggregate_spatial_statistics(
    array: np.ndarray, block_size: int = 10
) -> np.ndarray:
    """
    Calculate spatial aggregation (downsampling) by taking the mean of blocks.

    Args:
        array: Input 2D array
        block_size: Size of blocks to aggregate

    Returns:
        Aggregated array with reduced dimensions
    """
    height, width = array.shape

    # Calculate new dimensions
    new_height = height // block_size
    new_width = width // block_size

    # Trim to fit block size
    trimmed = array[: new_height * block_size, : new_width * block_size]

    # Reshape and calculate mean
    reshaped = trimmed.reshape(new_height, block_size, new_width, block_size)
    aggregated = np.nanmean(reshaped, axis=(1, 3))

    return aggregated


def calculate_ndvi_quality(
    red_band: np.ndarray,
    nir_band: np.ndarray,
    ndvi: np.ndarray,
) -> Dict[str, float]:
    """
    Calculate quality metrics for NDVI calculation.

    Args:
        red_band: Red band array
        nir_band: NIR band array
        ndvi: Calculated NDVI array

    Returns:
        Dictionary with quality metrics
    """
    # Percentage of valid pixels (not NaN)
    valid_mask = ~np.isnan(ndvi)
    valid_percentage = (np.sum(valid_mask) / ndvi.size) * 100

    # Percentage of pixels in valid NDVI range (-1 to 1)
    in_range_mask = (ndvi >= -1) & (ndvi <= 1)
    in_range_percentage = (np.sum(in_range_mask) / ndvi.size) * 100

    # Percentage of vegetation pixels (NDVI > 0.3)
    vegetation_mask = ndvi > 0.3
    vegetation_percentage = (np.sum(vegetation_mask[valid_mask]) / np.sum(valid_mask)) * 100 if np.sum(valid_mask) > 0 else 0

    return {
        "valid_pixel_percentage": float(valid_percentage),
        "in_range_percentage": float(in_range_percentage),
        "vegetation_percentage": float(vegetation_percentage),
        "mean_ndvi": float(np.nanmean(ndvi)),
        "std_ndvi": float(np.nanstd(ndvi)),
    }
