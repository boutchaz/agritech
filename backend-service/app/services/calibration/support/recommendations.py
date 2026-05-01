from __future__ import annotations

from typing import Any, Literal

from ..types import MaturityPhase, Recommendation, Step2Output, Step5Output, Step8Output


def _severity_from_score(score: float) -> Literal["low", "medium", "high"]:
    if score < 25:
        return "high"
    if score < 50:
        return "medium"
    return "low"


def _to_float(data: dict[str, Any] | None, key: str) -> float | None:
    if not data:
        return None
    val = data.get(key)
    if isinstance(val, (int, float)):
        return float(val)
    return None


def _soil_recommendations(soil: dict[str, Any] | None) -> list[Recommendation]:
    if not soil:
        return []
    recs: list[Recommendation] = []
    ph = _to_float(soil, "ph_level")
    om = _to_float(soil, "organic_matter_percentage")
    ec = _to_float(soil, "electrical_conductivity")

    if ph is not None and ph > 8.2:
        recs.append(
            Recommendation(
                type="soil_nutrition",
                severity="high" if ph > 8.5 else "medium",
                message=f"Soil pH is high ({ph:.1f}). Consider acidifying amendments or gypsum application to improve nutrient availability.",
                component="nutritional",
            )
        )
    if ph is not None and ph < 5.5:
        recs.append(
            Recommendation(
                type="soil_nutrition",
                severity="medium",
                message=f"Soil pH is low ({ph:.1f}). Consider liming to raise pH and improve nutrient uptake.",
                component="nutritional",
            )
        )
    if om is not None and om < 1.0:
        recs.append(
            Recommendation(
                type="soil_nutrition",
                severity="medium",
                message=f"Low organic matter ({om:.1f}%). Apply compost or organic amendments to improve soil structure and fertility.",
                component="nutritional",
            )
        )
    if ec is not None and ec > 4.0:
        recs.append(
            Recommendation(
                type="soil_nutrition",
                severity="high",
                message=f"High soil salinity (EC={ec:.1f}). Consider leaching irrigation and salt-tolerant rootstocks.",
                component="nutritional",
            )
        )
    return recs


def _water_recommendations(water: dict[str, Any] | None) -> list[Recommendation]:
    if not water:
        return []
    recs: list[Recommendation] = []
    sar = _to_float(water, "sar")
    chloride = _to_float(water, "chloride_ppm")
    ec = _to_float(water, "ec_ds_per_m")

    if sar is not None and sar > 6.0:
        recs.append(
            Recommendation(
                type="water_quality",
                severity="high" if sar > 9.0 else "medium",
                message=f"Irrigation water SAR is high ({sar:.1f}). Risk of soil infiltration problems. Consider gypsum amendments or alternate water source.",
                component="hydric",
            )
        )
    if chloride is not None and chloride > 10.0:
        recs.append(
            Recommendation(
                type="water_quality",
                severity="medium",
                message=f"High chloride levels in irrigation water ({chloride:.0f} ppm). Risk of toxicity. Monitor leaf symptoms.",
                component="hydric",
            )
        )
    if ec is not None and ec > 3.0:
        recs.append(
            Recommendation(
                type="water_quality",
                severity="medium",
                message=f"Irrigation water salinity is elevated (EC={ec:.1f} dS/m). Consider mixing with fresher water if available.",
                component="hydric",
            )
        )
    return recs


def _cultural_recommendations(
    cultural: dict[str, Any] | None,
    maturity_phase: MaturityPhase,
) -> list[Recommendation]:
    if not cultural:
        return []
    recs: list[Recommendation] = []
    pruning = cultural.get("pruning_type")
    fert = cultural.get("past_fertilization")
    stress = cultural.get("stress_events")

    mature_phases = {MaturityPhase.PLEINE_PRODUCTION, MaturityPhase.MATURITE_AVANCEE}
    if pruning is None and maturity_phase in mature_phases:
        recs.append(
            Recommendation(
                type="cultural_practice",
                severity="medium",
                message="No pruning recorded for mature trees. Regular pruning is essential for maintaining yield and tree health.",
                component=None,
            )
        )
    if fert is not None and str(fert).lower() in ("no", "non", "none"):
        recs.append(
            Recommendation(
                type="cultural_practice",
                severity="high",
                message="No fertilization program in place. Implement a fertilization plan based on soil and leaf analysis.",
                component="nutritional",
            )
        )
    if stress and isinstance(stress, list) and len(stress) > 0:
        recs.append(
            Recommendation(
                type="cultural_practice",
                severity="low",
                message=f"{len(stress)} stress event(s) reported. Monitor for recurring patterns and develop resilience strategies.",
                component=None,
            )
        )
    return recs


def _foliar_recommendations(foliar: dict[str, Any] | None) -> list[Recommendation]:
    if not foliar:
        return []
    recs: list[Recommendation] = []
    n = _to_float(foliar, "nitrogen_percentage")
    p = _to_float(foliar, "phosphorus_percentage")
    k = _to_float(foliar, "potassium_percentage")

    if n is not None and n < 1.5:
        recs.append(
            Recommendation(
                type="foliar_deficiency",
                severity="high" if n < 1.2 else "medium",
                message=f"Foliar nitrogen is low ({n:.2f}%). Consider nitrogen fertilization — foliar spray or soil application.",
                component="nutritional",
            )
        )
    if k is not None and k < 0.8:
        recs.append(
            Recommendation(
                type="foliar_deficiency",
                severity="medium",
                message=f"Foliar potassium is low ({k:.2f}%). Potassium is critical for fruit quality and drought resistance.",
                component="nutritional",
            )
        )
    if p is not None and p < 0.1:
        recs.append(
            Recommendation(
                type="foliar_deficiency",
                severity="medium",
                message=f"Foliar phosphorus is low ({p:.2f}%). Consider phosphorus supplementation.",
                component="nutritional",
            )
        )
    return recs


def generate_recommendations(
    *,
    step8: Step8Output,
    step5: Step5Output,
    step2: Step2Output,
    crop_type: str,
    maturity_phase: MaturityPhase,
    soil_analysis: dict[str, Any] | None = None,
    water_analysis: dict[str, Any] | None = None,
    foliar_analysis: dict[str, Any] | None = None,
    cultural_history: dict[str, Any] | None = None,
) -> list[Recommendation]:
    _ = (step5, crop_type)

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

    recommendations.extend(_soil_recommendations(soil_analysis))
    recommendations.extend(_water_recommendations(water_analysis))
    recommendations.extend(_foliar_recommendations(foliar_analysis))
    recommendations.extend(_cultural_recommendations(cultural_history, maturity_phase))

    return recommendations
