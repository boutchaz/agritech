from datetime import date
from importlib import import_module
import math


types_module = import_module("app.services.calibration.types")
step4_module = import_module("app.services.calibration.step4_phenology_detection")

Step1Output = getattr(types_module, "Step1Output")
Step2Output = getattr(types_module, "Step2Output")
detect_phenology = getattr(step4_module, "detect_phenology")


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
