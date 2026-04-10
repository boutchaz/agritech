from __future__ import annotations

import math
from collections import defaultdict
from datetime import date, datetime

from .types import ExtremeEvent, MonthlyWeatherAggregate, Step2Output, WeatherDay


def _to_float(value: object, default: float = 0.0) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    return default


# Moroccan Mediterranean climate — season boundaries for drought detection
_DRY_SEASON_MONTHS = {6, 7, 8, 9}
_TRANSITION_MONTHS = {4, 5, 10}


def _drought_threshold(month: int, crop_type: str) -> int:
    """Drought streak (days) required to flag ``prolonged_drought``.

    Morocco has a pronounced dry season (Jun-Sep) where 30+ rainless days are
    normal.  Using a fixed 30-day threshold produces ~10 false positives per
    parcel.  Season-aware thresholds eliminate most false alarms while still
    catching genuinely anomalous dry spells.

    TODO: Read these thresholds from referentiel seuils_meteo.secheresse
    instead of hardcoding. Each crop's referentiel (DATA_OLIVIER, DATA_AGRUMES,
    etc.) should define its own climate thresholds via a ``seuils_meteo`` section.
    """
    if crop_type == "palmier_dattier":
        # Saharan / Errachidia climate — much drier baseline
        return 90 if month in _DRY_SEASON_MONTHS else 45
    if month in _DRY_SEASON_MONTHS:
        return 60
    if month in _TRANSITION_MONTHS:
        return 30
    return 20  # rainy season (Nov-Mar)


def _estimate_chill_hours(temp_min: float, temp_max: float) -> float:
    """Sinusoidal model: simulate 24 hourly temperatures, count hours < 7.2 °C."""
    if temp_min >= 7.2:
        return 0.0
    if temp_max <= 0:
        return 0.0
    midpoint = (temp_min + temp_max) / 2.0
    amplitude = (temp_max - temp_min) / 2.0
    count = 0
    for hour in range(24):
        hourly = midpoint + amplitude * math.sin(((hour - 9) / 24) * 2 * math.pi)
        if hourly < 7.2:
            count += 1
    return float(count)


def extract_weather_history(
    weather_data: list[dict[str, object]],
    crop_type: str,
    frost_threshold: float = 0.0,
    heat_threshold: float = 38.0,
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

    ordered_rows = sorted(weather_data, key=lambda row: str(row.get("date", "")))

    for raw in ordered_rows:
        current_date = date.fromisoformat(str(raw.get("date")))
        temp_min = _to_float(raw.get("temp_min") or raw.get("temperature_min"))
        temp_max = _to_float(raw.get("temp_max") or raw.get("temperature_max"))
        precip = _to_float(raw.get("precip") or raw.get("precipitation_sum"))
        et0 = _to_float(raw.get("et0") or raw.get("et0_fao_evapotranspiration"))
        wind = _to_float(raw.get("wind_speed_max"))

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

        if current_date.month >= 3 and temp_min < frost_threshold:
            extremes.append(
                ExtremeEvent(
                    date=current_date, event_type="late_frost", severity="high"
                )
            )

        if temp_max > heat_threshold:
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
        if drought_streak == _drought_threshold(current_date.month, crop_type):
            extremes.append(
                ExtremeEvent(
                    date=current_date, event_type="prolonged_drought", severity="medium"
                )
            )

        if wind > 60:
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
            _estimate_chill_hours(day.temp_min, day.temp_max)
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
