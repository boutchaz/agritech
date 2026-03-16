from __future__ import annotations

from collections import defaultdict
from datetime import date
from statistics import mean, pstdev
from typing import Any

import numpy as np

from .referential_utils import (
    get_cycle_months_from_stades_bbch,
    get_index_key_from_referential,
    group_points_by_cycle_year,
)
from .types import PhenologyDates, Step1Output, Step2Output, Step4Output


def _safe_smooth(values: list[float]) -> list[float]:
    if len(values) < 5:
        return values
    window = 5
    kernel = np.ones(window, dtype=np.float64) / window
    smoothed = np.convolve(np.array(values, dtype=np.float64), kernel, mode="same")
    return [float(item) for item in smoothed]


def _day_of_year_to_date(year: int, day_of_year: int) -> date:
    base = date(year, 1, 1)
    return base.fromordinal(base.toordinal() + max(0, day_of_year - 1))


def _find_stages_for_year(points: list[tuple[date, float]]) -> dict[str, date]:
    sorted_points = sorted(points, key=lambda item: item[0])
    dates = [item[0] for item in sorted_points]
    values = _safe_smooth([item[1] for item in sorted_points])

    min_idx = int(np.argmin(values))
    max_idx = int(np.argmax(values))
    peak_value = values[max_idx]
    plateau_threshold = peak_value * 0.95

    dormancy_exit_idx = min_idx
    for idx in range(min_idx + 1, len(values)):
        if values[idx] > values[idx - 1] and values[idx] >= plateau_threshold * 0.7:
            dormancy_exit_idx = idx
            break

    plateau_idx = max_idx
    for idx in range(max_idx, len(values)):
        if values[idx] >= plateau_threshold:
            plateau_idx = idx
            break

    decline_idx = max_idx
    for idx in range(max_idx + 1, len(values)):
        if values[idx] < plateau_threshold:
            decline_idx = idx
            break

    dormancy_entry_idx = decline_idx
    tail = values[decline_idx:]
    if tail:
        local_min_idx = int(np.argmin(tail))
        dormancy_entry_idx = decline_idx + local_min_idx

    return {
        "dormancy_exit": dates[dormancy_exit_idx],
        "peak": dates[max_idx],
        "plateau_start": dates[plateau_idx],
        "decline_start": dates[decline_idx],
        "dormancy_entry": dates[dormancy_entry_idx],
    }


def _nearest_cumulative_gdd(
    stage_date: date, cumulative_gdd: dict[str, float]
) -> float:
    if not cumulative_gdd:
        return 0.0
    month_key = stage_date.strftime("%Y-%m")
    if month_key in cumulative_gdd:
        return float(cumulative_gdd[month_key])

    candidate_keys = sorted(cumulative_gdd.keys())
    for key in reversed(candidate_keys):
        if key <= month_key:
            return float(cumulative_gdd[key])
    return float(cumulative_gdd[candidate_keys[0]])


def detect_phenology(
    satellite_data: Step1Output,
    weather_data: Step2Output,
    index_key: str = "NIRv",
    crop_type: str | None = None,
    variety: str | None = None,
    planting_system: str | None = None,
    reference_data: dict[str, Any] | None = None,
) -> Step4Output:
    # Resolve index from referential when available (e.g. systemes[system].indice_cle)
    resolved_index = index_key
    if reference_data and planting_system:
        ref_index = get_index_key_from_referential(reference_data, planting_system)
        if ref_index:
            resolved_index = ref_index

    preferred = satellite_data.index_time_series.get(resolved_index)
    fallback = satellite_data.index_time_series.get("NDVI", [])
    series = preferred if preferred else fallback

    # Build (date, value) list for grouping
    points_list: list[tuple[date, float]] = [
        (point.date, point.value) for point in series
    ]

    cycle_months = None
    if reference_data:
        cycle_months = get_cycle_months_from_stades_bbch(reference_data)

    referential_cycle_used = False
    if cycle_months is not None and points_list:
        start_month, end_month = cycle_months
        grouped = group_points_by_cycle_year(points_list, start_month, end_month)
        referential_cycle_used = True
    else:
        grouped = defaultdict(list)
        for point in series:
            grouped[point.date.year].append((point.date, point.value))

    yearly_stages: dict[int, dict[str, date]] = {}
    for year, points in grouped.items():
        if len(points) < 5:
            continue
        yearly_stages[year] = _find_stages_for_year(points)

    if not yearly_stages:
        fallback_date = date.today()
        return Step4Output(
            mean_dates=PhenologyDates(
                dormancy_exit=fallback_date,
                peak=fallback_date,
                plateau_start=fallback_date,
                decline_start=fallback_date,
                dormancy_entry=fallback_date,
            ),
            inter_annual_variability_days={
                "dormancy_exit": 0.0,
                "peak": 0.0,
                "plateau_start": 0.0,
                "decline_start": 0.0,
                "dormancy_entry": 0.0,
            },
            gdd_correlation={
                "dormancy_exit": 0.0,
                "peak": 0.0,
                "plateau_start": 0.0,
                "decline_start": 0.0,
                "dormancy_entry": 0.0,
            },
            referential_cycle_used=referential_cycle_used,
        )

    stage_names = [
        "dormancy_exit",
        "peak",
        "plateau_start",
        "decline_start",
        "dormancy_entry",
    ]
    reference_year = min(yearly_stages.keys())

    mean_dates: dict[str, date] = {}
    variability: dict[str, float] = {}
    gdd_correlation: dict[str, float] = {}

    for stage in stage_names:
        doy_values = [
            yearly_stages[year][stage].timetuple().tm_yday
            for year in sorted(yearly_stages.keys())
        ]
        avg_doy = int(round(mean(doy_values)))
        mean_dates[stage] = _day_of_year_to_date(reference_year, avg_doy)
        variability[stage] = (
            float(round(pstdev(doy_values), 3)) if len(doy_values) > 1 else 0.0
        )

        gdd_values = [
            _nearest_cumulative_gdd(
                yearly_stages[year][stage], weather_data.cumulative_gdd
            )
            for year in sorted(yearly_stages.keys())
        ]
        if len(doy_values) > 1 and len(set(gdd_values)) > 1:
            corr = float(np.corrcoef(np.array(doy_values), np.array(gdd_values))[0, 1])
            gdd_correlation[stage] = 0.0 if np.isnan(corr) else round(corr, 4)
        else:
            gdd_correlation[stage] = 0.0

    return Step4Output(
        mean_dates=PhenologyDates(
            dormancy_exit=mean_dates["dormancy_exit"],
            peak=mean_dates["peak"],
            plateau_start=mean_dates["plateau_start"],
            decline_start=mean_dates["decline_start"],
            dormancy_entry=mean_dates["dormancy_entry"],
        ),
        inter_annual_variability_days=variability,
        gdd_correlation=gdd_correlation,
        referential_cycle_used=referential_cycle_used,
    )
