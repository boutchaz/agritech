from datetime import date
from importlib import import_module


types_module = import_module("app.services.calibration.types")
step8_module = import_module("app.services.calibration.pipeline.s8_health_score")

Step1Output = getattr(types_module, "Step1Output")
Step3Output = getattr(types_module, "Step3Output")
Step5Output = getattr(types_module, "Step5Output")
Step7Output = getattr(types_module, "Step7Output")
calculate_health_score = getattr(step8_module, "calculate_health_score")


def _base_inputs():
    step1 = Step1Output.model_validate(
        {
            "index_time_series": {
                "NDVI": [{"date": date(2025, 10, 1).isoformat(), "value": 0.64}],
                "NDMI": [{"date": date(2025, 10, 1).isoformat(), "value": 0.46}],
                "NDRE": [{"date": date(2025, 10, 1).isoformat(), "value": 0.52}],
            },
            "cloud_coverage_mean": 12,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {"NDVI": [], "NDMI": [], "NDRE": []},
        }
    )
    step3 = Step3Output.model_validate(
        {
            "global_percentiles": {
                "NDVI": {
                    "p10": 0.3,
                    "p25": 0.4,
                    "p50": 0.5,
                    "p75": 0.6,
                    "p90": 0.7,
                    "mean": 0.52,
                    "std": 0.1,
                },
                "NDMI": {
                    "p10": 0.2,
                    "p25": 0.3,
                    "p50": 0.4,
                    "p75": 0.5,
                    "p90": 0.6,
                    "mean": 0.42,
                    "std": 0.09,
                },
                "NDRE": {
                    "p10": 0.25,
                    "p25": 0.35,
                    "p50": 0.45,
                    "p75": 0.55,
                    "p90": 0.65,
                    "mean": 0.47,
                    "std": 0.08,
                },
            },
            "phenology_period_percentiles": {},
        }
    )
    step5 = Step5Output.model_validate(
        {
            "anomalies": [
                {
                    "date": "2025-08-01",
                    "anomaly_type": "trend_break",
                    "severity": "medium",
                }
            ]
        }
    )
    step7 = Step7Output.model_validate(
        {
            "zones_geojson": {"type": "FeatureCollection", "features": []},
            "zone_summary": [
                {"class_name": "A", "surface_percent": 62},
                {"class_name": "B", "surface_percent": 20},
                {"class_name": "C", "surface_percent": 18},
            ],
            "spatial_pattern_type": "clustered",
        }
    )
    return step1, step3, step5, step7


def test_step8_returns_health_score_and_components() -> None:
    step1, step3, step5, step7 = _base_inputs()
    output = calculate_health_score(step1=step1, step3=step3, step5=step5, step7=step7)

    assert 0 <= output.health_score.total <= 100
    assert set(output.health_score.components.keys()) == {
        "vigor",
        "temporal_stability",
        "spatial_heterogeneity",
        "stability",
        "hydric",
        "nutritional",
    }


def test_step8_weighted_total_matches_formula() -> None:
    step1, step3, step5, step7 = _base_inputs()
    output = calculate_health_score(step1=step1, step3=step3, step5=step5, step7=step7)
    c = output.health_score.components

    expected = (
        c["vigor"] * 0.30
        + c["temporal_stability"] * 0.10
        + c["spatial_heterogeneity"] * 0.10
        + c["stability"] * 0.15
        + c["hydric"] * 0.20
        + c["nutritional"] * 0.15
    )
    assert round(expected, 4) == output.health_score.total


def test_step8_uniform_zones_score_higher_than_mixed() -> None:
    step1, step3, step5, _ = _base_inputs()
    uniform = Step7Output.model_validate(
        {
            "zones_geojson": {"type": "FeatureCollection", "features": []},
            "zone_summary": [{"class_name": "A", "surface_percent": 95}, {"class_name": "B", "surface_percent": 5}],
            "spatial_pattern_type": "uniform",
        }
    )
    mixed = Step7Output.model_validate(
        {
            "zones_geojson": {"type": "FeatureCollection", "features": []},
            "zone_summary": [
                {"class_name": "A", "surface_percent": 20},
                {"class_name": "B", "surface_percent": 20},
                {"class_name": "C", "surface_percent": 20},
                {"class_name": "D", "surface_percent": 20},
                {"class_name": "E", "surface_percent": 20},
            ],
            "spatial_pattern_type": "mixed",
        }
    )
    uniform_score = calculate_health_score(step1=step1, step3=step3, step5=step5, step7=uniform)
    mixed_score = calculate_health_score(step1=step1, step3=step3, step5=step5, step7=mixed)

    assert (
        uniform_score.health_score.components["spatial_heterogeneity"]
        > mixed_score.health_score.components["spatial_heterogeneity"]
    )


def test_step8_anomalies_reduce_stability() -> None:
    step1, step3, _, step7 = _base_inputs()
    few_anomalies = Step5Output.model_validate({"anomalies": []})
    many_anomalies = Step5Output.model_validate(
        {
            "anomalies": [
                {"date": "2025-07-01", "anomaly_type": "a", "severity": "low"},
                {"date": "2025-07-15", "anomaly_type": "b", "severity": "low"},
                {"date": "2025-08-01", "anomaly_type": "c", "severity": "medium"},
                {"date": "2025-08-15", "anomaly_type": "d", "severity": "high"},
            ]
        }
    )

    stable = calculate_health_score(
        step1=step1, step3=step3, step5=few_anomalies, step7=step7
    )
    unstable = calculate_health_score(
        step1=step1, step3=step3, step5=many_anomalies, step7=step7
    )

    assert (
        unstable.health_score.components["stability"]
        < stable.health_score.components["stability"]
    )
