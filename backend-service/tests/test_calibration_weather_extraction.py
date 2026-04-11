from datetime import date, timedelta
from importlib import import_module


step2_module = import_module("app.services.calibration.pipeline.s2_weather_extraction")
extract_weather_history = getattr(step2_module, "extract_weather_history")


def _build_weather(days: int) -> list[dict[str, object]]:
    start = date(2024, 1, 1)
    rows: list[dict[str, object]] = []

    for idx in range(days):
        current = start + timedelta(days=idx)
        row: dict[str, object] = {
            "date": current.isoformat(),
            "temp_min": 9.0,
            "temp_max": 24.0,
            "precip": 6.0,
            "et0": 2.0,
            "wind_speed_max": 20.0,
        }

        if idx in {50, 51, 52}:
            row["temp_max"] = 40.0
        if idx in {90, 91, 92}:
            row["wind_speed_max"] = 65.0
        if 120 <= idx <= 155:
            row["precip"] = 1.0
        if current.month == 1:
            row["temp_min"] = 2.0

        rows.append(row)

    return rows


def test_step2_weather_computes_daily_and_monthly_aggregates() -> None:
    weather = _build_weather(days=120)
    output = extract_weather_history(
        weather_data=weather,
        crop_type="olivier",
        frost_threshold=1.0,
        heat_threshold=38.0,
    )

    assert len(output.daily_weather) == 120
    assert len(output.monthly_aggregates) >= 3
    # GDD is no longer computed in step2 — orchestrator wires gdd_service
    assert output.cumulative_gdd == {}
    assert output.monthly_aggregates[0].gdd_total == 0.0


def test_step2_detects_extreme_events() -> None:
    weather = _build_weather(days=220)
    output = extract_weather_history(
        weather_data=weather,
        crop_type="olivier",
        frost_threshold=1.0,
        heat_threshold=38.0,
    )

    event_types = {event.event_type for event in output.extreme_events}
    assert "heatwave" in event_types
    assert "high_wind" in event_types
    assert "prolonged_drought" in event_types


def test_step2_computes_chill_hours_in_winter() -> None:
    weather = _build_weather(days=60)
    output = extract_weather_history(
        weather_data=weather,
        crop_type="olivier",
        frost_threshold=1.0,
    )

    assert output.chill_hours > 0


def test_step2_reads_heat_and_wind_thresholds_from_referential() -> None:
    weather = _build_weather(days=220)
    reference_data = {
        "alertes": [
            {"code": "X1", "seuil": "Tmax > 40°C (3j) + HR < 30%"},
            {"code": "X2", "seuil": "T > 38 + HR < 25% + vent > 30 km/h"},
        ]
    }

    output = extract_weather_history(
        weather_data=weather,
        crop_type="agrumes",
        reference_data=reference_data,
    )

    event_types = {event.event_type for event in output.extreme_events}
    assert "high_wind" in event_types
    assert "heatwave" not in event_types


def test_step2_reads_frost_threshold_from_referential_alerts() -> None:
    weather = _build_weather(days=100)
    reference_data = {
        "alertes": [
            {"code": "GEL", "seuil": "Tmin prévue < 0°C"},
        ]
    }

    output = extract_weather_history(
        weather_data=weather,
        crop_type="agrumes",
        reference_data=reference_data,
    )

    assert all(event.event_type != "late_frost" for event in output.extreme_events)


def test_step2_prefers_canonical_seuils_meteo_over_alert_parsing() -> None:
    weather = _build_weather(days=220)
    reference_data = {
        "seuils_meteo": {
            "gel": {"threshold_c": 0.0},
            "canicule": {"tmax_c": 41.0, "consecutive_days": 3},
            "vent_chaud": {"temperature_c": 38.0, "wind_kmh": 30.0},
            "secheresse": {
                "rain_mm_max_per_day": 5.0,
                "dry_season_days": 60,
                "transition_days": 30,
                "rainy_season_days": 20
            }
        },
        "alertes": [
            {"code": "X1", "seuil": "Tmax > 40°C (3j) + HR < 30%"},
            {"code": "X2", "seuil": "T > 38 + HR < 25% + vent > 30 km/h"}
        ]
    }

    output = extract_weather_history(
        weather_data=weather,
        crop_type="agrumes",
        reference_data=reference_data,
    )

    event_types = {event.event_type for event in output.extreme_events}
    assert "high_wind" in event_types
    assert "heatwave" not in event_types
