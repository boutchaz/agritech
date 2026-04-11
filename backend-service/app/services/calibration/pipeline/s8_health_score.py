from __future__ import annotations

from statistics import median

from ..types import (
    HealthScore,
    Step1Output,
    Step3Output,
    Step5Output,
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

    valid = [p for p in points if not p.outlier]
    if not valid:
        valid = list(points)

    sorted_pts = sorted(valid, key=lambda item: item.date)[-window:]
    return float(median(p.value for p in sorted_pts))


def _temporal_homogeneity(step3: Step3Output) -> float:
    # Temporal CV proxy: CV=0 → 100, CV≥0.5 → 0
    ndvi_ref = step3.global_percentiles.get("NDVI")
    if not ndvi_ref or ndvi_ref.mean == 0:
        return 50.0

    cv = ndvi_ref.std / abs(ndvi_ref.mean)
    return _clamp(100 - cv * 200)


def _spatial_heterogeneity(step7: Step7Output) -> float:
    """Score spatial uniformity from zone distribution.

    A parcel dominated by one zone (uniform) scores high.
    A parcel spread across many zones (heterogeneous) scores low.

    Uses a concentration metric: sum of squared proportions (Herfindahl index).
    - Perfectly uniform (100% one zone): HHI = 1.0 → score 100
    - Perfectly spread (20% each of 5 zones): HHI = 0.2 → score 0
    - Scales linearly from HHI 0.2 (worst) to 1.0 (best).
    """
    if not step7.zone_summary:
        return 50.0  # No data → neutral

    proportions = [z.surface_percent / 100.0 for z in step7.zone_summary]
    hhi = sum(p * p for p in proportions)

    # HHI ranges from 1/N (uniform spread) to 1.0 (single zone).
    # With 5 zones, min HHI = 0.2. Map [0.2, 1.0] → [0, 100].
    min_hhi = 0.2
    score = (hhi - min_hhi) / (1.0 - min_hhi) * 100
    return _clamp(score)


def calculate_health_score(
    *,
    step1: Step1Output,
    step3: Step3Output,
    step5: Step5Output,
    step7: Step7Output,
) -> Step8Output:
    ndvi_value = _rolling_median(step1, "NDVI")
    ndmi_value = _rolling_median(step1, "NDMI")
    ndre_value = _rolling_median(step1, "NDRE")

    ndvi_ref = step3.global_percentiles.get("NDVI")
    ndmi_ref = step3.global_percentiles.get("NDMI")
    ndre_ref = step3.global_percentiles.get("NDRE")

    vigor = 50.0
    if ndvi_ref and ndvi_ref.p90 > ndvi_ref.p10:
        vigor = ((ndvi_value - ndvi_ref.p10) / (ndvi_ref.p90 - ndvi_ref.p10)) * 100
    vigor = _clamp(vigor)

    temporal = _temporal_homogeneity(step3)
    spatial = _spatial_heterogeneity(step7)

    anomaly_count = len(step5.anomalies)
    stability = _clamp(100 - anomaly_count * 8)

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

    # Weights: vigor 30%, temporal 10%, spatial 10%, stability 15%, hydric 20%, nutritional 15%
    # Previously temporal_stability was 20% (temporal only, spatial ignored).
    # Now split: 10% temporal + 10% spatial = same total weight for homogeneity.
    total = (
        vigor * 0.30
        + temporal * 0.10
        + spatial * 0.10
        + stability * 0.15
        + hydric * 0.20
        + nutritional * 0.15
    )

    return Step8Output(
        health_score=HealthScore(
            total=round(_clamp(total), 4),
            components={
                "vigor": round(vigor, 4),
                "temporal_stability": round(temporal, 4),
                "spatial_heterogeneity": round(spatial, 4),
                "stability": round(stability, 4),
                "hydric": round(hydric, 4),
                "nutritional": round(nutritional, 4),
            },
        )
    )
