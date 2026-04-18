from __future__ import annotations

from statistics import median

from ..types import (
    HealthScore,
    Step1Output,
    Step3Output,
    Step7Output,
    Step8Output,
)


_ROLLING_WINDOW = 5


def _clamp(value: float) -> float:
    if value < 0:
        return 0.0
    if value > 100:
        return 100.0
    return value


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
) -> Step8Output:
    # Spec §3.8: vigor uses NIRv median vs referential
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

    # Spec §3.8: spatial homogeneity 20%, temporal stability 15%
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

    # Spec §3.8 weights: vigor 30%, spatial 20%, temporal 15%, hydric 20%, nutritional 15%
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
