from importlib import import_module
from typing import cast

from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient

router = cast(APIRouter, getattr(import_module("app.api.calibration"), "router"))
app = FastAPI()
app.include_router(router, prefix="/api/calibration", tags=["calibration"])
client = TestClient(app)


def test_calibration_percentiles_known_values() -> None:
    response = client.post(
        "/api/calibration/percentiles",
        json={"values": [1, 2, 3, 4, 5], "percentiles": [25, 50, 75]},
    )

    assert response.status_code == 200
    assert response.json() == {
        "percentiles": {
            "p25": 2.0,
            "p50": 3.0,
            "p75": 4.0,
        }
    }


def test_calibration_percentiles_rejects_empty_values() -> None:
    response = client.post(
        "/api/calibration/percentiles",
        json={"values": [], "percentiles": [25, 50, 75]},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "values must not be empty"
