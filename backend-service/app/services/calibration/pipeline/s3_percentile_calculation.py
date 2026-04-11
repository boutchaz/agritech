from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Any

import numpy as np

from ..referential_utils import (
    DEFAULT_PERIODS,
    get_phenology_periods_from_stades_bbch,
)
from ..types import PercentileSet, Step1Output, Step3Output


# Minimum observations for meaningful percentile statistics.
# Below this threshold, P10/P90 are unreliable noise.
MIN_PERCENTILE_SAMPLES = 10
MIN_PERIOD_SAMPLES = 5


def _as_percentile_set(values: list[float]) -> PercentileSet:
    arr = np.array(values, dtype=np.float64)
    p10, p25, p50, p75, p90 = np.percentile(arr, [10, 25, 50, 75, 90])
    avg = float(np.mean(arr))
    std = float(np.std(arr))

    return PercentileSet(
        p10=float(p10),
        p25=float(p25),
        p50=float(p50),
        p75=float(p75),
        p90=float(p90),
        mean=float(avg),
        std=std,
    )


def _collect_period_values(
    points: list[tuple[date, float]],
    period_months: set[int],
) -> list[float]:
    return [value for point_date, value in points if point_date.month in period_months]


def calculate_percentiles(
    satellite_data: Step1Output,
    phenology_periods: dict[str, set[int]] | None = None,
    reference_data: dict[str, Any] | None = None,
    crop_type: str | None = None,
    planting_system: str | None = None,
) -> Step3Output:
    periods = phenology_periods or DEFAULT_PERIODS
    if reference_data and crop_type:
        ref_periods = get_phenology_periods_from_stades_bbch(reference_data)
        if ref_periods:
            periods = ref_periods

    global_percentiles: dict[str, PercentileSet] = {}
    period_percentiles: dict[str, dict[str, PercentileSet]] = defaultdict(dict)

    for index, points in satellite_data.index_time_series.items():
        if not points:
            continue

        observed = [
            (point.date, point.value)
            for point in points
            if not point.interpolated
        ]
        valid = [
            (point.date, point.value)
            for point in points
            if not point.outlier and not point.interpolated
        ]
        if not valid:
            valid = observed

        values = [value for _, value in valid]

        if len(values) < MIN_PERCENTILE_SAMPLES:
            continue

        global_percentiles[index] = _as_percentile_set(values)

        first_date = min(point_date for point_date, _ in valid)
        last_date = max(point_date for point_date, _ in valid)
        month_span = (last_date.year - first_date.year) * 12 + (
            last_date.month - first_date.month
        )

        if month_span > 24:
            for period_name, months in periods.items():
                period_values = _collect_period_values(valid, months)
                if len(period_values) >= MIN_PERIOD_SAMPLES:
                    period_percentiles[period_name][index] = _as_percentile_set(
                        period_values,
                    )

    return Step3Output(
        global_percentiles=global_percentiles,
        phenology_period_percentiles=dict(period_percentiles),
    )
