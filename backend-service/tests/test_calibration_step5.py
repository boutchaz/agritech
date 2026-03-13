from datetime import date, timedelta
from importlib import import_module


types_module = import_module("app.services.calibration.types")
step5_module = import_module("app.services.calibration.step5_anomaly_detection")

Step1Output = getattr(types_module, "Step1Output")
Step2Output = getattr(types_module, "Step2Output")
Step4Output = getattr(types_module, "Step4Output")
detect_anomalies = getattr(step5_module, "detect_anomalies")


def _build_step1_with_anomaly() -> object:
    start = date(2024, 1, 1)
    ndvi_values = [
        0.62,
        0.64,
        0.63,
        0.61,
        0.60,
        0.42,
        0.39,
        0.37,
        0.36,
        0.35,
        0.34,
        0.34,
    ]

    points = []
    for idx, value in enumerate(ndvi_values):
        points.append(
            {
                "date": (start + timedelta(days=15 * idx)).isoformat(),
                "value": value,
                "outlier": False,
                "interpolated": False,
            }
        )

    return Step1Output.model_validate(
        {
            "index_time_series": {
                "NDVI": points,
                "NIRv": points,
                "NDMI": points,
                "NDRE": points,
                "EVI": points,
                "MSAVI": points,
                "MSI": points,
                "GCI": points,
            },
            "cloud_coverage_mean": 12,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {
                "NDVI": [],
                "NIRv": [],
                "NDMI": [],
                "NDRE": [],
                "EVI": [],
                "MSAVI": [],
                "MSI": [],
                "GCI": [],
            },
        }
    )


def _build_step2_events() -> object:
    return Step2Output.model_validate(
        {
            "daily_weather": [
                {
                    "date": "2024-01-01",
                    "temp_min": 7,
                    "temp_max": 20,
                    "precip": 2,
                    "et0": 1,
                }
            ],
            "monthly_aggregates": [
                {"month": "2024-01", "precipitation_total": 20, "gdd_total": 80}
            ],
            "cumulative_gdd": {"2024-01": 80},
            "chill_hours": 90,
            "extreme_events": [
                {"date": "2024-03-16", "event_type": "heatwave", "severity": "high"},
            ],
        }
    )


def _build_step4_stub() -> object:
    return Step4Output.model_validate(
        {
            "mean_dates": {
                "dormancy_exit": "2024-03-01",
                "peak": "2024-06-01",
                "plateau_start": "2024-07-01",
                "decline_start": "2024-09-01",
                "dormancy_entry": "2024-12-01",
            },
            "inter_annual_variability_days": {"peak": 8},
            "gdd_correlation": {"peak": 0.7},
        }
    )


def test_step5_detects_sudden_drop_and_trend_break() -> None:
    output = detect_anomalies(
        satellite=_build_step1_with_anomaly(),
        weather=_build_step2_events(),
        phenology=_build_step4_stub(),
    )

    types = {item.anomaly_type for item in output.anomalies}
    assert "sudden_drop" in types
    assert "trend_break" in types


def test_step5_adds_weather_reference_when_event_close() -> None:
    output = detect_anomalies(
        satellite=_build_step1_with_anomaly(),
        weather=_build_step2_events(),
        phenology=_build_step4_stub(),
    )

    with_weather_ref = [item for item in output.anomalies if item.weather_reference]
    assert with_weather_ref


def test_step5_avoids_duplicate_anomaly_records() -> None:
    output = detect_anomalies(
        satellite=_build_step1_with_anomaly(),
        weather=_build_step2_events(),
        phenology=_build_step4_stub(),
    )

    unique_keys = {
        (item.date.isoformat(), item.anomaly_type) for item in output.anomalies
    }
    assert len(unique_keys) == len(output.anomalies)
