from datetime import date, timedelta
from importlib import import_module


step1_module = import_module("app.services.calibration.step1_satellite_extraction")
storage_module = import_module("app.services.calibration.raster_storage")

extract_satellite_history = getattr(step1_module, "extract_satellite_history")
CalibrationRasterStorage = getattr(storage_module, "CalibrationRasterStorage")
RasterStorageConfig = getattr(storage_module, "RasterStorageConfig")


def _build_images(total: int, cloudy_every: int = 5) -> list[dict[str, object]]:
    start = date(2024, 1, 1)
    rows: list[dict[str, object]] = []
    for idx in range(total):
        current = start + timedelta(days=15 * idx)
        base = 0.45 + (idx % 6) * 0.03
        cloud = 35.0 if idx % cloudy_every == 0 else 12.0
        rows.append(
            {
                "date": current.isoformat(),
                "cloud_coverage": cloud,
                "indices": {
                    "NDVI": base,
                    "NIRv": base - 0.03,
                    "NDMI": base - 0.06,
                    "NDRE": base - 0.08,
                    "EVI": base - 0.09,
                    "MSAVI": base - 0.07,
                    "MSI": 0.95 - (base / 5),
                    "GCI": 1.1 + base,
                },
            }
        )
    return rows


def test_step1_extracts_index_time_series_and_paths() -> None:
    images = _build_images(total=50, cloudy_every=7)
    storage = CalibrationRasterStorage(
        RasterStorageConfig(
            supabase_url="https://example.supabase.co", supabase_service_key="key"
        )
    )

    output = extract_satellite_history(
        organization_id="org-1",
        parcel_id="parcel-1",
        images=images,
        storage=storage,
        max_cloud_coverage=20.0,
    )

    assert set(output.index_time_series.keys()) == {
        "NDVI",
        "NIRv",
        "NDMI",
        "NDRE",
        "EVI",
        "MSAVI",
        "MSI",
        "GCI",
    }
    assert len(output.index_time_series["NDVI"]) >= 40
    assert output.filtered_image_count > 0
    assert len(output.raster_paths["NDVI"]) >= 40


def test_step1_filters_heavy_cloud_and_marks_low_density_series() -> None:
    images = _build_images(total=10, cloudy_every=2)
    output = extract_satellite_history(
        organization_id="org-1",
        parcel_id="parcel-1",
        images=images,
        storage=None,
        max_cloud_coverage=20.0,
    )

    assert output.filtered_image_count >= 5
    assert len(output.index_time_series["NDVI"]) <= 5


def test_step1_interpolates_missing_dates_within_gap_limit() -> None:
    start = date(2024, 1, 1)
    images = [
        {
            "date": start.isoformat(),
            "cloud_coverage": 10.0,
            "indices": {
                "NDVI": 0.4,
                "NIRv": 0.3,
                "NDMI": 0.2,
                "NDRE": 0.25,
                "EVI": 0.28,
                "MSAVI": 0.3,
                "MSI": 0.9,
                "GCI": 1.2,
            },
        },
        {
            "date": (start + timedelta(days=10)).isoformat(),
            "cloud_coverage": 10.0,
            "indices": {
                "NDVI": 0.5,
                "NIRv": 0.4,
                "NDMI": 0.3,
                "NDRE": 0.35,
                "EVI": 0.38,
                "MSAVI": 0.4,
                "MSI": 0.8,
                "GCI": 1.3,
            },
        },
    ]

    output = extract_satellite_history(
        organization_id="org-1",
        parcel_id="parcel-1",
        images=images,
        storage=None,
        interpolate_max_gap_days=15,
    )

    assert len(output.interpolated_dates) == 9
    assert any(point.interpolated for point in output.index_time_series["NDVI"])
