from importlib import import_module
from typing import cast

from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient

router = cast(APIRouter, getattr(import_module("app.api.calibration"), "router"))
app = FastAPI()
app.include_router(router, prefix="/api/calibration", tags=["calibration"])
client = TestClient(app)

NDVI_SERIES = [0.52, 0.54, 0.55, 0.56, 0.58] * 6


def test_percentiles_endpoint_returns_p50_close_to_fixture_median_ndvi() -> None:
    percentiles_response = client.post(
        "/api/calibration/percentiles",
        json={"values": NDVI_SERIES, "percentiles": [10, 50, 90]},
    )
    assert percentiles_response.status_code == 200

    percentiles = cast(dict[str, float], percentiles_response.json()["percentiles"])
    assert abs(percentiles["p50"] - 0.55) <= 0.01


def test_phenology_for_olivier_in_january_returns_repos_vegetatif() -> None:
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

    phenology_body = cast(dict[str, object], phenology_response.json())
    assert phenology_body["stage"] == "repos_vegetatif"
