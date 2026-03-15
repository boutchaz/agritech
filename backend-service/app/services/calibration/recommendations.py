from __future__ import annotations

from typing import Literal

from .types import MaturityPhase, Recommendation, Step2Output, Step5Output, Step8Output


def _severity_from_score(score: float) -> Literal["low", "medium", "high"]:
    if score < 25:
        return "high"
    if score < 50:
        return "medium"
    return "low"


def generate_recommendations(
    *,
    step8: Step8Output,
    step5: Step5Output,
    step2: Step2Output,
    crop_type: str,
    maturity_phase: MaturityPhase,
) -> list[Recommendation]:
    _ = (step5, crop_type, maturity_phase)

    recommendations: list[Recommendation] = []
    components = step8.health_score.components

    vigor = components.get("vigor")
    if vigor is not None and vigor < 50:
        recommendations.append(
            Recommendation(
                type="vegetation_health",
                severity=_severity_from_score(vigor),
                message="Review vegetation health. Check for pest or disease pressure and consider canopy assessment.",
                component="vigor",
            )
        )

    temporal_stability = components.get(
        "temporal_stability", components.get("homogeneity")
    )
    if temporal_stability is not None and temporal_stability < 50:
        recommendations.append(
            Recommendation(
                type="temporal_variation",
                severity=_severity_from_score(temporal_stability),
                message="Significant variation in vegetation indices over time. Verify irrigation consistency and check for intermittent stress sources.",
                component="temporal_stability",
            )
        )

    stability = components.get("stability")
    if stability is not None and stability < 50:
        recommendations.append(
            Recommendation(
                type="stress_events",
                severity=_severity_from_score(stability),
                message="Multiple stress events detected in the analysis period. Monitor closely for recurring patterns and identify root causes.",
                component="stability",
            )
        )

    hydric = components.get("hydric")
    if hydric is not None and hydric < 50:
        recommendations.append(
            Recommendation(
                type="water_management",
                severity=_severity_from_score(hydric),
                message="Water stress indicators are below optimal range. Check irrigation schedule, delivery system, and soil moisture levels.",
                component="hydric",
            )
        )

    nutritional = components.get("nutritional")
    if nutritional is not None and nutritional < 50:
        recommendations.append(
            Recommendation(
                type="nutrition",
                severity=_severity_from_score(nutritional),
                message="Nutritional indices suggest potential deficiency. Consider soil and/or leaf tissue analysis to identify specific nutrient gaps.",
                component="nutritional",
            )
        )

    event_types = {event.event_type for event in step2.extreme_events}

    if "late_frost" in event_types:
        recommendations.append(
            Recommendation(
                type="frost_protection",
                severity="medium",
                message="Late frost events detected. Consider frost protection measures for sensitive growth stages.",
                component=None,
            )
        )

    if "heatwave" in event_types:
        recommendations.append(
            Recommendation(
                type="heat_management",
                severity="medium",
                message="Heatwave events recorded. Consider shade nets, increased irrigation frequency, or kaolin spray applications.",
                component=None,
            )
        )

    if "prolonged_drought" in event_types:
        recommendations.append(
            Recommendation(
                type="drought_response",
                severity="medium",
                message="Extended dry period detected. Review water reserves and consider deficit irrigation strategies.",
                component=None,
            )
        )

    return recommendations
