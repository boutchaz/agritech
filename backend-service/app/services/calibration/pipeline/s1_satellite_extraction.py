from __future__ import annotations

from datetime import date, timedelta
from statistics import mean, pstdev
from typing import Iterable

import numpy as np
try:
    from scipy.signal import savgol_filter
except ModuleNotFoundError:  # pragma: no cover - exercised in minimal envs
    savgol_filter = None

from ..types import IndexTimePoint, Step1Output


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
    # EBI — required by AMANDIER referential for intensif/super_intensif.
    # Computed by earth_engine.py from R/G/B Sentinel-2 bands (Chen et al. 2019).
    "EBI",
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


def _mark_temporal_artefacts(
    values: list[IndexTimePoint],
    spike_threshold: float = 0.30,
    confirm_window_days: int = 10,
    confirm_tolerance: float = 0.10,
) -> int:
    """Flag artefacts using temporal plausibility from the referential.

    Implements ``protocole_phenologique.filtrage.fait_au_calibrage.plausibilite_temporelle``:

    1. **Detect spike**: ``|V(t) - V(t-1)| / V(t-1) > spike_threshold``
    2. **Confirm artefact**: within the next ``confirm_window_days``, if
       a subsequent value returns to ±``confirm_tolerance`` of V(t-1),
       the spike is confirmed as an artefact and marked as outlier.

    This replaces the old IQR-based outlier detection.  SCL filtering at
    download time already removes cloud-contaminated pixels; this catches
    residual artefacts (thin shadows, sensor glitches, field-edge bleed)
    without flagging legitimate seasonal transitions.
    """
    if len(values) < 3:
        return 0

    count = 0
    i = 1
    while i < len(values):
        prev = values[i - 1]
        curr = values[i]

        # Skip already-flagged or interpolated points
        if prev.outlier or prev.interpolated:
            i += 1
            continue

        # Step 1: detect spike
        if prev.value == 0:
            i += 1
            continue

        relative_change = abs(curr.value - prev.value) / abs(prev.value)
        if relative_change <= spike_threshold:
            i += 1
            continue

        # Step 2: look ahead within confirm_window_days for a snap-back
        confirmed = False
        for j in range(i + 1, len(values)):
            days_ahead = (values[j].date - curr.date).days
            if days_ahead > confirm_window_days:
                break
            if values[j].outlier or values[j].interpolated:
                continue
            # Check if it returns to ±tolerance of the pre-spike value
            if abs(values[j].value - prev.value) / abs(prev.value) <= confirm_tolerance:
                confirmed = True
                break

        if confirmed:
            # Mark the spike point as artefact
            curr.outlier = True
            count += 1

        i += 1

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
    if savgol_filter is None:
        # Minimal deployments may omit scipy. Keep raw observed values instead
        # of failing the entire calibration module at import time.
        return

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


def _extract_plausibility_config(
    reference_data: dict | None,
) -> tuple[float, int, float]:
    """Read plausibilite_temporelle thresholds from referential, with defaults."""
    spike = 0.30
    window = 10
    tolerance = 0.10
    if not reference_data:
        return spike, window, tolerance
    proto = reference_data.get("protocole_phenologique")
    if not isinstance(proto, dict):
        return spike, window, tolerance
    filtrage = proto.get("filtrage")
    if not isinstance(filtrage, dict):
        return spike, window, tolerance
    cal = filtrage.get("fait_au_calibrage")
    if not isinstance(cal, dict):
        return spike, window, tolerance
    plaus = cal.get("plausibilite_temporelle")
    if not isinstance(plaus, dict):
        return spike, window, tolerance
    # Parse condition_artefact — structured dict or legacy string
    cond = plaus.get("condition_artefact", "")
    if isinstance(cond, dict):
        # Structured format: {"var": "spike_ratio", "gt": 0.30}
        gt_val = cond.get("gt")
        if gt_val is not None:
            try:
                spike = float(gt_val)
            except (TypeError, ValueError):
                pass
    else:
        # Legacy string: "|V(t) - V(t-1)| / V(t-1) > 0.30"
        import re
        m = re.search(r">\s*([\d.]+)", str(cond))
        if m:
            spike = float(m.group(1))
    return spike, window, tolerance


def extract_satellite_history(
    *,
    organization_id: str,
    parcel_id: str,
    images: list[dict[str, object]],
    storage,
    max_cloud_coverage: float = 20.0,
    interpolate_max_gap_days: int = 15,
    fallback_series: dict[str, list[dict[str, object]]] | None = None,
    reference_data: dict | None = None,
) -> Step1Output:
    index_points: dict[str, list[IndexTimePoint]] = {
        index: [] for index in SUPPORTED_INDICES
    }
    raster_paths: dict[str, list[str]] = {index: [] for index in SUPPORTED_INDICES}

    filtered_image_count = 0
    cloud_values: list[float] = []

    for raw_image in images:
        cloud = _to_number(raw_image.get("cloud_coverage", 0))
        # TODO: cloud_coverage filter is redundant — SCL pixel masking at
        # download time (cloud_masking.filter_by_scl_coverage) already
        # excludes cloud-contaminated dates.  Kept for now as a safety net;
        # remove once SCL pipeline is fully validated end-to-end.
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

    # Extract plausibility config from referential
    spike_thresh, confirm_window, confirm_tol = _extract_plausibility_config(reference_data)

    interpolated_dates_set: set[date] = set()
    total_outliers = 0

    for index in SUPPORTED_INDICES:
        sorted_points = sorted(index_points[index], key=lambda item: item.date)
        enriched_points: list[IndexTimePoint] = []

        # TODO: linear interpolation is not in the referential spec — the DB
        # should already contain clean per-date median values from SCL-filtered
        # pixels.  Kept for now to fill short gaps between Sentinel-2 revisits;
        # reconsider once data pipeline is fully validated.
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
        total_outliers += _mark_temporal_artefacts(
            enriched_points,
            spike_threshold=spike_thresh,
            confirm_window_days=confirm_window,
            confirm_tolerance=confirm_tol,
        )
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
