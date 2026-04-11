from datetime import date
from importlib import import_module
from unittest.mock import patch
import math

import numpy as np

types_module = import_module("app.services.calibration.types")
step4_module = import_module("app.services.calibration.pipeline.s4_phenology_detection")

Step1Output = getattr(types_module, "Step1Output")
Step2Output = getattr(types_module, "Step2Output")
detect_phenology = getattr(step4_module, "detect_phenology")

# Chronologie phénologique — helpers (full branch coverage for step4)
_safe_smooth = getattr(step4_module, "_safe_smooth")
_day_of_year_to_date = getattr(step4_module, "_day_of_year_to_date")
_values_at_indices = getattr(step4_module, "_values_at_indices")
_nearest_cumulative_gdd = getattr(step4_module, "_nearest_cumulative_gdd")
_temporal_order_valid = getattr(step4_module, "_temporal_order_valid")
_fallback_stages = getattr(step4_module, "_fallback_stages")
_find_constrained_stages_for_year = getattr(step4_module, "_find_constrained_stages_for_year")
_find_dormancy_exit = getattr(step4_module, "_find_dormancy_exit")
_find_plateau_start = getattr(step4_module, "_find_plateau_start")
_find_decline_start = getattr(step4_module, "_find_decline_start")
_find_dormancy_entry = getattr(step4_module, "_find_dormancy_entry")
DEFAULT_PERIODS = getattr(step4_module, "DEFAULT_PERIODS")


def _build_step1_for_three_years() -> object:
    index_points = {"NIRv": [], "NDVI": []}
    for year in [2023, 2024, 2025]:
        for month in range(1, 13):
            val = 0.45 + 0.18 * math.sin((2 * math.pi * (month - 1)) / 12)
            point = {
                "date": date(year, month, 15).isoformat(),
                "value": round(val, 4),
                "outlier": False,
                "interpolated": False,
            }
            index_points["NIRv"].append(point)
            index_points["NDVI"].append(point)

    return Step1Output.model_validate(
        {
            "index_time_series": index_points,
            "cloud_coverage_mean": 10,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {"NIRv": [], "NDVI": []},
        }
    )


def _build_step2_weather() -> object:
    monthly = []
    cumulative = {}
    running = 0.0
    for year in [2023, 2024, 2025]:
        for month in range(1, 13):
            key = f"{year}-{month:02d}"
            gdd_total = 80 + month * 10
            running += gdd_total
            cumulative[key] = running
            monthly.append(
                {
                    "month": key,
                    "precipitation_total": 20.0,
                    "gdd_total": gdd_total,
                }
            )

    return Step2Output.model_validate(
        {
            "daily_weather": [
                {
                    "date": "2023-01-15",
                    "temp_min": 5,
                    "temp_max": 15,
                    "precip": 2,
                    "et0": 1,
                }
            ],
            "monthly_aggregates": monthly,
            "cumulative_gdd": cumulative,
            "chill_hours": 120,
            "extreme_events": [],
        }
    )


def test_step4_detects_main_phenology_dates() -> None:
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()

    output = detect_phenology(step1, step2)

    assert output.mean_dates.peak is not None
    assert output.mean_dates.dormancy_exit is not None
    assert output.mean_dates.decline_start is not None
    assert output.yearly_stages, "per-year stages should be exposed for UI year selector"
    assert all(
        len(str(y)) == 4 and y.isdigit() for y in output.yearly_stages.keys()
    )


def test_step4_variability_is_reasonable_for_stable_curve() -> None:
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()
    output = detect_phenology(step1, step2)

    assert output.inter_annual_variability_days["peak"] < 30


def test_step4_produces_gdd_correlation_for_each_stage() -> None:
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()
    output = detect_phenology(step1, step2)

    assert set(output.gdd_correlation.keys()) == {
        "dormancy_exit",
        "peak",
        "plateau_start",
        "decline_start",
        "dormancy_entry",
    }


def test_step4_uses_referential_cycle_when_stades_bbch_present() -> None:
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
        "systemes": {"intensif": {"indice_cle": "NDVI"}},
    }
    output = detect_phenology(
        step1,
        step2,
        reference_data=reference_data,
        crop_type="olivier",
        planting_system="intensif",
    )
    assert output.referential_cycle_used is True
    assert output.mean_dates.peak is not None


def test_step4_resolves_index_from_referential() -> None:
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
        "systemes": {"traditionnel": {"indice_cle": "NDVI"}},
    }
    output = detect_phenology(
        step1,
        step2,
        reference_data=reference_data,
        crop_type="olivier",
        planting_system="traditionnel",
    )
    assert output.referential_cycle_used is True
    assert output.mean_dates.dormancy_exit is not None


def _build_moroccan_olive_bimodal_curve() -> object:
    """Realistic Moroccan olive NIRv curve with summer stress dip.

    In Morocco, olive NDVI/NIRv peaks in spring (May), dips in summer
    (Aug) due to heat/water stress, then partially recovers in autumn
    before entering winter dormancy.  The summer minimum can be LOWER
    than the winter dormancy baseline.
    """
    index_points = {"NIRv": [], "NDVI": []}
    monthly_values = {
        1: 0.25,
        2: 0.28,
        3: 0.35,
        4: 0.48,
        5: 0.55,
        6: 0.52,
        7: 0.42,
        8: 0.33,
        9: 0.38,
        10: 0.34,
        11: 0.28,
        12: 0.24,
    }
    for year in [2023, 2024]:
        for month in range(1, 13):
            val = monthly_values[month]
            point = {
                "date": date(year, month, 15).isoformat(),
                "value": round(val, 4),
                "outlier": False,
                "interpolated": False,
            }
            index_points["NIRv"].append(point)
            index_points["NDVI"].append(point)

    return Step1Output.model_validate(
        {
            "index_time_series": index_points,
            "cloud_coverage_mean": 10,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {"NIRv": [], "NDVI": []},
        }
    )


def test_step4_bimodal_curve_dormancy_exit_before_peak() -> None:
    step1 = _build_moroccan_olive_bimodal_curve()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "09", "nom": "Feuilles emergentes", "mois": ["Feb", "Mar"]},
            {"code": "60", "nom": "Floraison", "mois": ["May"]},
            {"code": "79", "nom": "Fruit taille finale", "mois": ["Aug", "Sep"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
    }
    output = detect_phenology(
        step1, step2, reference_data=reference_data, crop_type="olivier"
    )

    assert output.mean_dates.dormancy_exit < output.mean_dates.peak
    assert output.mean_dates.plateau_start <= output.mean_dates.peak
    assert output.mean_dates.peak < output.mean_dates.decline_start
    assert output.mean_dates.decline_start < output.mean_dates.dormancy_entry


def test_step4_bimodal_curve_dormancy_exit_in_early_spring() -> None:
    step1 = _build_moroccan_olive_bimodal_curve()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
    }
    output = detect_phenology(
        step1, step2, reference_data=reference_data, crop_type="olivier"
    )

    assert output.mean_dates.dormancy_exit.month in (2, 3, 4)


def test_step4_bimodal_curve_peak_in_spring() -> None:
    step1 = _build_moroccan_olive_bimodal_curve()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
    }
    output = detect_phenology(
        step1, step2, reference_data=reference_data, crop_type="olivier"
    )

    assert output.mean_dates.peak.month in (4, 5, 6)


def test_step4_bimodal_curve_dormancy_entry_in_autumn() -> None:
    step1 = _build_moroccan_olive_bimodal_curve()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
    }
    output = detect_phenology(
        step1, step2, reference_data=reference_data, crop_type="olivier"
    )

    assert output.mean_dates.dormancy_entry.month in (10, 11, 12)


def test_step4_bimodal_curve_plateau_before_peak() -> None:
    step1 = _build_moroccan_olive_bimodal_curve()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
    }
    output = detect_phenology(
        step1, step2, reference_data=reference_data, crop_type="olivier"
    )

    assert output.mean_dates.plateau_start <= output.mean_dates.peak


def test_step4_sparse_data_skips_year() -> None:
    index_points = {"NIRv": []}
    for month in [1, 6, 12]:
        index_points["NIRv"].append(
            {
                "date": date(2024, month, 15).isoformat(),
                "value": 0.4,
                "outlier": False,
                "interpolated": False,
            }
        )

    step1 = Step1Output.model_validate(
        {
            "index_time_series": index_points,
            "cloud_coverage_mean": 10,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {"NIRv": []},
        }
    )
    step2 = _build_step2_weather()

    output = detect_phenology(step1, step2)
    assert output.status == "insufficient_data"
    assert output.mean_dates.dormancy_exit is None
    assert output.mean_dates.peak is None
    assert output.missing_stages == [
        "dormancy_exit",
        "peak",
        "plateau_start",
        "decline_start",
        "dormancy_entry",
    ]


# --- Unit tests: chronologie phénologique (step4 internals) ---


def test_safe_smooth_short_passthrough() -> None:
    raw = [0.1, 0.2, 0.3]
    assert _safe_smooth(raw) == raw


def test_safe_smooth_long_applies_moving_average() -> None:
    raw = [float(i) for i in range(10)]
    out = _safe_smooth(raw)
    assert len(out) == len(raw)
    assert out != raw
    assert all(isinstance(x, float) for x in out)


def test_day_of_year_to_date() -> None:
    assert _day_of_year_to_date(2023, 1) == date(2023, 1, 1)
    assert _day_of_year_to_date(2023, 32) == date(2023, 2, 1)
    assert _day_of_year_to_date(2020, 366) == date(2020, 12, 31)


def test_values_at_indices_skips_out_of_range() -> None:
    vals = [1.0, 2.0, 3.0]
    assert _values_at_indices(vals, [0, 1, 5, -1]) == [1.0, 2.0]


def test_nearest_cumulative_gdd_empty() -> None:
    assert _nearest_cumulative_gdd(date(2024, 6, 15), {}) == 0.0


def test_nearest_cumulative_gdd_exact_month() -> None:
    gdd = {"2024-06": 42.5}
    assert _nearest_cumulative_gdd(date(2024, 6, 10), gdd) == 42.5


def test_nearest_cumulative_gdd_nearest_prior_month() -> None:
    gdd = {"2024-01": 10.0, "2024-03": 30.0, "2024-05": 50.0}
    assert _nearest_cumulative_gdd(date(2024, 4, 1), gdd) == 30.0


def test_nearest_cumulative_gdd_all_keys_after_target() -> None:
    gdd = {"2025-06": 99.0}
    assert _nearest_cumulative_gdd(date(2024, 1, 1), gdd) == 99.0


def test_temporal_order_valid_true_and_false() -> None:
    d0 = date(2024, 1, 1)
    d1 = date(2024, 3, 1)
    d2 = date(2024, 5, 1)
    d3 = date(2024, 7, 1)
    d4 = date(2024, 9, 1)
    d5 = date(2024, 11, 1)
    good = {
        "dormancy_exit": d0,
        "plateau_start": d1,
        "peak": d2,
        "decline_start": d4,
        "dormancy_entry": d5,
    }
    assert _temporal_order_valid(good) is True
    bad = {**good, "decline_start": d2}
    assert _temporal_order_valid(bad) is False


@patch("app.services.calibration.archived.step4_legacy.date")
def test_fallback_stages_empty_dates_uses_today(mock_date) -> None:
    fixed = date(2019, 4, 1)
    mock_date.today.return_value = fixed
    out = _fallback_stages([], [])
    for k in (
        "dormancy_exit",
        "peak",
        "plateau_start",
        "decline_start",
        "dormancy_entry",
    ):
        assert out[k] == fixed


def test_fallback_stages_with_curve() -> None:
    dates = [date(2024, m, 15) for m in range(1, 13)]
    values = [0.2, 0.25, 0.3, 0.5, 0.9, 0.95, 0.96, 0.94, 0.5, 0.3, 0.22, 0.2]
    out = _fallback_stages(dates, values)
    assert out["peak"] == dates[int(np.argmax(values))]
    assert set(out) == {
        "dormancy_exit",
        "peak",
        "plateau_start",
        "decline_start",
        "dormancy_entry",
    }


def test_find_constrained_stages_fewer_than_five_points_uses_fallback() -> None:
    pts = [(date(2024, m, 15), float(m)) for m in range(1, 4)]
    out = _find_constrained_stages_for_year(pts, DEFAULT_PERIODS)
    fb = _fallback_stages([p[0] for p in pts], [p[1] for p in pts])
    assert out == fb


def test_find_constrained_stages_flat_values_uses_fallback() -> None:
    """Constant series with <5 points skips smoothing path and uses fallback."""
    pts = [(date(2024, m, 15), 0.5) for m in range(1, 5)]
    out = _find_constrained_stages_for_year(pts, DEFAULT_PERIODS)
    fb = _fallback_stages([p[0] for p in pts], [p[1] for p in pts])
    assert out == fb


def test_find_constrained_stages_no_dormancy_months_in_data_uses_global_min() -> None:
    """Only Jun–Aug months: dormancy set misses all points → min over full series."""
    periods = {
        "dormancy": {12, 1, 2},
        "growth": {6, 7, 8},
        "flowering": set(),
        "maturation": set(),
    }
    pts = [(date(2024, m, 15), 0.2 + 0.1 * m) for m in range(6, 13)]
    out = _find_constrained_stages_for_year(pts, periods)
    assert "peak" in out and "dormancy_exit" in out


def test_find_constrained_stages_only_dormancy_period_uses_argmax_all() -> None:
    """No active months → peak_idx from global argmax on the smoothed series (not raw Dec max)."""
    periods = {"dormancy": {1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}}
    vals = [float(m) for m in range(1, 12)] + [24.0]
    pts = [(date(2024, m, 15), vals[m - 1]) for m in range(1, 13)]
    dates = [p[0] for p in pts]
    smoothed = _safe_smooth([p[1] for p in pts])
    expected_peak = dates[int(np.argmax(smoothed))]
    out = _find_constrained_stages_for_year(pts, periods)
    assert out["peak"] == expected_peak


def test_find_constrained_stages_temporal_invalid_falls_back_to_fallback_stages() -> None:
    """When ordering checks fail, implementation returns _fallback_stages(dates, smoothed_values)."""
    vals = [0.3, 0.4, 0.5, 0.6, 0.7, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]
    pts = [(date(2024, m, 15), vals[m - 1]) for m in range(1, 13)]
    sorted_pts = sorted(pts, key=lambda item: item[0])
    dates_s = [p[0] for p in sorted_pts]
    smoothed = _safe_smooth([p[1] for p in sorted_pts])
    fn_globals = _find_constrained_stages_for_year.__globals__
    prev_tv = fn_globals["_temporal_order_valid"]
    fn_globals["_temporal_order_valid"] = lambda _stages: False
    try:
        fb = _fallback_stages(dates_s, smoothed)
        out = _find_constrained_stages_for_year(pts, DEFAULT_PERIODS)
    finally:
        fn_globals["_temporal_order_valid"] = prev_tv
    assert out == fb


def test_find_dormancy_exit_returns_zero_when_no_active_and_no_rise() -> None:
    dates = [date(2024, 6, 15 + i) for i in range(5)]
    values = [0.5, 0.45, 0.4, 0.35, 0.3]
    out = _find_dormancy_exit(
        dates,
        values,
        dormancy_months={12, 1},
        active_months={7, 8},
        threshold=0.9,
    )
    assert out == 0


def test_find_plateau_start_returns_zero_when_peak_at_start() -> None:
    values = [1.0, 0.9, 0.8, 0.7, 0.6]
    assert _find_plateau_start(values, peak_idx=0, threshold=0.95) == 0


def test_find_decline_start_returns_peak_when_no_post_peak_drop() -> None:
    values = [0.2, 0.4, 0.6, 1.0, 1.0, 1.0]
    assert _find_decline_start(values, peak_idx=3, threshold=0.95) == 3


def test_find_dormancy_entry_tail_empty_returns_last_index() -> None:
    values = [0.5, 0.6, 0.7]
    idx = _find_dormancy_entry(
        [date(2024, 1, 1)] * 3,
        values,
        decline_start_idx=len(values),
        dormancy_months={1},
        threshold=0.5,
        peak_idx=1,
    )
    assert idx == len(values) - 1


def test_detect_phenology_ndvi_fallback_when_nirv_missing() -> None:
    step1 = Step1Output.model_validate(
        {
            "index_time_series": {
                "NDVI": [
                    {
                        "date": date(2024, m, 15).isoformat(),
                        "value": 0.3 + 0.04 * m,
                        "outlier": False,
                        "interpolated": False,
                    }
                    for m in range(1, 13)
                ],
            },
            "cloud_coverage_mean": 5,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {"NDVI": []},
        }
    )
    step2 = _build_step2_weather()
    output = detect_phenology(step1, step2, index_key="NIRv")
    assert output.mean_dates.peak is not None
    assert output.referential_cycle_used is False


def test_detect_phenology_referential_cycle_false_without_stades() -> None:
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()
    output = detect_phenology(
        step1,
        step2,
        reference_data={"systemes": {"intensif": {"indice_cle": "NIRv"}}},
        planting_system="intensif",
    )
    assert output.referential_cycle_used is False


def test_detect_phenology_single_year_zero_variability_and_gdd_corr() -> None:
    index_points = {"NIRv": []}
    for m in range(1, 13):
        index_points["NIRv"].append(
            {
                "date": date(2024, m, 15).isoformat(),
                "value": round(0.35 + 0.02 * math.sin(m), 4),
                "outlier": False,
                "interpolated": False,
            }
        )
    step1 = Step1Output.model_validate(
        {
            "index_time_series": index_points,
            "cloud_coverage_mean": 10,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {"NIRv": []},
        }
    )
    step2 = _build_step2_weather()
    output = detect_phenology(step1, step2)
    for k in output.inter_annual_variability_days:
        assert output.inter_annual_variability_days[k] == 0.0
        assert output.gdd_correlation[k] == 0.0


def test_detect_phenology_gdd_correlation_nan_becomes_zero() -> None:
    """Same DOY for a stage across two leap years but different GDD → corrcoef NaN → 0.0."""
    index_points = {"NIRv": []}

    def add_year(y: int) -> None:
        for m in range(1, 13):
            v = 0.35 + 0.15 * math.sin((2 * math.pi * (m - 1)) / 12)
            index_points["NIRv"].append(
                {
                    "date": date(y, m, 15).isoformat(),
                    "value": round(v, 4),
                    "outlier": False,
                    "interpolated": False,
                }
            )

    for y in (2020, 2024):
        add_year(y)

    monthly = []
    cumulative: dict[str, float] = {}
    running = 0.0
    for y in (2020, 2024):
        for month in range(1, 13):
            key = f"{y}-{month:02d}"
            gdd_total = 50.0 + (month * 5 if y == 2020 else month * 20)
            running += gdd_total
            cumulative[key] = running
            monthly.append(
                {
                    "month": key,
                    "precipitation_total": 10.0,
                    "gdd_total": gdd_total,
                }
            )

    step1 = Step1Output.model_validate(
        {
            "index_time_series": index_points,
            "cloud_coverage_mean": 10,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {"NIRv": []},
        }
    )
    step2 = Step2Output.model_validate(
        {
            "daily_weather": [],
            "monthly_aggregates": monthly,
            "cumulative_gdd": cumulative,
            "chill_hours": 0,
            "extreme_events": [],
        }
    )
    output = detect_phenology(step1, step2)
    for v in output.gdd_correlation.values():
        assert v == v
        assert not math.isnan(v)
