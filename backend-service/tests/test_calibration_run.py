from importlib import import_module
from pathlib import Path
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

TEMP_MIN_SERIES = [
    5,
    6,
    7,
    8,
    9,
    10,
    5,
    6,
    7,
    8,
    9,
    10,
    5,
    6,
    7,
    8,
    9,
    10,
    5,
    6,
    7,
    8,
    9,
    10,
    5,
    6,
    7,
    8,
    9,
    10,
]
TEMP_MAX_SERIES = [
    15,
    16,
    17,
    18,
    19,
    20,
    15,
    16,
    17,
    18,
    19,
    20,
    15,
    16,
    17,
    18,
    19,
    20,
    15,
    16,
    17,
    18,
    19,
    20,
    15,
    16,
    17,
    18,
    19,
    20,
]
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


def _build_payload() -> dict[str, object]:
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


def test_calibration_run_happy_path() -> None:
    response = client.post("/api/calibration/run", json=_build_payload())

    assert response.status_code == 200
    body = cast(dict[str, object], response.json())

    assert body["baseline_ndvi"] == 0.55
    assert body["baseline_ndre"] == 0.21
    assert body["baseline_ndmi"] == 0.17
    assert body["confidence_score"] == 0.63
    assert body["zone_classification"] == "normal"
    assert body["phenology_stage"] == "repos_vegetatif"
    assert body["anomaly_count"] == 0
    assert isinstance(body["processing_time_ms"], int)
    assert body["processing_time_ms"] >= 1


def test_calibration_run_rejects_empty_readings() -> None:
    payload = _build_payload()
    payload["satellite_readings"] = []
    payload["weather_readings"] = []

    response = client.post("/api/calibration/run", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "Satellite and weather readings are required"


def test_calibration_run_falls_back_to_default_crop_type() -> None:
    payload = _build_payload()
    payload["crop_type"] = "mais"

    response = client.post("/api/calibration/run", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "baseline_ndvi" in data


def test_main_registers_calibration_router() -> None:
    main_file = Path(__file__).resolve().parents[1] / "app" / "main.py"
    content = main_file.read_text(encoding="utf-8")

    assert (
        'app.include_router(calibration.router, prefix="/api/calibration", tags=["calibration"])'
        in content
    )
