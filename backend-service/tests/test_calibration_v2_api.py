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


def test_run_v2_rejects_unsupported_crop_type() -> None:
    payload = _build_v2_payload()
    payload["calibration_input"]["crop_type"] = "bananier"

    response = client.post("/api/calibration/v2/run", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "Unsupported crop_type 'bananier'"


def test_run_v2_rejects_sparse_satellite_history_after_filtering() -> None:
    payload = _build_v2_payload()
    payload["satellite_images"] = payload["satellite_images"][:3]

    response = client.post("/api/calibration/v2/run", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == {
        "step": "pipeline",
        "reason": "Calibration requires at least 10 observed NDVI images after filtering",
    }


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
    body = response.json()
    assert body["crop_type"] == "olivier"
    assert body["updated_rows"] == 1
    assert len(body["rows"]) == 1
    assert body["rows"][0]["gdd_olivier"] is not None


def test_v1_run_endpoint_removed() -> None:
    response = client.post("/api/calibration/run", json={})
    assert response.status_code == 404
