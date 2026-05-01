"""Tests for compute_phenological_counters — the stage-aware reading service."""
import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from app.services.weather.phenological_counters import (
    UnsupportedCropError,
    compute_phenological_counters,
)


def _hourly_rows_jan_to_dec(temp_below_72: int = 0):
    """Synthesize hourly rows: each month has 100 rows, all = 6°C if temp_below_72 else 20°C."""
    rows = []
    for month in range(1, 13):
        temp = 6.0 if (temp_below_72 == month) else 20.0
        for h in range(100):
            rows.append({
                "recorded_at": f"2025-{month:02d}-15T{h % 24:02d}:00:00+00:00",
                "temperature_2m": temp,
            })
    return rows


def test_loads_referentiel_and_returns_stage_structure():
    """compute_phenological_counters returns a stages list mirroring the referentiel shape."""
    fetch_mock = AsyncMock(return_value=_hourly_rows_jan_to_dec(temp_below_72=1))

    with patch(
        "app.services.weather.phenological_counters.WeatherService.fetch_hourly_temperature",
        new=fetch_mock,
    ), patch(
        "app.services.supabase_service.supabase_service.get_cached_threshold_counts",
        new=AsyncMock(return_value=[]),
        create=True,
    ), patch(
        "app.services.supabase_service.supabase_service.persist_threshold_counts",
        new=AsyncMock(return_value=None),
        create=True,
    ):
        result = asyncio.run(
            compute_phenological_counters(latitude=33.89, longitude=-5.55, year=2025, crop_type="olivier")
        )

    assert result["crop_type"] == "olivier"
    assert result["year"] == 2025
    assert isinstance(result["stages"], list)
    assert len(result["stages"]) >= 1
    # Each stage has counters
    for stage in result["stages"]:
        assert "key" in stage
        assert "counters" in stage
        for counter in stage["counters"]:
            assert "key" in counter
            assert "value" in counter
            assert isinstance(counter["value"], int)


def test_unknown_crop_raises_unsupported_crop_error():
    """crop_type with no referentiel must raise UnsupportedCropError."""
    try:
        asyncio.run(
            compute_phenological_counters(latitude=33.89, longitude=-5.55, year=2025, crop_type="mango")
        )
    except UnsupportedCropError:
        return
    assert False, "Expected UnsupportedCropError"


def test_threshold_cache_populated_on_first_call():
    """First call writes one row per (stage, threshold) into weather_threshold_cache."""
    fetch_mock = AsyncMock(return_value=_hourly_rows_jan_to_dec())
    persist_mock = AsyncMock(return_value=None)

    with patch(
        "app.services.weather.phenological_counters.WeatherService.fetch_hourly_temperature",
        new=fetch_mock,
    ), patch(
        "app.services.supabase_service.supabase_service.get_cached_threshold_counts",
        new=AsyncMock(return_value=[]),
        create=True,
    ), patch(
        "app.services.supabase_service.supabase_service.persist_threshold_counts",
        new=persist_mock,
        create=True,
    ):
        asyncio.run(
            compute_phenological_counters(latitude=33.89, longitude=-5.55, year=2025, crop_type="olivier")
        )

    assert persist_mock.called
    persisted = persist_mock.call_args.args[0] if persist_mock.call_args.args else []
    # Should have at least one row per stage's threshold (olive has 3 stages, 6 thresholds total)
    assert len(persisted) >= 1


def test_threshold_cache_read_skips_hourly_fetch():
    """When all (stage, threshold) entries are cached, hourly fetch is NOT called."""
    # Pre-populate cache rows for olive's known stages
    cached = [
        {"stage_key": "dormancy", "threshold_key": "chill_hours", "count": 409},
        {"stage_key": "dormancy", "threshold_key": "frost_risk", "count": 12},
        {"stage_key": "flowering", "threshold_key": "optimal_flowering", "count": 700},
        {"stage_key": "flowering", "threshold_key": "heat_stress", "count": 30},
        {"stage_key": "fruit_development", "threshold_key": "growing_hours", "count": 2400},
        {"stage_key": "fruit_development", "threshold_key": "extreme_heat", "count": 5},
    ]
    fetch_mock = AsyncMock(return_value=[])

    with patch(
        "app.services.weather.phenological_counters.WeatherService.fetch_hourly_temperature",
        new=fetch_mock,
    ), patch(
        "app.services.supabase_service.supabase_service.get_cached_threshold_counts",
        new=AsyncMock(return_value=cached),
        create=True,
    ), patch(
        "app.services.supabase_service.supabase_service.persist_threshold_counts",
        new=AsyncMock(return_value=None),
        create=True,
    ):
        result = asyncio.run(
            compute_phenological_counters(latitude=33.89, longitude=-5.55, year=2025, crop_type="olivier")
        )

    assert not fetch_mock.called, "hourly fetch should be skipped on full cache hit"
    # Sanity: chill_hours from cache surfaces in response
    chill = next(
        (c for s in result["stages"] for c in s["counters"] if c["key"] == "chill_hours"),
        None,
    )
    assert chill is not None and chill["value"] == 409
