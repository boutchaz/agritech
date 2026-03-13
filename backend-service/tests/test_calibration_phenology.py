from importlib import import_module
from typing import cast

from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient

router = cast(APIRouter, getattr(import_module("app.api.calibration"), "router"))
app = FastAPI()
app.include_router(router, prefix="/api/calibration", tags=["calibration"])
client = TestClient(app)


def test_calibration_phenology_month_mapping() -> None:
    expected_by_month = {
        1: "repos_vegetatif",
        2: "repos_vegetatif",
        3: "debourrement",
        4: "debourrement",
        5: "floraison",
        6: "floraison",
        7: "nouaison",
        8: "nouaison",
        9: "grossissement",
        10: "grossissement",
        11: "maturation",
        12: "maturation",
    }

    for month, expected_stage in expected_by_month.items():
        response = client.post(
            "/api/calibration/phenology",
            json={
                "crop_type": "olivier",
                "month": month,
                "ndvi": 0.55,
                "ndre": 0.21,
            },
        )

        assert response.status_code == 200
        body = cast(dict[str, object], response.json())
        assert body["stage"] == expected_stage
        assert body["stage_code"]
        assert body["description"]


def test_calibration_phenology_falls_back_for_unknown_crop_type() -> None:
    response = client.post(
        "/api/calibration/phenology",
        json={
            "crop_type": "bananier",
            "month": 1,
            "ndvi": 0.55,
            "ndre": 0.21,
        },
    )

    assert response.status_code == 200
    body = cast(dict[str, object], response.json())
    assert "stage" in body
