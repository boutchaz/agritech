from importlib import import_module
from typing import cast

from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient

router = cast(APIRouter, getattr(import_module("app.api.calibration"), "router"))
app = FastAPI()
app.include_router(router, prefix="/api/calibration", tags=["calibration"])
client = TestClient(app)

NDVI_SERIES = [0.52, 0.54, 0.55, 0.56, 0.58] * 6
NDRE_SERIES = [0.19, 0.20, 0.21, 0.22, 0.23] * 6
NDMI_SERIES = [0.15, 0.16, 0.17, 0.18, 0.19] * 6
GCI_SERIES = [1.18, 1.22, 1.25, 1.29, 1.33] * 6
EVI_SERIES = [0.30, 0.31, 0.32, 0.33, 0.34] * 6
SAVI_SERIES = [0.37, 0.39, 0.40, 0.41, 0.43] * 6

TEMP_MIN_SERIES = [5, 6, 7, 8, 9, 10] * 5
TEMP_MAX_SERIES = [15, 16, 17, 18, 19, 20] * 5
PRECIP_SERIES = [
    0,
    1,
    0,
    2,
    1,
    0,
    3,
    0,
    1,
    4,
    0,
    2,
    0,
    5,
    1,
    0,
    2,
    0,
    1,
    3,
    0,
    4,
    0,
    1,
    2,
    0,
    1,
    0,
    2,
    1,
]
ET0_SERIES = [
    1.2,
    1.3,
    1.5,
    1.7,
    1.9,
    2.1,
    1.4,
    1.6,
    1.8,
    2.0,
    2.2,
    1.5,
    1.7,
    1.9,
    2.1,
    2.3,
    1.6,
    1.8,
    2.0,
    2.2,
    2.4,
    1.7,
    1.9,
    2.1,
    2.3,
    1.8,
    2.0,
    2.2,
    2.4,
    2.6,
]


def _build_run_payload() -> dict[str, object]:
    satellite_readings: list[dict[str, float | str]] = []
    weather_readings: list[dict[str, float | str]] = []

    for index in range(30):
        date_value = f"2026-01-{index + 1:02d}"
        satellite_readings.append(
            {
                "date": date_value,
                "ndvi": NDVI_SERIES[index],
                "ndre": NDRE_SERIES[index],
                "ndmi": NDMI_SERIES[index],
                "gci": GCI_SERIES[index],
                "evi": EVI_SERIES[index],
                "savi": SAVI_SERIES[index],
            }
        )
        weather_readings.append(
            {
                "date": date_value,
                "temp_min": TEMP_MIN_SERIES[index],
                "temp_max": TEMP_MAX_SERIES[index],
                "precip": PRECIP_SERIES[index],
                "et0": ET0_SERIES[index],
            }
        )

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


def _run_pipeline() -> tuple[dict[str, object], dict[str, object], dict[str, object]]:
    run_response = client.post("/api/calibration/run", json=_build_run_payload())
    assert run_response.status_code == 200

    percentiles_response = client.post(
        "/api/calibration/percentiles",
        json={"values": NDVI_SERIES, "percentiles": [10, 50, 90]},
    )
    assert percentiles_response.status_code == 200

    phenology_response = client.post(
        "/api/calibration/phenology",
        json={
            "crop_type": "olivier",
            "month": 1,
            "ndvi": 0.55,
            "ndre": 0.20,
        },
    )
    assert phenology_response.status_code == 200

    return (
        cast(dict[str, object], run_response.json()),
        cast(dict[str, object], percentiles_response.json()),
        cast(dict[str, object], phenology_response.json()),
    )


def test_calibration_run_with_fixture_data_returns_expected_shape() -> None:
    run_body, _, _ = _run_pipeline()

    assert {
        "baseline_ndvi",
        "baseline_ndre",
        "baseline_ndmi",
        "confidence_score",
        "zone_classification",
        "phenology_stage",
        "anomaly_count",
        "processing_time_ms",
    }.issubset(run_body.keys())
    assert cast(float, run_body["confidence_score"]) >= 0.7
    assert cast(str, run_body["zone_classification"]) in {
        "normal",
        "stressed",
        "optimal",
    }


def test_percentiles_endpoint_returns_p50_close_to_fixture_median_ndvi() -> None:
    _, percentiles_body, _ = _run_pipeline()

    percentiles = cast(dict[str, float], percentiles_body["percentiles"])
    assert abs(percentiles["p50"] - 0.55) <= 0.01


def test_phenology_for_olivier_in_january_returns_repos_vegetatif() -> None:
    _, _, phenology_body = _run_pipeline()

    assert phenology_body["stage"] == "repos_vegetatif"
