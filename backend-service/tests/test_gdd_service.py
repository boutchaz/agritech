from importlib import import_module


gdd_module = import_module("app.services.calibration.gdd_service")

compute_daily_gdd = getattr(gdd_module, "compute_daily_gdd")
estimate_chill_hours = getattr(gdd_module, "estimate_chill_hours")
precompute_gdd_rows = getattr(gdd_module, "precompute_gdd_rows")
compute_olive_gdd_two_phase = getattr(gdd_module, "compute_olive_gdd_two_phase")


# ---------------------------------------------------------------------------
# compute_daily_gdd
# ---------------------------------------------------------------------------


def test_gdd_formula_positive_result() -> None:
    # Tbase=7.5 for olivier: (30+20)/2 - 7.5 = 17.5
    assert compute_daily_gdd(temp_max=30.0, temp_min=20.0, tbase=7.5) == 17.5


def test_gdd_formula_floor_at_zero() -> None:
    # (8+2)/2 = 5.0, 5.0 - 7.5 = -2.5 → clamped to 0
    assert compute_daily_gdd(temp_max=8.0, temp_min=2.0, tbase=7.5) == 0.0


def test_gdd_formula_tupper_cap() -> None:
    # Without cap: (40+30)/2 = 35.0, 35 - 7.5 = 27.5
    assert compute_daily_gdd(temp_max=40.0, temp_min=30.0, tbase=7.5) == 27.5
    # With cap=30: min(35, 30) = 30, 30 - 7.5 = 22.5
    assert compute_daily_gdd(temp_max=40.0, temp_min=30.0, tbase=7.5, tupper=30.0) == 22.5


def test_gdd_formula_tupper_no_effect_when_below() -> None:
    # (20+10)/2 = 15.0 < 30.0 cap → no effect. 15 - 7.5 = 7.5
    assert compute_daily_gdd(temp_max=20.0, temp_min=10.0, tbase=7.5, tupper=30.0) == 7.5


# ---------------------------------------------------------------------------
# estimate_chill_hours
# ---------------------------------------------------------------------------


def test_chill_hours_cold_night() -> None:
    # temp_min=2.0, temp_max=10.0 → sinusoidal model: 15 hours below 7.2°C
    ch = estimate_chill_hours(temp_max=10.0, temp_min=2.0)
    assert ch == 15.0


def test_chill_hours_warm_night_zero() -> None:
    # temp_min=8.0 >= 7.2 → 0
    assert estimate_chill_hours(temp_max=15.0, temp_min=8.0) == 0.0


def test_chill_hours_freezing_below_zero() -> None:
    # temp_max <= 0 → 0 (too cold for effective chill)
    assert estimate_chill_hours(temp_max=-1.0, temp_min=-5.0) == 0.0


# ---------------------------------------------------------------------------
# precompute_gdd_rows — non-olive (simple formula with Tupper)
# ---------------------------------------------------------------------------


def test_batch_agrumes_applies_tupper() -> None:
    rows = [
        {
            "date": "2025-06-01",
            "temperature_max": 42.0,
            "temperature_min": 28.0,
            "gdd_agrumes": None,
        },
    ]
    updated_rows, count = precompute_gdd_rows(rows, "agrumes")
    assert count == 1
    # tupper=36 for agrumes: min((42+28)/2, 36) = min(35, 36) = 35. GDD = 35 - 13 = 22
    assert updated_rows[0]["gdd_agrumes"] == 22.0


def test_batch_skips_existing_values_non_olive() -> None:
    rows = [
        {
            "date": "2025-01-01",
            "temperature_max": 30.0,
            "temperature_min": 20.0,
            "gdd_agrumes": 12.0,
        },
    ]
    updated_rows, count = precompute_gdd_rows(rows, "agrumes")
    assert count == 0
    assert updated_rows[0]["gdd_agrumes"] == 12.0


# ---------------------------------------------------------------------------
# Two-phase De Melo-Abreu model for olive
# ---------------------------------------------------------------------------


def _make_weather_row(date_str: str, tmax: float, tmin: float) -> dict:
    return {
        "date": date_str,
        "temperature_max": tmax,
        "temperature_min": tmin,
        "gdd_olivier": None,
    }


def test_olive_phase1_no_gdd_before_chill_met() -> None:
    """GDD should be 0 during Phase 1 (chill accumulation not yet met)."""
    rows = [
        # November — cold but only a few chill hours
        _make_weather_row("2024-11-15", 12.0, 5.0),  # ch = (7.2-5)*1.5 = 3.3
        _make_weather_row("2024-11-16", 12.0, 5.0),
        # December — warm enough for GDD but chill not satisfied yet
        _make_weather_row("2024-12-01", 20.0, 10.0),
    ]
    result = compute_olive_gdd_two_phase(rows, chill_threshold=500, nirv_series=[])

    # Chill nowhere near 500, so all GDD should be 0
    for r in result:
        assert r["gdd_olivier"] == 0.0
    # But chill_hours should be computed
    assert result[0]["chill_hours"] > 0


def test_olive_phase2_gdd_after_chill_satisfied() -> None:
    """Once chill threshold is met, GDD should accumulate."""
    rows = []
    # Build enough cold days to satisfy threshold of 10 chill hours
    for day in range(1, 8):
        # temp_min=0 → ch = (7.2-0)*1.5 = 10.8 per day → easily passes threshold 10
        rows.append(_make_weather_row(f"2024-12-{day:02d}", 8.0, 0.0))

    # Then warm spring day
    rows.append(_make_weather_row("2025-03-01", 22.0, 12.0))

    result = compute_olive_gdd_two_phase(rows, chill_threshold=10, nirv_series=[])

    # Last row should have GDD > 0: (22+12)/2=17, min(17,30)=17, 17-7.5=9.5
    assert result[-1]["gdd_olivier"] == 9.5


def test_olive_nirv_gate_blocks_gdd() -> None:
    """When NIRv is below 20% rise from baseline, GDD should be 0."""
    # Winter rows for baseline calculation (Dec-Jan)
    rows = [
        _make_weather_row("2024-12-01", 8.0, 0.0),  # cold → chill
        _make_weather_row("2024-12-15", 8.0, 0.0),
        _make_weather_row("2025-01-10", 8.0, 0.0),
    ]
    # NIRv baseline from Dec-Jan: mean of 0.10
    nirv_series = [
        {"date": "2024-12-01", "value": 0.10},
        {"date": "2024-12-15", "value": 0.10},
        {"date": "2025-01-10", "value": 0.10},
    ]

    # Spring row — warm enough for GDD, but NIRv only 0.11 (< 0.12 = 0.10 * 1.20)
    rows.append(_make_weather_row("2025-03-15", 22.0, 12.0))
    nirv_series.append({"date": "2025-03-15", "value": 0.11})

    result = compute_olive_gdd_two_phase(rows, chill_threshold=10, nirv_series=nirv_series)

    # GDD blocked by NIRv gate
    assert result[-1]["gdd_olivier"] == 0.0


def test_olive_nirv_gate_passes_gdd() -> None:
    """When NIRv rises >= 20% above baseline, GDD should accumulate."""
    rows = [
        _make_weather_row("2024-12-01", 8.0, 0.0),
        _make_weather_row("2024-12-15", 8.0, 0.0),
        _make_weather_row("2025-01-10", 8.0, 0.0),
    ]
    nirv_series = [
        {"date": "2024-12-01", "value": 0.10},
        {"date": "2024-12-15", "value": 0.10},
        {"date": "2025-01-10", "value": 0.10},
    ]

    # Spring row — NIRv 0.13 >= 0.12 (20% rise from 0.10 baseline)
    rows.append(_make_weather_row("2025-03-15", 22.0, 12.0))
    nirv_series.append({"date": "2025-03-15", "value": 0.13})

    result = compute_olive_gdd_two_phase(rows, chill_threshold=10, nirv_series=nirv_series)

    # GDD should pass: (22+12)/2=17, min(17,30)=17, 17-7.5=9.5
    assert result[-1]["gdd_olivier"] == 9.5


def test_olive_nirv_fallback_when_no_data() -> None:
    """When no NIRv data at all, fall back to temperature-only condition."""
    rows = [
        _make_weather_row("2024-12-01", 8.0, 0.0),
        _make_weather_row("2024-12-15", 8.0, 0.0),
        _make_weather_row("2025-03-15", 22.0, 12.0),
    ]

    result = compute_olive_gdd_two_phase(rows, chill_threshold=10, nirv_series=[])

    # No NIRv → fallback to temp-only. GDD should accumulate.
    assert result[-1]["gdd_olivier"] == 9.5


def test_olive_season_reset_november() -> None:
    """Chill accumulator resets in November, requiring new chill cycle."""
    rows = []
    # Year 1: enough chill in Dec 2024
    for day in range(1, 5):
        rows.append(_make_weather_row(f"2024-12-{day:02d}", 8.0, 0.0))

    # Spring 2025: GDD should work
    rows.append(_make_weather_row("2025-03-01", 22.0, 12.0))

    # November 2025: season reset (day 1-7 triggers reset)
    rows.append(_make_weather_row("2025-11-01", 15.0, 8.0))

    # December 2025: not enough chill yet (only 1 day)
    rows.append(_make_weather_row("2025-12-01", 8.0, 0.0))

    # Spring 2026: warm day but chill not re-satisfied
    rows.append(_make_weather_row("2026-03-01", 22.0, 12.0))

    result = compute_olive_gdd_two_phase(rows, chill_threshold=30, nirv_series=[])

    # Spring 2025 (index 4): chill was satisfied → GDD > 0
    assert result[4]["gdd_olivier"] == 9.5
    # Spring 2026 (index 7): chill reset in Nov, only ~10.8h accumulated → not enough → GDD = 0
    assert result[7]["gdd_olivier"] == 0.0


def test_precompute_gdd_rows_olive_uses_two_phase() -> None:
    """precompute_gdd_rows delegates to two-phase model for olivier."""
    rows = [
        _make_weather_row("2024-12-01", 8.0, 0.0),
        _make_weather_row("2024-12-15", 8.0, 0.0),
        _make_weather_row("2025-03-15", 22.0, 12.0),
    ]
    result, count = precompute_gdd_rows(
        rows,
        "olivier",
        chill_threshold=10,
        nirv_series=[],
    )
    assert count == 3
    # Two-phase model should produce GDD on the spring day
    assert result[-1]["gdd_olivier"] == 9.5


def _olive_bbch_ref_tight_calendar() -> dict:
    """Minimal stades_bbch: dormancy Dec–Jan, February only for active GDD months."""
    return {
        "stades_bbch": [
            {
                "code": "00",
                "nom": "Dormance",
                "mois": ["Dec", "Jan"],
                "gdd_cumul": [0, 30],
            },
            {
                "code": "01",
                "nom": "Fev",
                "mois": ["Feb"],
                "gdd_cumul": [30, 80],
            },
        ],
    }


def test_olive_bbch_allowed_months_block_march() -> None:
    """With stades_bbch, GDD accrues only on months listed in any stage."""
    rows = []
    for day in range(1, 8):
        rows.append(_make_weather_row(f"2024-12-{day:02d}", 8.0, 0.0))
    rows.append(_make_weather_row("2025-03-15", 22.0, 12.0))

    result = compute_olive_gdd_two_phase(
        rows,
        chill_threshold=10,
        nirv_series=[],
        reference_data=_olive_bbch_ref_tight_calendar(),
    )
    assert result[-1]["gdd_olivier"] == 0.0


def test_olive_bbch_month_max_gdd_caps_seasonal_accrual() -> None:
    """Per-month BBCH max(gdd_cumul hi) caps season cumulative for that month."""
    ref = {
        "stades_bbch": [
            {
                "code": "00",
                "nom": "Dormance",
                "mois": ["Dec", "Jan"],
                "gdd_cumul": [0, 30],
            },
            {
                "code": "09",
                "nom": "Mar",
                "mois": ["Mar"],
                "gdd_cumul": [0, 15],
            },
        ],
    }
    rows = []
    for day in range(1, 8):
        rows.append(_make_weather_row(f"2024-12-{day:02d}", 8.0, 0.0))
    rows.append(_make_weather_row("2025-03-10", 22.0, 12.0))
    rows.append(_make_weather_row("2025-03-20", 22.0, 12.0))

    result = compute_olive_gdd_two_phase(
        rows,
        chill_threshold=10,
        nirv_series=[],
        reference_data=ref,
    )
    assert result[-2]["gdd_olivier"] == 9.5
    assert result[-1]["gdd_olivier"] == 0.0


def test_olive_bbch_baseline_months_from_phase_00_only() -> None:
    """NIRv baseline uses stage 00 mois, not hardcoded Dec–Jan when 00 differs."""
    ref = {
        "stades_bbch": [
            {
                "code": "00",
                "nom": "Dormance",
                "mois": ["Nov"],
                "gdd_cumul": [0, 10],
            },
            {
                "code": "01",
                "nom": "Winter2",
                "mois": ["Dec", "Jan", "Feb", "Mar"],
                "gdd_cumul": [10, 200],
            },
        ],
    }
    rows = [
        _make_weather_row("2024-11-15", 8.0, 0.0),
        _make_weather_row("2024-11-20", 8.0, 0.0),
    ]
    nirv_series = [
        {"date": "2024-11-15", "value": 0.10},
        {"date": "2024-11-20", "value": 0.10},
    ]
    for day in range(1, 8):
        rows.append(_make_weather_row(f"2024-12-{day:02d}", 8.0, 0.0))
    rows.append(_make_weather_row("2025-03-15", 22.0, 12.0))
    nirv_series.append({"date": "2025-03-15", "value": 0.13})

    result = compute_olive_gdd_two_phase(
        rows,
        chill_threshold=10,
        nirv_series=nirv_series,
        reference_data=ref,
    )
    assert result[-1]["gdd_olivier"] == 9.5
