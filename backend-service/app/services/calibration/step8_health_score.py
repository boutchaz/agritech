from __future__ import annotations

from .types import (
    HealthScore,
    Step1Output,
    Step3Output,
    Step5Output,
    Step7Output,
    Step8Output,
)


def _clamp(value: float) -> float:
    if value < 0:
        return 0.0
    if value > 100:
        return 100.0
    return value


def _latest_value(step1: Step1Output, index: str) -> float:
    points = step1.index_time_series.get(index, [])
    if not points:
        return 0.0
    return float(sorted(points, key=lambda item: item.date)[-1].value)


def calculate_health_score(
    *,
    step1: Step1Output,
    step3: Step3Output,
    step5: Step5Output,
    step7: Step7Output,
) -> Step8Output:
    ndvi_latest = _latest_value(step1, "NDVI")
    ndmi_latest = _latest_value(step1, "NDMI")
    ndre_latest = _latest_value(step1, "NDRE")

    ndvi_ref = step3.global_percentiles.get("NDVI")
    ndmi_ref = step3.global_percentiles.get("NDMI")
    ndre_ref = step3.global_percentiles.get("NDRE")

    vigor = 50.0
    if ndvi_ref and ndvi_ref.p90 > ndvi_ref.p10:
        vigor = ((ndvi_latest - ndvi_ref.p10) / (ndvi_ref.p90 - ndvi_ref.p10)) * 100
    vigor = _clamp(vigor)

    dominant_zone_pct = max(
        (item.surface_percent for item in step7.zone_summary), default=0.0
    )
    homogeneity = _clamp(100 - max(0.0, 100 - dominant_zone_pct * 1.2))

    anomaly_count = len(step5.anomalies)
    stability = _clamp(100 - anomaly_count * 8)

    hydric = 50.0
    if ndmi_ref and ndmi_ref.p90 > ndmi_ref.p10:
        hydric = ((ndmi_latest - ndmi_ref.p10) / (ndmi_ref.p90 - ndmi_ref.p10)) * 100
    hydric = _clamp(hydric)

    nutritional = 50.0
    if ndre_ref and ndre_ref.p90 > ndre_ref.p10:
        nutritional = (
            (ndre_latest - ndre_ref.p10) / (ndre_ref.p90 - ndre_ref.p10)
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
                "homogeneity": round(homogeneity, 4),
                "stability": round(stability, 4),
                "hydric": round(hydric, 4),
                "nutritional": round(nutritional, 4),
            },
        )
    )
