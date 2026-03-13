from datetime import UTC, datetime
from importlib import import_module
from typing import cast
from pydantic import ValidationError

types_module = import_module("app.services.calibration.types")

CalibrationInput = cast(type, getattr(types_module, "CalibrationInput"))
CalibrationMetadata = cast(type, getattr(types_module, "CalibrationMetadata"))
CalibrationOutput = cast(type, getattr(types_module, "CalibrationOutput"))
ConfidenceComponent = cast(type, getattr(types_module, "ConfidenceComponent"))
ConfidenceScore = cast(type, getattr(types_module, "ConfidenceScore"))
HealthScore = cast(type, getattr(types_module, "HealthScore"))
MaturityPhase = cast(type, getattr(types_module, "MaturityPhase"))
NutritionOption = cast(type, getattr(types_module, "NutritionOption"))
Step1Output = cast(type, getattr(types_module, "Step1Output"))
Step2Output = cast(type, getattr(types_module, "Step2Output"))
Step3Output = cast(type, getattr(types_module, "Step3Output"))
Step4Output = cast(type, getattr(types_module, "Step4Output"))
Step5Output = cast(type, getattr(types_module, "Step5Output"))
Step6Output = cast(type, getattr(types_module, "Step6Output"))
Step7Output = cast(type, getattr(types_module, "Step7Output"))
Step8Output = cast(type, getattr(types_module, "Step8Output"))


def _step_outputs():
    step1 = Step1Output.model_validate(
        {
            "index_time_series": {
                "NDVI": [
                    {
                        "date": "2025-01-15",
                        "value": 0.61,
                        "outlier": False,
                        "interpolated": False,
                    }
                ],
                "NDRE": [{"date": "2025-01-15", "value": 0.28}],
            },
            "cloud_coverage_mean": 12.5,
            "filtered_image_count": 3,
            "outlier_count": 0,
            "interpolated_dates": ["2025-01-30"],
            "raster_paths": {
                "NDVI": ["calibration-rasters/org1/parcel1/2025-01-15/ndvi.tif"]
            },
        }
    )

    step2 = Step2Output.model_validate(
        {
            "daily_weather": [
                {
                    "date": "2025-01-15",
                    "temp_min": 8,
                    "temp_max": 22,
                    "precip": 2.5,
                    "et0": 1.6,
                }
            ],
            "monthly_aggregates": [
                {
                    "month": "2025-01",
                    "precipitation_total": 35.0,
                    "gdd_total": 110.0,
                }
            ],
            "cumulative_gdd": {"2025-01": 110.0},
            "chill_hours": 85.0,
            "extreme_events": [
                {
                    "date": "2025-01-20",
                    "event_type": "late_frost",
                    "severity": "medium",
                }
            ],
        }
    )

    step3 = Step3Output.model_validate(
        {
            "global_percentiles": {
                "NDVI": {
                    "p10": 0.31,
                    "p25": 0.42,
                    "p50": 0.56,
                    "p75": 0.67,
                    "p90": 0.74,
                    "mean": 0.55,
                    "std": 0.08,
                }
            },
            "phenology_period_percentiles": {
                "floraison": {
                    "NDVI": {
                        "p10": 0.32,
                        "p25": 0.44,
                        "p50": 0.57,
                        "p75": 0.68,
                        "p90": 0.76,
                        "mean": 0.56,
                        "std": 0.07,
                    }
                }
            },
        }
    )

    step4 = Step4Output.model_validate(
        {
            "mean_dates": {
                "dormancy_exit": "2025-03-10",
                "peak": "2025-06-22",
                "plateau_start": "2025-07-01",
                "decline_start": "2025-09-15",
                "dormancy_entry": "2025-12-05",
            },
            "inter_annual_variability_days": {"peak": 12.0},
            "gdd_correlation": {"peak": 0.81},
        }
    )

    step5 = Step5Output.model_validate(
        {
            "anomalies": [
                {
                    "date": "2025-08-12",
                    "anomaly_type": "sudden_drop",
                    "severity": "high",
                    "weather_reference": "heatwave",
                    "excluded_from_reference": True,
                }
            ]
        }
    )

    step6 = Step6Output.model_validate(
        {
            "yield_potential": {
                "minimum": 18.0,
                "maximum": 25.0,
                "method": "reference_and_history",
                "reference_bracket": "20-30_ans",
                "historical_average": 21.3,
            }
        }
    )

    step7 = Step7Output.model_validate(
        {
            "zones_geojson": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "properties": {"zone": "A"},
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]],
                        },
                    }
                ],
            },
            "zone_summary": [{"class_name": "A", "surface_percent": 32.1}],
            "spatial_pattern_type": "clustered",
        }
    )

    step8 = Step8Output.model_validate(
        {
            "health_score": {
                "total": 78.0,
                "components": {
                    "vigor": 80.0,
                    "homogeneity": 74.0,
                    "stability": 77.0,
                    "hydric": 79.0,
                    "nutritional": 76.0,
                },
            }
        }
    )

    return step1, step2, step3, step4, step5, step6, step7, step8


def test_step_outputs_validate_with_fixture_data() -> None:
    outputs = _step_outputs()
    assert len(outputs) == 8
    assert outputs[0].cloud_coverage_mean == 12.5
    assert outputs[7].health_score.total == 78.0


def test_calibration_output_serialization_matches_expected_schema() -> None:
    step1, step2, step3, step4, step5, step6, step7, step8 = _step_outputs()

    confidence = ConfidenceScore(
        total_score=84.0,
        normalized_score=0.84,
        components={
            "satellite": ConfidenceComponent(score=30.0, max_score=30.0),
            "soil": ConfidenceComponent(score=14.0, max_score=20.0),
        },
    )

    output = CalibrationOutput(
        parcel_id="parcel-001",
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
        nutrition_option_suggestion=NutritionOption.A,
        step1=step1,
        step2=step2,
        step3=step3,
        step4=step4,
        step5=step5,
        step6=step6,
        step7=step7,
        step8=step8,
        confidence=confidence,
        metadata=CalibrationMetadata(version="v2", generated_at=datetime.now(UTC)),
    )

    dumped = output.model_dump(mode="json")

    assert dumped["parcel_id"] == "parcel-001"
    assert dumped["maturity_phase"] == "pleine_production"
    assert dumped["nutrition_option_suggestion"] == "A"
    assert set(dumped.keys()) == {
        "parcel_id",
        "maturity_phase",
        "nutrition_option_suggestion",
        "step1",
        "step2",
        "step3",
        "step4",
        "step5",
        "step6",
        "step7",
        "step8",
        "confidence",
        "metadata",
    }


def test_calibration_input_requires_crop_type() -> None:
    try:
        _ = CalibrationInput.model_validate(
            {
                "parcel_id": "parcel-001",
                "organization_id": "org-001",
                "satellite_series": {},
                "weather_daily": [],
                "analyses": [],
                "harvest_records": [],
                "reference_data": {},
            }
        )
        raise AssertionError("CalibrationInput should reject missing crop_type")
    except ValidationError:
        pass


def test_health_score_rejects_values_outside_range() -> None:
    try:
        _ = HealthScore.model_validate(
            {
                "total": 150,
                "components": {
                    "vigor": 80.0,
                    "homogeneity": 74.0,
                    "stability": 77.0,
                    "hydric": 79.0,
                    "nutritional": 76.0,
                },
            }
        )
        raise AssertionError("HealthScore should reject scores outside 0-100")
    except ValidationError:
        pass


def test_maturity_phase_handles_missing_planting_year() -> None:
    assert (
        MaturityPhase.from_planting_year(None, current_year=2026)
        == MaturityPhase.UNKNOWN
    )
    assert (
        MaturityPhase.from_planting_year(2023, current_year=2026)
        == MaturityPhase.JUVENILE
    )
