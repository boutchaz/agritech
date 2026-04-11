from importlib import import_module

import numpy as np


step7_module = import_module("app.services.calibration.pipeline.s7_zone_detection")
types_module = import_module("app.services.calibration.types")

classify_zones = getattr(step7_module, "classify_zones")
PercentileSet = getattr(types_module, "PercentileSet")


def test_step7_classifies_pixels_into_five_zone_bands() -> None:
    raster = np.array(
        [
            [0.20, 0.30, 0.40, 0.50, 0.60],
            [0.22, 0.35, 0.45, 0.55, 0.75],
            [0.18, 0.28, 0.38, 0.48, 0.68],
        ],
        dtype=np.float64,
    )

    percentiles = PercentileSet(
        p10=0.22,
        p25=0.30,
        p50=0.45,
        p75=0.60,
        p90=0.72,
        mean=0.42,
        std=0.15,
    )

    output = classify_zones(raster, percentiles)
    zones = {item.class_name for item in output.zone_summary}
    assert zones == {"A", "B", "C", "D", "E"}


def test_step7_surface_percent_sums_to_100() -> None:
    raster = np.array([[0.2, 0.4], [0.6, 0.8]], dtype=np.float64)
    percentiles = PercentileSet(
        p10=0.25,
        p25=0.35,
        p50=0.5,
        p75=0.7,
        p90=0.8,
        mean=0.5,
        std=0.2,
    )

    output = classify_zones(raster, percentiles)
    total = sum(item.surface_percent for item in output.zone_summary)
    assert abs(total - 100.0) < 0.0001


def test_step7_outputs_geojson_feature_collection() -> None:
    raster = np.array([[0.3, 0.4, 0.5]], dtype=np.float64)
    percentiles = PercentileSet(
        p10=0.2,
        p25=0.3,
        p50=0.4,
        p75=0.5,
        p90=0.6,
        mean=0.4,
        std=0.1,
    )

    output = classify_zones(raster, percentiles)
    assert output.zones_geojson.type == "FeatureCollection"
    assert len(output.zones_geojson.features) == 3
