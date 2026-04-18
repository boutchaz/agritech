from __future__ import annotations

from collections import defaultdict
from datetime import date

from ..referential_utils import get_weather_thresholds
from ..support.gdd_service import estimate_chill_hours
from ..types import (
    ExtremeEvent,
    MonthlyWeatherAggregate,
    Step2Output,
    WeatherDay,
    WeatherRowAccessor,
)


# Moroccan Mediterranean climate — season boundaries for drought detection
_DRY_SEASON_MONTHS = {6, 7, 8, 9}
_TRANSITION_MONTHS = {4, 5, 10}


def _drought_threshold_from_config(
    month: int,
    crop_type: str,
    *,
    reference_data: dict[str, object] | None = None,
) -> int:
    config = get_weather_thresholds(crop_type, reference_data)
    if month in _DRY_SEASON_MONTHS:
        return config.drought_days_dry_season
    if month in _TRANSITION_MONTHS:
        return config.drought_days_transition
    return config.drought_days_rainy_season


def extract_weather_history(
    weather_data: list[dict[str, object]],
    crop_type: str,
    frost_threshold: float | None = None,
    heat_threshold: float | None = None,
    reference_data: dict[str, object] | None = None,
) -> Step2Output:
    """Extract weather history: daily records, precipitation, extremes, chill hours.

    GDD is NOT computed here — the orchestrator wires crop-aware GDD via
    ``gdd_service.precompute_gdd_rows()`` and populates ``cumulative_gdd``
    after this function returns.
    """
    daily_rows: list[WeatherDay] = []
    monthly_precip: dict[str, float] = defaultdict(float)
    extremes: list[ExtremeEvent] = []

    drought_streak = 0
    heat_streak = 0

    thresholds = get_weather_thresholds(crop_type, reference_data)
    effective_frost_threshold = (
        thresholds.frost_threshold_c if frost_threshold is None else frost_threshold
    )
    effective_heat_threshold = (
        thresholds.heatwave_threshold_c if heat_threshold is None else heat_threshold
    )
    effective_hot_wind_kmh = thresholds.hot_wind_kmh

    ordered_rows = sorted(weather_data, key=lambda row: str(row.get("date", "")))

    for raw in ordered_rows:
        w = WeatherRowAccessor(raw)
        current_date = w.parsed_date
        temp_min = w.temp_min
        temp_max = w.temp_max
        precip = w.precipitation
        et0 = w.et0 or 0.0
        wind = w.wind_speed_max or 0.0

        daily_rows.append(
            WeatherDay(
                date=current_date,
                temp_min=temp_min,
                temp_max=temp_max,
                precip=precip,
                et0=et0,
            )
        )

        month_key = current_date.strftime("%Y-%m")
        monthly_precip[month_key] += precip

        if current_date.month >= 3 and temp_min < effective_frost_threshold:
            extremes.append(
                ExtremeEvent(
                    date=current_date, event_type="late_frost", severity="high"
                )
            )

        if temp_max > effective_heat_threshold:
            heat_streak += 1
        else:
            heat_streak = 0
        if heat_streak == 3:
            extremes.append(
                ExtremeEvent(date=current_date, event_type="heatwave", severity="high")
            )

        if precip < 5:
            drought_streak += 1
        else:
            drought_streak = 0
        if drought_streak == _drought_threshold_from_config(
            current_date.month,
            crop_type,
            reference_data=reference_data,
        ):
            extremes.append(
                ExtremeEvent(
                    date=current_date, event_type="prolonged_drought", severity="medium"
                )
            )

        if wind > effective_hot_wind_kmh:
            extremes.append(
                ExtremeEvent(
                    date=current_date, event_type="high_wind", severity="medium"
                )
            )

    monthly_aggregates: list[MonthlyWeatherAggregate] = []
    for month in sorted(monthly_precip.keys()):
        monthly_aggregates.append(
            MonthlyWeatherAggregate(
                month=month,
                precipitation_total=round(monthly_precip[month], 3),
                gdd_total=0.0,
            )
        )

    chill_hours = round(
        sum(
            estimate_chill_hours(day.temp_max, day.temp_min)
            for day in daily_rows
            if day.date.month in {11, 12, 1, 2}
        ),
        3,
    )

    return Step2Output(
        daily_weather=daily_rows,
        monthly_aggregates=monthly_aggregates,
        cumulative_gdd={},
        chill_hours=chill_hours,
        extreme_events=extremes,
    )
