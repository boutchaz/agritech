from __future__ import annotations

from datetime import date, timedelta
from statistics import mean, pstdev
from typing import Iterable

import numpy as np
from scipy.signal import savgol_filter

from .types import IndexTimePoint, Step1Output


SUPPORTED_INDICES = (
    "NDVI",
    "NIRv",
    "NDMI",
    "NDRE",
    "EVI",
    "MSAVI2",
    "MSI",
    "GCI",
    "OSAVI",
    "SAVI",
    "MNDWI",
    "MCARI",
    "TCARI",
    "TCARI_OSAVI",
)


def _to_number(value: object) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, list):
        numeric_values = [
            float(item) for item in value if isinstance(item, (int, float))
        ]
        if numeric_values:
            return mean(numeric_values)
    return 0.0


def _raw_index_value(indices: dict, index: str) -> object | None:
    """Read index from row; support legacy MSAVI key for MSAVI2."""
    v = indices.get(index)
    if v is not None:
        return v
    if index == "MSAVI2":
        return indices.get("MSAVI")
    return None


def _to_number_or_none(value: object) -> float | None:
    """Like _to_number but returns None for missing data instead of 0.0."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, list):
        numeric_values = [
            float(item) for item in value if isinstance(item, (int, float))
        ]
        if numeric_values:
            return mean(numeric_values)
    return None


def _mark_outliers(values: list[IndexTimePoint]) -> int:
    """Flag outliers using seasonal IQR (interquartile range).

    Points are grouped by quarter (Q1-Q4) and tested against 1.5*IQR within
    each quarter.  This prevents normal seasonal variation (e.g. dormancy vs
    peak) from being flagged as anomalous — a key problem with global sigma.

    Falls back to global IQR when a quarter has < 5 points.
    """
    if len(values) < 5:
        return 0

    # Group indices by quarter (Jan-Mar=1, Apr-Jun=2, Jul-Sep=3, Oct-Dec=4)
    quarters: dict[int, list[int]] = {1: [], 2: [], 3: [], 4: []}
    for i, point in enumerate(values):
        q = (point.date.month - 1) // 3 + 1
        quarters[q].append(i)

    # Pre-compute global IQR as fallback
    all_vals = np.array([p.value for p in values], dtype=np.float64)
    g_q1, g_q3 = float(np.percentile(all_vals, 25)), float(np.percentile(all_vals, 75))
    g_iqr = g_q3 - g_q1

    count = 0
    for _q, indices in quarters.items():
        if not indices:
            continue

        if len(indices) >= 5:
            arr = np.array([values[i].value for i in indices], dtype=np.float64)
            q1, q3 = float(np.percentile(arr, 25)), float(np.percentile(arr, 75))
            iqr = q3 - q1
        else:
            q1, q3, iqr = g_q1, g_q3, g_iqr

        if iqr == 0:
            continue

        lower = q1 - 1.5 * iqr
        upper = q3 + 1.5 * iqr
        for i in indices:
            if values[i].value < lower or values[i].value > upper:
                values[i].outlier = True
                count += 1

    return count


def _smooth_series(
    points: list[IndexTimePoint],
    window: int = 7,
    polyorder: int = 2,
) -> None:
    """Apply Savitzky-Golay smoothing in-place, skipping outlier-flagged points.

    Parameters
    ----------
    window : int
        Number of points in the smoothing window (default 7 ≈ 35 days at
        5-day Sentinel-2 revisit).  Must be odd; adjusted automatically.
    polyorder : int
        Polynomial order for the local fit (2 = quadratic, preserves
        phenological curvature).
    """
    valid_indices = [i for i, p in enumerate(points) if not p.outlier]
    if len(valid_indices) < window:
        return

    values = np.array([points[i].value for i in valid_indices], dtype=np.float64)

    effective_window = min(window, len(values))
    if effective_window % 2 == 0:
        effective_window -= 1
    if effective_window < polyorder + 2:
        return

    smoothed = savgol_filter(values, effective_window, polyorder)
    for j, idx in enumerate(valid_indices):
        points[idx].value = round(float(smoothed[j]), 6)


def _interpolate_between(
    start: IndexTimePoint,
    end: IndexTimePoint,
    max_gap_days: int,
) -> Iterable[IndexTimePoint]:
    gap_days = (end.date - start.date).days
    if gap_days <= 1 or gap_days > max_gap_days:
        return []

    interpolated: list[IndexTimePoint] = []
    for day_step in range(1, gap_days):
        target_date = start.date + timedelta(days=day_step)
        ratio = day_step / gap_days
        value = start.value + ((end.value - start.value) * ratio)
        interpolated.append(
            IndexTimePoint(
                date=target_date,
                value=round(value, 6),
                outlier=False,
                interpolated=True,
            )
        )
    return interpolated


def extract_satellite_history(
    *,
    organization_id: str,
    parcel_id: str,
    images: list[dict[str, object]],
    storage,
    max_cloud_coverage: float = 20.0,
    interpolate_max_gap_days: int = 15,
    fallback_series: dict[str, list[dict[str, object]]] | None = None,
) -> Step1Output:
    index_points: dict[str, list[IndexTimePoint]] = {
        index: [] for index in SUPPORTED_INDICES
    }
    raster_paths: dict[str, list[str]] = {index: [] for index in SUPPORTED_INDICES}

    filtered_image_count = 0
    cloud_values: list[float] = []

    for raw_image in images:
        cloud = _to_number(raw_image.get("cloud_coverage", 0))
        if cloud > max_cloud_coverage:
            filtered_image_count += 1
            continue

        cloud_values.append(cloud)
        image_date = date.fromisoformat(str(raw_image.get("date")))
        raw_indices = raw_image.get("indices")
        indices = raw_indices if isinstance(raw_indices, dict) else {}

        for index in SUPPORTED_INDICES:
            index_value = _to_number_or_none(_raw_index_value(indices, index))
            if index_value is None:
                continue
            index_points[index].append(
                IndexTimePoint(
                    date=image_date,
                    value=index_value,
                    outlier=False,
                    interpolated=False,
                )
            )

            if storage is not None:
                path = storage.build_path(
                    organization_id=organization_id,
                    parcel_id=parcel_id,
                    raster_date=image_date.isoformat(),
                    index=index,
                )
                raster_paths[index].append(path)

    if fallback_series:
        for index in SUPPORTED_INDICES:
            if index_points[index]:
                continue
            for row in fallback_series.get(index, []):
                index_points[index].append(
                    IndexTimePoint(
                        date=date.fromisoformat(str(row.get("date"))),
                        value=_to_number(row.get("mean_value")),
                        outlier=False,
                        interpolated=False,
                    )
                )

    interpolated_dates_set: set[date] = set()
    total_outliers = 0

    for index in SUPPORTED_INDICES:
        sorted_points = sorted(index_points[index], key=lambda item: item.date)
        enriched_points: list[IndexTimePoint] = []

        for idx, current in enumerate(sorted_points):
            enriched_points.append(current)
            if idx == len(sorted_points) - 1:
                continue

            next_point = sorted_points[idx + 1]
            generated = list(
                _interpolate_between(
                    current,
                    next_point,
                    max_gap_days=interpolate_max_gap_days,
                )
            )
            for generated_point in generated:
                interpolated_dates_set.add(generated_point.date)
                enriched_points.append(generated_point)

        enriched_points = sorted(enriched_points, key=lambda item: item.date)
        total_outliers += _mark_outliers(enriched_points)
        _smooth_series(enriched_points)
        index_points[index] = enriched_points

    cloud_coverage_mean = round(mean(cloud_values), 3) if cloud_values else 100.0

    return Step1Output(
        index_time_series=index_points,
        cloud_coverage_mean=cloud_coverage_mean,
        filtered_image_count=filtered_image_count,
        outlier_count=total_outliers,
        interpolated_dates=sorted(interpolated_dates_set),
        raster_paths=raster_paths,
    )
