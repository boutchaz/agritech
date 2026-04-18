from datetime import date
from importlib import import_module


types_module = import_module("app.services.calibration.types")
step8_module = import_module("app.services.calibration.pipeline.s8_health_score")

Step1Output = getattr(types_module, "Step1Output")
Step3Output = getattr(types_module, "Step3Output")
Step7Output = getattr(types_module, "Step7Output")
calculate_health_score = getattr(step8_module, "calculate_health_score")


def _base_inputs():
    step1 = Step1Output.model_validate(
        {
            "index_time_series": {
                "NIRv": [{"date": date(2025, 10, 1).isoformat(), "value": 0.64}],
                "NDMI": [{"date": date(2025, 10, 1).isoformat(), "value": 0.46}],
                "NDRE": [{"date": date(2025, 10, 1).isoformat(), "value": 0.52}],
            },
            "cloud_coverage_mean": 12,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {"NIRv": [], "NDMI": [], "NDRE": []},
        }
    )
    step3 = Step3Output.model_validate(
        {
            "global_percentiles": {
                "NIRv": {
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
    return step1, step3, step7


def test_step8_returns_health_score_and_components() -> None:
    step1, step3, step7 = _base_inputs()
    output = calculate_health_score(step1=step1, step3=step3, step7=step7)

    assert 0 <= output.health_score.total <= 100
    assert set(output.health_score.components.keys()) == {
        "vigor",
        "temporal_stability",
        "spatial_homogeneity",
        "hydric",
        "nutritional",
    }


def test_step8_weighted_total_matches_formula() -> None:
    step1, step3, step7 = _base_inputs()
    output = calculate_health_score(step1=step1, step3=step3, step7=step7)
    c = output.health_score.components

    # Spec §3.8 weights: vigor 30%, spatial 20%, temporal 15%, hydric 20%, nutritional 15%
    expected = (
        c["vigor"] * 0.30
        + c["spatial_homogeneity"] * 0.20
        + c["temporal_stability"] * 0.15
        + c["hydric"] * 0.20
        + c["nutritional"] * 0.15
    )
    assert round(expected, 4) == output.health_score.total


def test_step8_uniform_zones_score_higher_than_mixed() -> None:
    step1, step3, _ = _base_inputs()
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
                {"class_name": "A", "surface_percent": 10},
                {"class_name": "B", "surface_percent": 10},
                {"class_name": "C", "surface_percent": 10},
                {"class_name": "D", "surface_percent": 35},
                {"class_name": "E", "surface_percent": 35},
            ],
            "spatial_pattern_type": "mixed",
        }
    )
    uniform_score = calculate_health_score(step1=step1, step3=step3, step7=uniform)
    mixed_score = calculate_health_score(step1=step1, step3=step3, step7=mixed)

    assert (
        uniform_score.health_score.components["spatial_homogeneity"]
        > mixed_score.health_score.components["spatial_homogeneity"]
    )


def test_step8_ignores_interpolated_points_in_recent_medians() -> None:
    _, step3, step7 = _base_inputs()
    step1 = Step1Output.model_validate(
        {
            "index_time_series": {
                "NIRv": [
                    {
                        "date": date(2025, 9, 1).isoformat(),
                        "value": 0.6,
                        "interpolated": False,
                    },
                    {
                        "date": date(2025, 10, 1).isoformat(),
                        "value": 0.2,
                        "interpolated": True,
                    },
                ],
                "NDMI": [{"date": date(2025, 10, 1).isoformat(), "value": 0.46}],
                "NDRE": [{"date": date(2025, 10, 1).isoformat(), "value": 0.52}],
            },
            "cloud_coverage_mean": 12,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [date(2025, 10, 1).isoformat()],
            "raster_paths": {"NIRv": [], "NDMI": [], "NDRE": []},
        }
    )

    output = calculate_health_score(step1=step1, step3=step3, step7=step7)

    assert output.health_score.components["vigor"] > 70
