"""Calibration-engine helper: compute chill_hours from real hourly temperature.

Replaces the sine-modeled chill summation in `s2_weather_extraction.py`.
Used by the orchestrator to overwrite `step2.chill_hours` with a hourly-derived
value from the same backend cache that powers the weather tab.

Hard-fails on Open-Meteo unavailability — no sine fallback per design decision.
"""
from __future__ import annotations

from datetime import date, timedelta

from app.services.weather.hour_counter import count_hours
from app.services.weather_service import WeatherService

CHILL_THRESHOLD_C = 7.2
CHILL_DORMANCY_MONTHS = {11, 12, 1, 2}


async def compute_hourly_chill_hours(
    *,
    latitude: float,
    longitude: float,
    year: int,
) -> int:
    """Count hours with T<7.2°C in dormancy months Nov–Feb spanning (year-1) Nov to year Feb.

    Raises:
        WeatherFetchError when Open-Meteo is unavailable (no fallback).
    """
    ws = WeatherService()
    # Clamp end_date to yesterday — Open-Meteo Archive rejects future dates.
    archive_end = min(date(year, 2, 28), date.today() - timedelta(days=1))
    rows = await ws.fetch_hourly_temperature(
        latitude=latitude,
        longitude=longitude,
        start_date=f"{year - 1}-11-01",
        end_date=archive_end.isoformat(),
    )
    return count_hours(
        rows,
        threshold=CHILL_THRESHOLD_C,
        compare="below",
        months=CHILL_DORMANCY_MONTHS,
    )
