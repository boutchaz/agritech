from importlib import import_module


gdd_module = import_module("app.services.calibration.gdd_service")

compute_daily_gdd = getattr(gdd_module, "compute_daily_gdd")
precompute_gdd_rows = getattr(gdd_module, "precompute_gdd_rows")


def test_gdd_formula_positive_result() -> None:
    assert compute_daily_gdd(temp_max=30.0, temp_min=20.0, tbase=10.0) == 15.0


def test_gdd_formula_floor_at_zero() -> None:
    assert compute_daily_gdd(temp_max=8.0, temp_min=2.0, tbase=10.0) == 0.0


def test_batch_update_skips_existing_values() -> None:
    rows = [
        {
            "date": "2025-01-01",
            "temperature_max": 30.0,
            "temperature_min": 20.0,
            "gdd_olivier": None,
        },
        {
            "date": "2025-01-02",
            "temperature_max": 28.0,
            "temperature_min": 18.0,
            "gdd_olivier": 13.0,
        },
    ]

    updated_rows, updated_count = precompute_gdd_rows(rows, "olivier")

    assert updated_count == 1
    assert updated_rows[0]["gdd_olivier"] == 15.0
    assert updated_rows[1]["gdd_olivier"] == 13.0
    assert "chill_hours" in updated_rows[0]
