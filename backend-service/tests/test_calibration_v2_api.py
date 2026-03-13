from importlib import import_module
from typing import cast

from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient

router = cast(APIRouter, getattr(import_module("app.api.calibration"), "router"))
fixtures_module = import_module("tests.fixtures.calibration_fixtures")

build_satellite_fixture = getattr(fixtures_module, "build_satellite_fixture")
build_weather_fixture = getattr(fixtures_module, "build_weather_fixture")
build_soil_analysis_fixture = getattr(fixtures_module, "build_soil_analysis_fixture")
build_water_analysis_fixture = getattr(fixtures_module, "build_water_analysis_fixture")
build_harvest_fixture = getattr(fixtures_module, "build_harvest_fixture")
build_crop_reference_fixture = getattr(fixtures_module, "build_crop_reference_fixture")
build_parcel_context_fixture = getattr(fixtures_module, "build_parcel_context_fixture")

app = FastAPI()
app.include_router(router, prefix="/api/calibration", tags=["calibration"])
client = TestClient(app)


def _build_v2_payload() -> dict[str, object]:
    parcel = build_parcel_context_fixture()
    satellite = build_satellite_fixture()

    calibration_input = {
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

    satellite_images = [
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
        for row in satellite
    ]

    return {
        "calibration_input": calibration_input,
        "satellite_images": satellite_images,
        "weather_rows": build_weather_fixture(),
    }


def _build_v1_payload() -> dict[str, object]:
    satellite_readings = [
        {
            "date": f"2026-01-{index + 1:02d}",
            "ndvi": 0.55,
            "ndre": 0.21,
            "ndmi": 0.17,
            "gci": 1.25,
            "evi": 0.32,
            "savi": 0.40,
        }
        for index in range(30)
    ]
    weather_readings = [
        {
            "date": f"2026-01-{index + 1:02d}",
            "temp_min": 8,
            "temp_max": 20,
            "precip": 1,
            "et0": 1.8,
        }
        for index in range(30)
    ]
    return {
        "parcel_id": "fixture-parcel-001",
        "crop_type": "olivier",
        "system": "intensif",
        "satellite_readings": satellite_readings,
        "weather_readings": weather_readings,
        "ndvi_thresholds": {
            "optimal": [0.4, 0.6],
            "vigilance": 0.35,
            "alerte": 0.3,
        },
    }


def test_run_v2_returns_calibration_output() -> None:
    response = client.post("/api/calibration/v2/run", json=_build_v2_payload())

    assert response.status_code == 200
    body = cast(dict[str, object], response.json())
    assert body["parcel_id"] == "fixture-parcel-001"
    assert "step1" in body
    assert "step8" in body
    assert "confidence" in body


def test_run_v2_rejects_insufficient_satellite_data() -> None:
    payload = _build_v2_payload()
    payload["satellite_images"] = []

    response = client.post("/api/calibration/v2/run", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == {
        "step": "validation",
        "reason": "Insufficient satellite data",
    }


def test_run_v2_rejects_missing_required_fields_with_422() -> None:
    response = client.post("/api/calibration/v2/run", json={})
    assert response.status_code == 422


def test_precompute_gdd_v2_updates_rows() -> None:
    payload = {
        "latitude": 31.63,
        "longitude": -7.99,
        "crop_type": "olivier",
        "rows": [
            {"temperature_max": 30.0, "temperature_min": 20.0, "gdd_olivier": None}
        ],
    }

    response = client.post("/api/calibration/v2/precompute-gdd", json=payload)

    assert response.status_code == 200
    assert response.json() == {"crop_type": "olivier", "updated_rows": 1}


def test_v1_run_endpoint_still_works() -> None:
    response = client.post("/api/calibration/run", json=_build_v1_payload())

    assert response.status_code == 200
    assert "baseline_ndvi" in response.json()
