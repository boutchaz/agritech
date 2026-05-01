"""Tests for WeatherService.fetch_hourly_temperature — Open-Meteo hourly Archive."""
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.weather_service import WeatherService


def _mock_open_meteo_hourly_response(num_hours: int = 4):
    """Build a fake Open-Meteo hourly response."""
    times = [f"2025-11-01T{h:02d}:00" for h in range(num_hours)]
    temps = [5.0 + h * 0.5 for h in range(num_hours)]
    return {"hourly": {"time": times, "temperature_2m": temps}}


def _make_async_get_mock(json_payload: dict):
    """Patch httpx.AsyncClient.get to return a mock response with the given JSON."""
    response = MagicMock()
    response.raise_for_status = MagicMock()
    response.json = MagicMock(return_value=json_payload)
    client_instance = AsyncMock()
    client_instance.get = AsyncMock(return_value=response)

    client_cm = MagicMock()
    client_cm.__aenter__ = AsyncMock(return_value=client_instance)
    client_cm.__aexit__ = AsyncMock(return_value=None)
    return client_cm, client_instance


def test_raises_weather_fetch_error_on_open_meteo_failure():
    """Open-Meteo 5xx with empty cache → raises WeatherFetchError, no rows persisted."""
    import httpx as _httpx

    response = MagicMock()
    error = _httpx.HTTPStatusError(
        "503", request=MagicMock(), response=MagicMock(status_code=503, text="server down")
    )
    response.raise_for_status = MagicMock(side_effect=error)
    client_instance = AsyncMock()
    client_instance.get = AsyncMock(return_value=response)
    client_cm = MagicMock()
    client_cm.__aenter__ = AsyncMock(return_value=client_instance)
    client_cm.__aexit__ = AsyncMock(return_value=None)

    persist_mock = AsyncMock(return_value=None)

    from app.services.weather_service import WeatherFetchError

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=client_cm), patch(
        "app.services.supabase_service.supabase_service.get_cached_hourly_weather",
        new=AsyncMock(return_value=[]),
        create=True,
    ), patch(
        "app.services.supabase_service.supabase_service.persist_hourly_weather",
        new=persist_mock,
        create=True,
    ):
        ws = WeatherService()
        try:
            asyncio.run(
                ws.fetch_hourly_temperature(
                    latitude=33.89,
                    longitude=-5.55,
                    start_date="2025-11-01",
                    end_date="2025-11-01",
                )
            )
        except WeatherFetchError:
            pass
        else:
            assert False, "Expected WeatherFetchError to be raised"

    assert not persist_mock.called, "no cache write on failure"


def test_gap_fill_fetches_only_missing_dates():
    """Half-cached range → API called only for missing date sub-range."""
    # Cached: day 1 fully covered (24 rows). Missing: day 2.
    cached_rows = [
        {"recorded_at": f"2025-11-01T{h:02d}:00:00+00:00", "temperature_2m": 5.0 + h}
        for h in range(24)
    ]
    # API mock returns 24 rows for day 2
    api_response = {
        "hourly": {
            "time": [f"2025-11-02T{h:02d}:00" for h in range(24)],
            "temperature_2m": [6.0 + h for h in range(24)],
        }
    }
    client_cm, client_instance = _make_async_get_mock(api_response)

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=client_cm), patch(
        "app.services.supabase_service.supabase_service.get_cached_hourly_weather",
        new=AsyncMock(return_value=cached_rows),
        create=True,
    ), patch(
        "app.services.supabase_service.supabase_service.persist_hourly_weather",
        new=AsyncMock(return_value=None),
        create=True,
    ):
        ws = WeatherService()
        rows = asyncio.run(
            ws.fetch_hourly_temperature(
                latitude=33.89,
                longitude=-5.55,
                start_date="2025-11-01",
                end_date="2025-11-02",
            )
        )

    assert client_instance.get.called, "API should be called for missing day"
    params = client_instance.get.call_args.kwargs.get("params") or {}
    # Must have requested only the missing day
    assert params.get("start_date") == "2025-11-02"
    assert params.get("end_date") == "2025-11-02"
    # Final result merges cached + fetched (24 + 24 = 48)
    assert len(rows) == 48


def test_cache_hit_skips_api_call():
    """When all hours in range are cached, Open-Meteo is NOT called."""
    cached_rows = [
        {"recorded_at": f"2025-11-01T{h:02d}:00:00+00:00", "temperature_2m": 5.0 + h}
        for h in range(24)
    ]
    client_cm, client_instance = _make_async_get_mock(_mock_open_meteo_hourly_response(0))

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=client_cm), patch(
        "app.services.supabase_service.supabase_service.get_cached_hourly_weather",
        new=AsyncMock(return_value=cached_rows),
        create=True,
    ), patch(
        "app.services.supabase_service.supabase_service.persist_hourly_weather",
        new=AsyncMock(return_value=None),
        create=True,
    ):
        ws = WeatherService()
        rows = asyncio.run(
            ws.fetch_hourly_temperature(
                latitude=33.89,
                longitude=-5.55,
                start_date="2025-11-01",
                end_date="2025-11-01",
            )
        )

    assert not client_instance.get.called, "httpx must NOT be called on full cache hit"
    assert len(rows) == 24


def test_cache_miss_persists_fetched_rows():
    """When cache is empty, fetched rows are persisted via supabase_service.persist_hourly_weather."""
    client_cm, _ = _make_async_get_mock(_mock_open_meteo_hourly_response(3))
    persist_mock = AsyncMock(return_value=None)

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=client_cm), patch(
        "app.services.supabase_service.supabase_service.get_cached_hourly_weather",
        new=AsyncMock(return_value=[]),
        create=True,
    ), patch(
        "app.services.supabase_service.supabase_service.persist_hourly_weather",
        new=persist_mock,
        create=True,
    ):
        ws = WeatherService()
        rows = asyncio.run(
            ws.fetch_hourly_temperature(
                latitude=33.89,
                longitude=-5.55,
                start_date="2025-11-01",
                end_date="2025-11-01",
            )
        )

    assert persist_mock.called, "persist_hourly_weather should be called on cache miss"
    persisted_arg = persist_mock.call_args.args[0] if persist_mock.call_args.args else None
    assert persisted_arg is not None and len(persisted_arg) == 3
    assert len(rows) == 3


def test_quantizes_lat_lon_to_2_decimals():
    """Coordinates must be rounded to 2 decimals (matches weather_daily_data 1km grid)."""
    client_cm, client_instance = _make_async_get_mock(_mock_open_meteo_hourly_response(1))

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=client_cm), patch(
        "app.services.supabase_service.supabase_service.get_cached_hourly_weather",
        new=AsyncMock(return_value=[]),
        create=True,
    ), patch(
        "app.services.supabase_service.supabase_service.persist_hourly_weather",
        new=AsyncMock(return_value=None),
        create=True,
    ):
        ws = WeatherService()
        asyncio.run(
            ws.fetch_hourly_temperature(
                latitude=33.89351234,
                longitude=-5.547287,
                start_date="2025-11-01",
                end_date="2025-11-01",
            )
        )

    params = client_instance.get.call_args.kwargs.get("params") or {}
    assert params.get("latitude") == 33.89, f"expected 33.89, got {params.get('latitude')}"
    assert params.get("longitude") == -5.55, f"expected -5.55, got {params.get('longitude')}"


def test_fetches_hourly_temperature_2m_from_archive_api():
    """fetch_hourly_temperature() issues GET to archive-api with hourly=temperature_2m."""
    client_cm, client_instance = _make_async_get_mock(_mock_open_meteo_hourly_response(2))

    with patch("app.services.weather_service.httpx.AsyncClient", return_value=client_cm), patch(
        "app.services.supabase_service.supabase_service.get_cached_hourly_weather",
        new=AsyncMock(return_value=[]),
        create=True,
    ), patch(
        "app.services.supabase_service.supabase_service.persist_hourly_weather",
        new=AsyncMock(return_value=None),
        create=True,
    ):
        ws = WeatherService()
        rows = asyncio.run(
            ws.fetch_hourly_temperature(
                latitude=33.89,
                longitude=-5.55,
                start_date="2025-11-01",
                end_date="2025-11-01",
            )
        )

    assert client_instance.get.called, "httpx.AsyncClient.get should be called"
    call_args = client_instance.get.call_args
    url = call_args.args[0] if call_args.args else call_args.kwargs.get("url")
    params = call_args.kwargs.get("params") or {}
    assert "archive-api.open-meteo.com" in url
    assert params.get("hourly") == "temperature_2m"
    assert len(rows) == 2
