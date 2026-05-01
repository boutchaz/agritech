"""Tests for the calibration-engine helper that computes chill_hours from hourly data.

Used by orchestrator to override the sine-derived chill_hours in step2.
"""
import asyncio
from unittest.mock import AsyncMock, patch

from app.services.weather.chill_hours import compute_hourly_chill_hours
from app.services.weather_service import WeatherFetchError


def test_computes_chill_hours_from_hourly_count_below_72():
    """Counts hourly rows with T < 7.2 in dormancy months (Nov-Feb)."""
    # Mix of months: 100 rows in Jan @ 5°C (chill), 100 in Apr @ 5°C (excluded), 50 in Nov @ 6°C (chill)
    rows = []
    for h in range(100):
        rows.append({"recorded_at": f"2025-01-15T{h % 24:02d}:00:00+00:00", "temperature_2m": 5.0})
    for h in range(100):
        rows.append({"recorded_at": f"2025-04-15T{h % 24:02d}:00:00+00:00", "temperature_2m": 5.0})
    for h in range(50):
        rows.append({"recorded_at": f"2025-11-15T{h % 24:02d}:00:00+00:00", "temperature_2m": 6.0})

    with patch(
        "app.services.weather.chill_hours.WeatherService.fetch_hourly_temperature",
        new=AsyncMock(return_value=rows),
    ):
        chill = asyncio.run(compute_hourly_chill_hours(latitude=33.89, longitude=-5.55, year=2026))

    # 100 (Jan) + 50 (Nov) = 150; April excluded
    assert chill == 150


def test_propagates_weather_fetch_error_on_open_meteo_outage():
    """When fetch_hourly_temperature raises WeatherFetchError, the helper propagates (no fallback)."""
    with patch(
        "app.services.weather.chill_hours.WeatherService.fetch_hourly_temperature",
        new=AsyncMock(side_effect=WeatherFetchError("upstream down")),
    ):
        try:
            asyncio.run(compute_hourly_chill_hours(latitude=33.89, longitude=-5.55, year=2026))
        except WeatherFetchError:
            return
        assert False, "Expected WeatherFetchError to propagate"
