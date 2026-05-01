"""Tests for ground-truth recommendations (soil/water/cultural/foliar).

Tasks 9-12: verify that analysis data and cultural history generate
appropriate recommendation types.
"""

from __future__ import annotations

from datetime import date
from importlib import import_module

rec_module = import_module("app.services.calibration.support.recommendations")
types_module = import_module("app.services.calibration.types")

generate_recommendations = getattr(rec_module, "generate_recommendations")
Recommendation = getattr(types_module, "Recommendation")
Step2Output = getattr(types_module, "Step2Output")
Step5Output = getattr(types_module, "Step5Output")
Step8Output = getattr(types_module, "Step8Output")
HealthScore = getattr(types_module, "HealthScore")
MaturityPhase = getattr(types_module, "MaturityPhase")


def _make_step2() -> Step2Output:
    return Step2Output(
        daily_weather=[],
        monthly_aggregates=[],
        cumulative_gdd={},
        chill_hours=0,
        extreme_events=[],
    )


def _make_step5() -> Step5Output:
    return Step5Output(anomalies=[], exclusion_periods=[])


def _make_step8(total: float = 80.0) -> Step8Output:
    return Step8Output(
        health_score=HealthScore(
            total=total,
            components={
                "vigor": 70.0,
                "spatial_homogeneity": 80.0,
                "temporal_stability": 60.0,
                "hydric": 65.0,
                "nutritional": 55.0,
            },
        )
    )


def test_high_ph_soil_produces_soil_nutrition_recommendation() -> None:
    recs = generate_recommendations(
        step8=_make_step8(),
        step5=_make_step5(),
        step2=_make_step2(),
        crop_type="olivier",
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
        soil_analysis={
            "ph_level": 8.8,
            "electrical_conductivity": 1.0,
            "organic_matter_percentage": 2.0,
        },
    )
    soil_recs = [r for r in recs if r.type == "soil_nutrition"]
    assert len(soil_recs) >= 1
    assert any("pH" in r.message or "alcalin" in r.message.lower() for r in soil_recs)


def test_low_om_soil_produces_soil_nutrition_recommendation() -> None:
    recs = generate_recommendations(
        step8=_make_step8(),
        step5=_make_step5(),
        step2=_make_step2(),
        crop_type="olivier",
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
        soil_analysis={"ph_level": 7.0, "organic_matter_percentage": 0.5},
    )
    soil_recs = [r for r in recs if r.type == "soil_nutrition"]
    assert len(soil_recs) >= 1


def test_high_sar_water_produces_water_quality_recommendation() -> None:
    recs = generate_recommendations(
        step8=_make_step8(),
        step5=_make_step5(),
        step2=_make_step2(),
        crop_type="olivier",
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
        water_analysis={"sar": 7.5, "chloride_ppm": 3.0},
    )
    water_recs = [r for r in recs if r.type == "water_quality"]
    assert len(water_recs) >= 1


def test_no_pruning_on_mature_trees_produces_cultural_recommendation() -> None:
    recs = generate_recommendations(
        step8=_make_step8(),
        step5=_make_step5(),
        step2=_make_step2(),
        crop_type="olivier",
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
        cultural_history={"pruning_type": None, "past_fertilization": "yes"},
    )
    cultural_recs = [r for r in recs if r.type == "cultural_practice"]
    assert len(cultural_recs) >= 1


def test_no_fertilization_produces_cultural_recommendation() -> None:
    recs = generate_recommendations(
        step8=_make_step8(),
        step5=_make_step5(),
        step2=_make_step2(),
        crop_type="olivier",
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
        cultural_history={"pruning_type": "production", "past_fertilization": "no"},
    )
    cultural_recs = [r for r in recs if r.type == "cultural_practice"]
    assert len(cultural_recs) >= 1


def test_low_foliar_nitrogen_produces_foliar_deficiency_recommendation() -> None:
    recs = generate_recommendations(
        step8=_make_step8(),
        step5=_make_step5(),
        step2=_make_step2(),
        crop_type="olivier",
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
        foliar_analysis={
            "nitrogen_percentage": 1.0,
            "potassium_percentage": 1.0,
            "phosphorus_percentage": 0.3,
        },
    )
    foliar_recs = [r for r in recs if r.type == "foliar_deficiency"]
    assert len(foliar_recs) >= 1


def test_no_ground_truth_data_no_extra_recommendations() -> None:
    recs = generate_recommendations(
        step8=_make_step8(),
        step5=_make_step5(),
        step2=_make_step2(),
        crop_type="olivier",
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
    )
    gt_types = {
        "soil_nutrition",
        "water_quality",
        "cultural_practice",
        "foliar_deficiency",
    }
    gt_recs = [r for r in recs if r.type in gt_types]
    assert len(gt_recs) == 0
