from __future__ import annotations

from collections import Counter
from typing import Any, Literal, cast

import numpy as np
from numpy.typing import NDArray

from .types import GeoJsonFeatureCollection, PercentileSet, Step7Output, ZoneSummary


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


def classify_zones(
    median_raster: NDArray[np.float64],
    percentiles: PercentileSet,
    pixel_size_m2: float = 100.0,
) -> Step7Output:
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

    return Step7Output(
        zones_geojson=GeoJsonFeatureCollection(
            type="FeatureCollection", features=features
        ),
        zone_summary=summary,
        spatial_pattern_type=pattern,
    )
