from __future__ import annotations

from statistics import median

from .types import (
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
    # Temporal CV proxy: CV=0 → 100, CV≥0.5 → 0  (spatial zones need per-pixel rasters)
    ndvi_ref = step3.global_percentiles.get("NDVI")
    if not ndvi_ref or ndvi_ref.mean == 0:
        return 50.0

    cv = ndvi_ref.std / abs(ndvi_ref.mean)
    return _clamp(100 - cv * 200)


def calculate_health_score(
    *,
    step1: Step1Output,
    step3: Step3Output,
    step5: Step5Output,
    step7: Step7Output,
) -> Step8Output:
    _ = step7

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

    homogeneity = _temporal_homogeneity(step3)

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

    total = (
        vigor * 0.30
        + homogeneity * 0.20
        + stability * 0.15
        + hydric * 0.20
        + nutritional * 0.15
    )

    return Step8Output(
        health_score=HealthScore(
            total=round(_clamp(total), 4),
            components={
                "vigor": round(vigor, 4),
                "temporal_stability": round(homogeneity, 4),
                "stability": round(stability, 4),
                "hydric": round(hydric, 4),
                "nutritional": round(nutritional, 4),
            },
        )
    )
