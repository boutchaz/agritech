import asyncio
from importlib import import_module


types_module = import_module("app.services.calibration.types")
orchestrator_module = import_module("app.services.calibration.orchestrator")
fixtures_module = import_module("tests.fixtures.calibration_fixtures")

CalibrationInput = getattr(types_module, "CalibrationInput")
run_calibration_pipeline = getattr(orchestrator_module, "run_calibration_pipeline")

build_satellite_fixture = getattr(fixtures_module, "build_satellite_fixture")
build_weather_fixture = getattr(fixtures_module, "build_weather_fixture")
build_soil_analysis_fixture = getattr(fixtures_module, "build_soil_analysis_fixture")
build_water_analysis_fixture = getattr(fixtures_module, "build_water_analysis_fixture")
build_harvest_fixture = getattr(fixtures_module, "build_harvest_fixture")
build_crop_reference_fixture = getattr(fixtures_module, "build_crop_reference_fixture")
build_parcel_context_fixture = getattr(fixtures_module, "build_parcel_context_fixture")


def _build_satellite_images():
    rows = []
    for row in build_satellite_fixture():
        rows.append(
            {
                "date": row["date"],
                "cloud_coverage": 12.0,
                "indices": {
                    "ndvi": row["ndvi"],
                    "nirv": row["nirv"],
                    "ndmi": row["ndmi"],
                    "ndre": row["ndre"],
                    "evi": row["evi"],
                    "msavi": row["msavi"],
                    "msi": row["msi"],
                    "gci": row["gci"],
                },
            }
        )
    return rows


def test_orchestrator_runs_all_steps_and_returns_output() -> None:
    parcel = build_parcel_context_fixture()
    satellite = build_satellite_fixture()

    calibration_input = CalibrationInput.model_validate(
        {
            "parcel_id": parcel["parcel_id"],
            "organization_id": parcel["organization_id"],
            "crop_type": parcel["crop_type"],
            "variety": parcel["variety"],
            "planting_year": parcel["planting_year"],
            "planting_system": parcel["planting_system"],
            "satellite_series": {
                "NDVI": [
                    {
                        "date": satellite[0]["date"],
                        "value": satellite[0]["ndvi"],
                    }
                ]
            },
            "weather_daily": [
                {
                    "date": "2024-01-01",
                    "temp_min": 6,
                    "temp_max": 20,
                    "precip": 2,
                    "et0": 1.4,
                }
            ],
            "analyses": [
                {
                    "analysis_type": "soil",
                    "analysis_date": "2025-07-01",
                    "data": build_soil_analysis_fixture(),
                },
                {
                    "analysis_type": "water",
                    "analysis_date": "2025-08-01",
                    "data": build_water_analysis_fixture(),
                },
            ],
            "harvest_records": build_harvest_fixture(),
            "reference_data": build_crop_reference_fixture(),
        }
    )

    output = asyncio.run(
        run_calibration_pipeline(
            calibration_input=calibration_input,
            satellite_images=_build_satellite_images(),
            weather_rows=build_weather_fixture(),
            storage=None,
        )
    )

    assert output.parcel_id == parcel["parcel_id"]
    assert output.step1.index_time_series
    assert output.step2.daily_weather
    assert output.step3.global_percentiles
    assert output.step4.mean_dates.peak is not None
    assert output.step5.anomalies is not None
    assert output.step6.yield_potential.maximum >= output.step6.yield_potential.minimum
    assert output.step7.zone_summary
    assert 0 <= output.step8.health_score.total <= 100
    assert 0 <= output.confidence.normalized_score <= 1


def test_orchestrator_normalizes_mixed_case_index_keys() -> None:
    parcel = build_parcel_context_fixture()
    weather = build_weather_fixture()

    calibration_input = CalibrationInput.model_validate(
        {
            "parcel_id": parcel["parcel_id"],
            "organization_id": parcel["organization_id"],
            "crop_type": parcel["crop_type"],
            "variety": parcel["variety"],
            "planting_year": parcel["planting_year"],
            "planting_system": parcel["planting_system"],
            "analyses": [],
            "harvest_records": build_harvest_fixture(),
            "reference_data": build_crop_reference_fixture(),
        }
    )

    # Need >= 10 observed NDVI images to pass the min_observed_images guard.
    # Use mixed-case index keys across entries to test normalization.
    _base_indices_upper = {
        "NDVI": 0.40, "NIRV": 0.31, "ndmi": 0.22, "NdRe": 0.21,
        "EVI": 0.18, "msavi": 0.25, "MSI": 0.90, "gci": 1.15,
    }
    _base_indices_lower = {
        "ndvi": 0.45, "nirv": 0.35, "NDMI": 0.24, "NDRE": 0.23,
        "evi": 0.20, "MSAVI": 0.27, "msi": 0.88, "GCI": 1.20,
    }
    satellite_images = []
    for i in range(12):
        day = 1 + i * 15
        month = 1 + (day - 1) // 30
        day_of_month = ((day - 1) % 30) + 1
        if month > 12:
            month = 12
            day_of_month = 28
        date_str = f"2024-{month:02d}-{day_of_month:02d}"
        indices = dict(_base_indices_upper if i % 2 == 0 else _base_indices_lower)
        satellite_images.append(
            {"date": date_str, "cloud_coverage": 5.0, "indices": indices}
        )

    output = asyncio.run(
        run_calibration_pipeline(
            calibration_input=calibration_input,
            satellite_images=satellite_images,
            weather_rows=weather,
            storage=None,
        )
    )

    # "msavi"/"MSAVI" in input is normalized to canonical "MSAVI2" internally.
    for index in ["NDVI", "NIRv", "NDMI", "NDRE", "EVI", "MSAVI2", "MSI", "GCI"]:
        assert index in output.step3.global_percentiles, (
            f"{index} not in {list(output.step3.global_percentiles.keys())}"
        )
        assert output.step3.global_percentiles[index].p10 is not None
        assert output.step3.global_percentiles[index].p25 is not None
