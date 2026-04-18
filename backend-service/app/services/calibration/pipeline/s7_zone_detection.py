from __future__ import annotations

from collections import Counter
from typing import Any, Literal, cast

import numpy as np
from numpy.typing import NDArray

from ..types import GeoJsonFeatureCollection, NutritionalZones, PercentileSet, Step7Output, ZoneSummary


def _class_for_value(value: float, percentiles: PercentileSet) -> str:
    if value >= percentiles.p75:
        return "A"
    if value >= percentiles.p50:
        return "B"
    if value >= percentiles.p25:
        return "C"
    if value >= percentiles.p10:
        return "D"
    return "E"


def _pattern_type(class_counts: Counter[str], total: int) -> str:
    if total == 0:
        return "unknown"
    max_ratio = max(class_counts.values()) / total
    if max_ratio > 0.7:
        return "uniform"
    if (
        class_counts.get("A", 0) / total > 0.25
        or class_counts.get("E", 0) / total > 0.25
    ):
        return "clustered"
    return "mixed"


def _build_raster(
    ndvi_raster_pixels: list[dict[str, Any]] | None,
    observed_ndvi_points: list[Any] | None,
) -> tuple[NDArray[np.float64], bool, list[dict[str, float]] | None]:
    """Build raster array from raw pixel data. Returns (raster, has_real_zones, pixel_coords)."""
    fallback_values = (
        [p.value for p in observed_ndvi_points] if observed_ndvi_points else [0.0]
    )
    median_ndvi = float(np.median(fallback_values))

    if ndvi_raster_pixels and len(ndvi_raster_pixels) > 1:
        valid_pixels = [p for p in ndvi_raster_pixels if p.get("value") is not None]
        pixel_values = [float(p["value"]) for p in valid_pixels]
        if len(pixel_values) > 1:
            raster = np.array(pixel_values, dtype=np.float64).reshape(-1, 1)
            coords: list[dict[str, float]] | None = None
            if all(p.get("lon") is not None and p.get("lat") is not None for p in valid_pixels):
                coords = [{"lon": float(p["lon"]), "lat": float(p["lat"])} for p in valid_pixels]
            return raster, True, coords

    return np.array([[median_ndvi]], dtype=np.float64), False, None


def _classify_index(
    percentiles: PercentileSet,
    raster_pixels: list[dict[str, Any]] | None,
    observed_points: list[Any] | None,
    pixel_size_m2: float,
) -> tuple[GeoJsonFeatureCollection, list[ZoneSummary], str]:
    """Core classification logic — reusable for any vegetation index."""
    median_raster, _, pixel_coords = _build_raster(raster_pixels, observed_points)

    rows, cols = median_raster.shape
    class_counts: Counter[str] = Counter()
    features: list[dict[str, Any]] = []

    total_pixels = rows * cols
    if total_pixels == 0:
        return Step7Output(
            zones_geojson=GeoJsonFeatureCollection(
                type="FeatureCollection", features=[]
            ),
            zone_summary=[],
            spatial_pattern_type="unknown",
        )

    if pixel_coords and len(pixel_coords) == total_pixels:
        for i in range(total_pixels):
            value = float(median_raster.flat[i])
            zone_class = _class_for_value(value, percentiles)
            class_counts[zone_class] += 1
            coord = pixel_coords[i]
            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "zone": zone_class,
                        "value": value,
                        "pixel_area_m2": pixel_size_m2,
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [coord["lon"], coord["lat"]],
                    },
                }
            )
    else:
        for row in range(rows):
            for col in range(cols):
                value = float(median_raster[row, col])
                zone_class = _class_for_value(value, percentiles)
                class_counts[zone_class] += 1
                features.append(
                    {
                        "type": "Feature",
                        "properties": {
                            "zone": zone_class,
                            "value": value,
                            "pixel_area_m2": pixel_size_m2,
                        },
                        "geometry": {
                            "type": "Point",
                            "coordinates": [float(col), float(row)],
                        },
                    }
                )

    summary: list[ZoneSummary] = []
    for zone in ["A", "B", "C", "D", "E"]:
        count = class_counts.get(zone, 0)
        if count == 0:
            continue
        zone_literal = cast(Literal["A", "B", "C", "D", "E"], zone)
        summary.append(
            ZoneSummary(
                class_name=zone_literal,
                surface_percent=round((count / total_pixels) * 100, 4),
            )
        )

    pattern = _pattern_type(class_counts, total_pixels)

    geojson = GeoJsonFeatureCollection(type="FeatureCollection", features=features)
    return geojson, summary, pattern


def classify_zones(
    percentiles: PercentileSet,
    *,
    ndvi_raster_pixels: list[dict[str, Any]] | None = None,
    observed_ndvi_points: list[Any] | None = None,
    gci_percentiles: PercentileSet | None = None,
    observed_gci_points: list[Any] | None = None,
    pixel_size_m2: float = 100.0,
) -> Step7Output:
    """Classify parcel zones: NDVI (vigor) + GCI (nutritional/chlorophyll).

    NDVI zones = vegetation vigor map (existing behavior).
    GCI zones = nutritional status map (chlorophyll/nitrogen).
    """
    # NDVI vigor zones
    ndvi_geojson, ndvi_summary, ndvi_pattern = _classify_index(
        percentiles, ndvi_raster_pixels, observed_ndvi_points, pixel_size_m2,
    )

    # GCI nutritional zones (if data available)
    nutritional = None
    if gci_percentiles:
        gci_geojson, gci_summary, gci_pattern = _classify_index(
            gci_percentiles, None, observed_gci_points, pixel_size_m2,
        )
        nutritional = NutritionalZones(
            zones_geojson=gci_geojson,
            zone_summary=gci_summary,
            spatial_pattern_type=gci_pattern,
            index_used="GCI",
        )

    return Step7Output(
        zones_geojson=ndvi_geojson,
        zone_summary=ndvi_summary,
        spatial_pattern_type=ndvi_pattern,
        nutritional_zones=nutritional,
    )
