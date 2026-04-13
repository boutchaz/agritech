from datetime import date
from importlib import import_module


types_module = import_module("app.services.calibration.types")
step3_module = import_module("app.services.calibration.pipeline.s3_percentile_calculation")

Step1Output = getattr(types_module, "Step1Output")
calculate_percentiles = getattr(step3_module, "calculate_percentiles")


def _step1_fixture(months: int = 30):
    rows = {}
    indices = ["NDVI", "NIRv", "NDMI", "NDRE", "EVI", "MSAVI", "MSI", "GCI"]
    for index_idx, index in enumerate(indices):
        points = []
        for m in range(months):
            year = 2023 + ((m + 1) // 12)
            month = (m % 12) + 1
            value = 0.3 + 0.02 * (m % 10) + index_idx * 0.01
            points.append(
                {
                    "date": date(year, month, 15).isoformat(),
                    "value": round(value, 4),
                    "outlier": False,
                    "interpolated": False,
                }
            )
        rows[index] = points

    return Step1Output.model_validate(
        {
            "index_time_series": rows,
            "cloud_coverage_mean": 12,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {key: [] for key in indices},
        }
    )


def test_step3_global_percentiles_for_all_indices() -> None:
    step1 = _step1_fixture()
    output = calculate_percentiles(step1)

    assert len(output.global_percentiles) == 8
    ndvi = output.global_percentiles["NDVI"]
    assert ndvi.p10 <= ndvi.p50 <= ndvi.p90
    assert ndvi.std >= 0


def test_step3_builds_period_percentiles_when_history_exceeds_24_months() -> None:
    step1 = _step1_fixture(months=30)
    output = calculate_percentiles(step1)

    assert output.phenology_period_percentiles
    assert "dormancy" in output.phenology_period_percentiles
    assert "NDVI" in output.phenology_period_percentiles["dormancy"]


def test_step3_uses_referential_stades_bbch_for_periods_when_present() -> None:
    step1 = _step1_fixture(months=30)
    reference_data = {
        "stades_bbch": [
            {"code": "00", "mois": ["Dec", "Jan"]},
            {"code": "09", "mois": ["Fev", "Mar"]},
            {"code": "60", "mois": ["Mai"]},
            {"code": "92", "mois": ["Nov", "Dec"]},
        ]
    }
    output = calculate_percentiles(
        step1,
        reference_data=reference_data,
        crop_type="olivier",
    )
    assert output.phenology_period_percentiles
    assert "dormancy" in output.phenology_period_percentiles
    assert "growth" in output.phenology_period_percentiles
    assert "flowering" in output.phenology_period_percentiles
    assert "maturation" in output.phenology_period_percentiles
    assert "NDVI" in output.phenology_period_percentiles["dormancy"]


def test_step3_ignores_structural_zeros_when_enough_positive_values() -> None:
    points = [
        {
            "date": date(2024, month, 15).isoformat(),
            "value": value,
            "outlier": False,
            "interpolated": False,
        }
        for month, value in [
            (1, 0.0),
            (2, 0.0),
            (3, 0.0),
            (4, 0.11),
            (5, 0.14),
            (6, 0.18),
            (7, 0.22),
            (8, 0.27),
            (9, 0.31),
            (10, 0.35),
        ]
    ]

    step1 = Step1Output.model_validate(
        {
            "index_time_series": {"NDVI": points},
            "cloud_coverage_mean": 10,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {"NDVI": []},
        }
    )

    output = calculate_percentiles(step1)
    ndvi = output.global_percentiles["NDVI"]

    assert ndvi.p10 > 0.0
    assert ndvi.p25 > 0.0
