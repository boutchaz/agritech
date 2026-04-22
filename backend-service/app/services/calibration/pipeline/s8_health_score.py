from __future__ import annotations

from statistics import median
from typing import Any

from ..types import (
    HealthScore,
    Step1Output,
    Step3Output,
    Step7Output,
    Step8Output,
)


_ROLLING_WINDOW = 5
_ADJUSTMENT_FLOOR = 0.8
_ADJUSTMENT_CEIL = 1.2


def _clamp(value: float) -> float:
    if value < 0:
        return 0.0
    if value > 100:
        return 100.0
    return value


def _bounded_adjust(base: float, factor: float) -> float:
    adjusted = base * factor
    return max(base * _ADJUSTMENT_FLOOR, min(base * _ADJUSTMENT_CEIL, adjusted))


def _to_float(data: dict[str, Any] | None, key: str) -> float | None:
    if not data:
        return None
    val = data.get(key)
    if isinstance(val, (int, float)):
        return float(val)
    return None


def _soil_nutritional_factor(soil: dict[str, Any] | None) -> float:
    if not soil:
        return 1.0
    ph = _to_float(soil, "ph_level")
    om = _to_float(soil, "organic_matter_percentage")
    ec = _to_float(soil, "electrical_conductivity")
    points = 0.0
    if ph is not None:
        if 6.5 <= ph <= 7.5:
            points += 0.1
        elif ph > 8.2 or ph < 5.5:
            points -= 0.15
    if om is not None:
        if om > 2.0:
            points += 0.1
        elif om < 1.0:
            points -= 0.1
    if ec is not None:
        if ec > 4.0:
            points -= 0.15
        elif ec < 2.0:
            points += 0.05
    return 1.0 + points


def _water_hydric_factor(water: dict[str, Any] | None) -> float:
    if not water:
        return 1.0
    sar = _to_float(water, "sar")
    chloride = _to_float(water, "chloride_ppm")
    ec = _to_float(water, "ec_ds_per_m")
    points = 0.0
    if sar is not None:
        if sar > 9.0:
            points -= 0.2
        elif sar > 6.0:
            points -= 0.15
        elif sar < 3.0:
            points += 0.05
    if chloride is not None and chloride > 10.0:
        points -= 0.1
    if ec is not None and ec > 3.0:
        points -= 0.1
    return 1.0 + points


def _foliar_nutritional_factor(foliar: dict[str, Any] | None) -> float:
    if not foliar:
        return 1.0
    n = _to_float(foliar, "nitrogen_percentage")
    p = _to_float(foliar, "phosphorus_percentage")
    k = _to_float(foliar, "potassium_percentage")
    points = 0.0
    if n is not None:
        if n > 2.0:
            points += 0.05
        elif n < 1.5:
            points -= 0.1
    if k is not None:
        if k > 0.8:
            points += 0.05
        elif k < 0.5:
            points -= 0.1
    if p is not None:
        if p > 0.2:
            points += 0.03
        elif p < 0.1:
            points -= 0.05
    return 1.0 + points


def _rolling_median(
    step1: Step1Output, index: str, window: int = _ROLLING_WINDOW
) -> float:
    points = step1.index_time_series.get(index, [])
    if not points:
        return 0.0

    observed = [p for p in points if not p.interpolated]
    valid = [p for p in observed if not p.outlier]
    if not valid:
        valid = observed
    if not valid:
        return 0.0

    sorted_pts = sorted(valid, key=lambda item: item.date)[-window:]
    return float(median(p.value for p in sorted_pts))


def _temporal_homogeneity(step3: Step3Output) -> float:
    # Temporal CV proxy: CV=0 → 100, CV≥0.5 → 0
    ndvi_ref = step3.global_percentiles.get("NDVI")
    if not ndvi_ref or ndvi_ref.mean == 0:
        return 50.0

    cv = ndvi_ref.std / abs(ndvi_ref.mean)
    return _clamp(100 - cv * 200)


def _spatial_homogeneity(step7: Step7Output) -> float:
    """Score spatial homogeneity from zone distribution.

    Spec §3.8: "% surface en classe C ou mieux".
    Zones A, B, C are considered healthy; D, E are problem zones.
    Score = percentage of parcel area in class C or better.
    """
    if not step7.zone_summary:
        return 50.0  # No data → neutral

    good_zones = {"A", "B", "C"}
    good_pct = sum(
        z.surface_percent for z in step7.zone_summary if z.class_name in good_zones
    )
    return _clamp(good_pct)


def calculate_health_score(
    *,
    step1: Step1Output,
    step3: Step3Output,
    step7: Step7Output,
    soil_analysis: dict[str, Any] | None = None,
    water_analysis: dict[str, Any] | None = None,
    foliar_analysis: dict[str, Any] | None = None,
) -> Step8Output:
    nirv_value = _rolling_median(step1, "NIRv")
    ndmi_value = _rolling_median(step1, "NDMI")
    ndre_value = _rolling_median(step1, "NDRE")

    nirv_ref = step3.global_percentiles.get("NIRv")
    ndmi_ref = step3.global_percentiles.get("NDMI")
    ndre_ref = step3.global_percentiles.get("NDRE")

    vigor = 50.0
    if nirv_ref and nirv_ref.p90 > nirv_ref.p10:
        vigor = ((nirv_value - nirv_ref.p10) / (nirv_ref.p90 - nirv_ref.p10)) * 100
    vigor = _clamp(vigor)

    spatial = _spatial_homogeneity(step7)
    temporal = _temporal_homogeneity(step3)

    hydric = 50.0
    if ndmi_ref and ndmi_ref.p90 > ndmi_ref.p10:
        hydric = ((ndmi_value - ndmi_ref.p10) / (ndmi_ref.p90 - ndmi_ref.p10)) * 100
    hydric = _clamp(hydric)

    nutritional = 50.0
    if ndre_ref and ndre_ref.p90 > ndre_ref.p10:
        nutritional = (
            (ndre_value - ndre_ref.p10) / (ndre_ref.p90 - ndre_ref.p10)
        ) * 100
    nutritional = _clamp(nutritional)

    hydric = _bounded_adjust(hydric, _water_hydric_factor(water_analysis))
    soil_factor = _soil_nutritional_factor(soil_analysis)
    foliar_factor = _foliar_nutritional_factor(foliar_analysis)
    nutritional = _bounded_adjust(nutritional, soil_factor * foliar_factor)

    total = (
        vigor * 0.30
        + spatial * 0.20
        + temporal * 0.15
        + hydric * 0.20
        + nutritional * 0.15
    )

    return Step8Output(
        health_score=HealthScore(
            total=round(_clamp(total), 4),
            components={
                "vigor": round(vigor, 4),
                "spatial_homogeneity": round(spatial, 4),
                "temporal_stability": round(temporal, 4),
                "hydric": round(hydric, 4),
                "nutritional": round(nutritional, 4),
            },
        )
    )
