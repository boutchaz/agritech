"""Tests for /api/weather/hour-counter and /api/weather/phenological-counters endpoints."""
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def _override_auth():
    from app.middleware.auth import get_current_user_or_service
    app.dependency_overrides[get_current_user_or_service] = lambda: {"id": "test", "service": True}
    yield
    app.dependency_overrides.clear()


import pytest


@pytest.fixture(autouse=True)
def patch_auth():
    yield from _override_auth()


def test_hour_counter_endpoint_returns_count_shape():
    """GET /api/weather/hour-counter returns {count, fetched_hours, from_cache}."""
    rows = [
        {"recorded_at": f"2025-11-01T{h:02d}:00:00+00:00", "temperature_2m": 5.0}
        for h in range(24)
    ]
    with patch(
        "app.api.weather.WeatherService.fetch_hourly_temperature",
        new=AsyncMock(return_value=rows),
    ):
        response = client.get(
            "/api/weather/hour-counter",
            params={
                "latitude": 33.89,
                "longitude": -5.55,
                "start_date": "2025-11-01",
                "end_date": "2025-11-01",
                "threshold": 7.2,
                "compare": "below",
            },
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "count" in body
    assert "fetched_hours" in body
    assert "from_cache" in body
    assert body["count"] == 24  # all 24 rows are 5.0 < 7.2


def test_phenological_counters_endpoint_returns_stages_shape():
    """GET /api/weather/phenological-counters returns crop, year, stages list."""
    fake_response = {
        "crop_type": "olivier",
        "year": 2025,
        "computed_at": "2025-11-01T00:00:00+00:00",
        "stages": [
            {
                "key": "dormancy",
                "name_fr": "Dormance",
                "months": [11, 12, 1, 2],
                "counters": [
                    {"key": "chill_hours", "label_fr": "Heures de froid", "value": 409,
                     "threshold": 7.2, "compare": "below", "unit": "h"},
                ],
            }
        ],
    }
    with patch(
        "app.api.weather.compute_phenological_counters",
        new=AsyncMock(return_value=fake_response),
    ):
        response = client.get(
            "/api/weather/phenological-counters",
            params={"latitude": 33.89, "longitude": -5.55, "year": 2025, "crop_type": "olivier"},
        )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["crop_type"] == "olivier"
    assert body["year"] == 2025
    assert isinstance(body["stages"], list)
    assert len(body["stages"]) == 1
    assert body["stages"][0]["counters"][0]["value"] == 409


def test_endpoint_returns_502_on_open_meteo_failure():
    """Open-Meteo failure mapped to HTTP 502 with error body."""
    from app.services.weather_service import WeatherFetchError

    with patch(
        "app.api.weather.compute_phenological_counters",
        new=AsyncMock(side_effect=WeatherFetchError("upstream down")),
    ):
        response = client.get(
            "/api/weather/phenological-counters",
            params={"latitude": 33.89, "longitude": -5.55, "year": 2025, "crop_type": "olivier"},
        )
    assert response.status_code == 502, response.text
    body = response.json()
    assert "error" in body or "detail" in body


def test_unsupported_crop_returns_400():
    from app.services.weather.phenological_counters import UnsupportedCropError

    with patch(
        "app.api.weather.compute_phenological_counters",
        new=AsyncMock(side_effect=UnsupportedCropError("crop_type 'mango' has no referentiel")),
    ):
        response = client.get(
            "/api/weather/phenological-counters",
            params={"latitude": 33.89, "longitude": -5.55, "year": 2025, "crop_type": "mango"},
        )
    assert response.status_code == 400, response.text
