from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime

from .types import ExtremeEvent, MonthlyWeatherAggregate, Step2Output, WeatherDay


def _to_float(value: object, default: float = 0.0) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    return default


def _estimate_chill_hours(temp_min: float, temp_max: float) -> float:
    if temp_min >= 7.2:
        return 0.0
    if temp_max <= 0:
        return 0.0
    return round(min(12.0, max(0.0, (7.2 - temp_min) * 1.5)), 2)


def extract_weather_history(
    weather_data: list[dict[str, object]],
    crop_type: str,
    tbase: float,
    frost_threshold: float = 0.0,
    heat_threshold: float = 38.0,
) -> Step2Output:
    _ = crop_type

    daily_rows: list[WeatherDay] = []
    monthly_precip: dict[str, float] = defaultdict(float)
    monthly_gdd: dict[str, float] = defaultdict(float)
    cumulative_gdd: dict[str, float] = {}
    extremes: list[ExtremeEvent] = []

    running_gdd = 0.0
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
        gdd_daily = max(0.0, ((temp_max + temp_min) / 2.0) - tbase)

        monthly_precip[month_key] += precip
        monthly_gdd[month_key] += gdd_daily
        running_gdd += gdd_daily
        cumulative_gdd[month_key] = round(running_gdd, 3)

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
        if drought_streak == 30:
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
                gdd_total=round(monthly_gdd[month], 3),
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
        cumulative_gdd=cumulative_gdd,
        chill_hours=chill_hours,
        extreme_events=extremes,
    )
