from __future__ import annotations

from collections import defaultdict
from datetime import date

import numpy as np

from .types import PercentileSet, Step1Output, Step3Output


DEFAULT_PERIODS: dict[str, set[int]] = {
    "dormancy": {12, 1, 2},
    "growth": {3, 4, 5},
    "flowering": {6, 7},
    "maturation": {8, 9, 10, 11},
}


def _as_percentile_set(values: list[float], multiplier: float) -> PercentileSet:
    arr = np.array(values, dtype=np.float64)
    p10, p25, p50, p75, p90 = np.percentile(arr, [10, 25, 50, 75, 90])
    avg = float(np.mean(arr))
    std = float(np.std(arr))

    return PercentileSet(
        p10=float(p10 * multiplier),
        p25=float(p25 * multiplier),
        p50=float(p50 * multiplier),
        p75=float(p75 * multiplier),
        p90=float(p90 * multiplier),
        mean=float(avg * multiplier),
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
    age_adjustment: dict[str, float] | None = None,
) -> Step3Output:
    periods = phenology_periods or DEFAULT_PERIODS
    adjustments = age_adjustment or {}

    global_percentiles: dict[str, PercentileSet] = {}
    period_percentiles: dict[str, dict[str, PercentileSet]] = defaultdict(dict)

    for index, points in satellite_data.index_time_series.items():
        if not points:
            continue

        valid = [(point.date, point.value) for point in points if not point.outlier]
        if not valid:
            valid = [(point.date, point.value) for point in points]

        values = [value for _, value in valid]
        multiplier = adjustments.get(index, 1.0)

        global_percentiles[index] = _as_percentile_set(values, multiplier)

        first_date = min(point_date for point_date, _ in valid)
        last_date = max(point_date for point_date, _ in valid)
        month_span = (last_date.year - first_date.year) * 12 + (
            last_date.month - first_date.month
        )

        if month_span > 24:
            for period_name, months in periods.items():
                period_values = _collect_period_values(valid, months)
                if period_values:
                    period_percentiles[period_name][index] = _as_percentile_set(
                        period_values,
                        multiplier,
                    )

    return Step3Output(
        global_percentiles=global_percentiles,
        phenology_period_percentiles=dict(period_percentiles),
    )
