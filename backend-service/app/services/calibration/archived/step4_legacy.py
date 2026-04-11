"""Legacy signal-based phenology detection (curve fitting).

Fallback for crops without a ``protocole_phenologique`` in their referential.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from statistics import mean, pstdev
from typing import Any

import numpy as np

from ..referential_utils import (
    DEFAULT_PERIODS,
    get_cycle_months_from_stades_bbch,
    get_index_key_from_referential,
    get_phenology_periods_from_stades_bbch,
    group_points_by_cycle_year,
)
from ..types import PhenologyDates, Step1Output, Step2Output, Step4Output


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


def _indices_in_months(dates: list[date], months: set[int]) -> list[int]:
    return [i for i, d in enumerate(dates) if d.month in months]


def _values_at_indices(values: list[float], indices: list[int]) -> list[float]:
    return [values[i] for i in indices if 0 <= i < len(values)]


def _find_constrained_stages_for_year(
    points: list[tuple[date, float]],
    phenology_periods: dict[str, set[int]],
) -> dict[str, date]:
    sorted_points = sorted(points, key=lambda item: item[0])
    dates = [item[0] for item in sorted_points]
    values = _safe_smooth([item[1] for item in sorted_points])

    if len(dates) < 5:
        return _fallback_stages(dates, values)

    dormancy_months = phenology_periods.get("dormancy", set())
    active_months = (
        phenology_periods.get("growth", set())
        | phenology_periods.get("flowering", set())
        | phenology_periods.get("maturation", set())
    )

    dormancy_indices = _indices_in_months(dates, dormancy_months)
    active_indices = _indices_in_months(dates, active_months)

    dormancy_values = _values_at_indices(values, dormancy_indices)
    active_values = _values_at_indices(values, active_indices)

    if not dormancy_values:
        dormancy_baseline = float(np.min(values))
    else:
        dormancy_baseline = float(np.min(dormancy_values))

    if not active_values:
        peak_idx = int(np.argmax(values))
    else:
        peak_idx = active_indices[int(np.argmax(active_values))]

    peak_value = values[peak_idx]
    amplitude = peak_value - dormancy_baseline

    if amplitude <= 0:
        return _fallback_stages(dates, values)

    if peak_value > 0 and amplitude / peak_value < 0.15:
        return _fallback_stages(dates, values)

    plateau_threshold = 0.95 * peak_value
    dormancy_exit_threshold = dormancy_baseline + 0.15 * amplitude
    dormancy_entry_threshold = dormancy_baseline + 0.20 * amplitude

    dormancy_exit_idx = _find_dormancy_exit(
        dates, values, dormancy_months, active_months, dormancy_exit_threshold
    )

    plateau_start_idx = _find_plateau_start(values, peak_idx, plateau_threshold)
    decline_start_idx = _find_decline_start(values, peak_idx, plateau_threshold)

    dormancy_entry_idx = _find_dormancy_entry(
        dates, values, decline_start_idx, dormancy_months,
        dormancy_entry_threshold, peak_idx,
    )

    stages = _build_result(
        dates, dormancy_exit_idx, peak_idx, plateau_start_idx,
        decline_start_idx, dormancy_entry_idx,
    )

    if _temporal_order_valid(stages):
        return stages

    return _fallback_stages(dates, values)


def _find_dormancy_exit(
    dates: list[date], values: list[float],
    dormancy_months: set[int], active_months: set[int], threshold: float,
) -> int:
    last_dormancy_idx = 0
    for i, d in enumerate(dates):
        if d.month in dormancy_months:
            last_dormancy_idx = i

    for i in range(last_dormancy_idx + 1, len(values)):
        if dates[i].month not in active_months:
            continue
        if values[i] >= threshold:
            return i

    for i in range(last_dormancy_idx + 1, len(values)):
        if values[i] > values[max(0, i - 1)]:
            return i

    return 0


def _find_plateau_start(values: list[float], peak_idx: int, threshold: float) -> int:
    for i in range(peak_idx - 1, -1, -1):
        if values[i] < threshold:
            return i + 1
    return 0


def _find_decline_start(values: list[float], peak_idx: int, threshold: float) -> int:
    for i in range(peak_idx + 1, len(values)):
        if values[i] < threshold:
            return i
    return peak_idx


def _find_dormancy_entry(
    dates: list[date], values: list[float], decline_start_idx: int,
    dormancy_months: set[int], threshold: float, peak_idx: int,
) -> int:
    for i in range(decline_start_idx + 1, len(values)):
        if dates[i].month in dormancy_months and values[i] <= threshold:
            return i

    tail = values[decline_start_idx:]
    if tail:
        return decline_start_idx + int(np.argmin(tail))

    return len(values) - 1


def _build_result(
    dates: list[date], dormancy_exit_idx: int, peak_idx: int,
    plateau_start_idx: int, decline_start_idx: int, dormancy_entry_idx: int,
) -> dict[str, date]:
    return {
        "dormancy_exit": dates[dormancy_exit_idx],
        "peak": dates[peak_idx],
        "plateau_start": dates[plateau_start_idx],
        "decline_start": dates[decline_start_idx],
        "dormancy_entry": dates[dormancy_entry_idx],
    }


def _temporal_order_valid(stages: dict[str, date]) -> bool:
    order_ok = (
        stages["dormancy_exit"] < stages["plateau_start"]
        and stages["plateau_start"] <= stages["peak"]
        and stages["peak"] < stages["decline_start"]
        and stages["decline_start"] < stages["dormancy_entry"]
    )
    if not order_ok:
        return False

    exit_to_peak = (stages["peak"] - stages["dormancy_exit"]).days
    peak_to_decline = (stages["decline_start"] - stages["peak"]).days
    exit_to_entry = (stages["dormancy_entry"] - stages["dormancy_exit"]).days

    if exit_to_peak < 14:
        return False
    if peak_to_decline < 7:
        return False
    if exit_to_entry < 90:
        return False

    return True


def _fallback_stages(dates: list[date], values: list[float]) -> dict[str, date]:
    if not dates:
        today = date.today()
        return {
            "dormancy_exit": today,
            "peak": today,
            "plateau_start": today,
            "decline_start": today,
            "dormancy_entry": today,
        }

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

    stages = {
        "dormancy_exit": dates[dormancy_exit_idx],
        "peak": dates[max_idx],
        "plateau_start": dates[plateau_idx],
        "decline_start": dates[decline_idx],
        "dormancy_entry": dates[dormancy_entry_idx],
    }

    if _temporal_order_valid(stages):
        return stages

    first, last = dates[0], dates[-1]
    span = (last - first).days
    if span < 30:
        return stages

    return {
        "dormancy_exit": first + timedelta(days=int(span * 0.05)),
        "plateau_start": first + timedelta(days=int(span * 0.35)),
        "peak": first + timedelta(days=int(span * 0.45)),
        "decline_start": first + timedelta(days=int(span * 0.55)),
        "dormancy_entry": first + timedelta(days=int(span * 0.90)),
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


def detect_phenology_legacy(
    satellite_data: Step1Output,
    weather_data: Step2Output,
    index_key: str = "NIRv",
    crop_type: str | None = None,
    variety: str | None = None,
    planting_system: str | None = None,
    reference_data: dict[str, Any] | None = None,
) -> Step4Output:
    """Legacy signal-based phenology detection.

    Kept as fallback for crops without ``protocole_phenologique``.
    """
    resolved_index = index_key
    if reference_data and planting_system:
        ref_index = get_index_key_from_referential(reference_data, planting_system)
        if ref_index:
            resolved_index = ref_index

    preferred = satellite_data.index_time_series.get(resolved_index)
    fallback = satellite_data.index_time_series.get("NDVI", [])
    series = preferred if preferred else fallback

    points_list: list[tuple[date, float]] = [
        (point.date, point.value) for point in series
    ]

    phenology_periods = DEFAULT_PERIODS
    if reference_data:
        ref_periods = get_phenology_periods_from_stades_bbch(reference_data)
        if ref_periods:
            phenology_periods = ref_periods

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
        sorted_pts = sorted(points, key=lambda p: p[0])
        date_span = (sorted_pts[-1][0] - sorted_pts[0][0]).days
        if date_span < 120:
            continue
        yearly_stages[year] = _find_constrained_stages_for_year(
            points, phenology_periods
        )

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
            yearly_stages={},
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

    mean_dates_dict: dict[str, date] = {}
    variability: dict[str, float] = {}
    gdd_correlation: dict[str, float] = {}

    for stage in stage_names:
        doy_values = [
            yearly_stages[year][stage].timetuple().tm_yday
            for year in sorted(yearly_stages.keys())
        ]
        avg_doy = int(round(mean(doy_values)))
        mean_dates_dict[stage] = _day_of_year_to_date(reference_year, avg_doy)
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

    yearly_stages_out: dict[str, PhenologyDates] = {}
    for y, stages in sorted(yearly_stages.items()):
        yearly_stages_out[str(y)] = PhenologyDates(
            dormancy_exit=stages["dormancy_exit"],
            peak=stages["peak"],
            plateau_start=stages["plateau_start"],
            decline_start=stages["decline_start"],
            dormancy_entry=stages["dormancy_entry"],
        )

    return Step4Output(
        mean_dates=PhenologyDates(
            dormancy_exit=mean_dates_dict["dormancy_exit"],
            peak=mean_dates_dict["peak"],
            plateau_start=mean_dates_dict["plateau_start"],
            decline_start=mean_dates_dict["decline_start"],
            dormancy_entry=mean_dates_dict["dormancy_entry"],
        ),
        yearly_stages=yearly_stages_out,
        inter_annual_variability_days=variability,
        gdd_correlation=gdd_correlation,
        referential_cycle_used=referential_cycle_used,
    )
