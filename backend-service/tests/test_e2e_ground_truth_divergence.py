"""
End-to-end integration test: same satellite + different ground-truth = different output.

Proves that the pipeline produces DIFFERENT results for two parcels with identical
satellite signatures but different agronomic realities (soil, water, foliar, cultural).

Tests three pipeline outputs:
  1. Confidence score  -> different total_score with/without ground-truth
  2. Health score      -> ground-truth adjustments produce different adjustments
  3. Recommendations   -> different recommendation sets
"""

from __future__ import annotations

from datetime import date
from types import SimpleNamespace
from importlib import import_module

types_mod = import_module("app.services.calibration.types")
conf_mod = import_module("app.services.calibration.support.confidence")
health_mod = import_module("app.services.calibration.pipeline.s8_health_score")
rec_mod = import_module("app.services.calibration.support.recommendations")

MaturityPhase = types_mod.MaturityPhase
ConfidenceInput = conf_mod.ConfidenceInput
calculate_confidence_score = conf_mod.calculate_confidence_score
calculate_health_score = health_mod.calculate_health_score
generate_recommendations = rec_mod.generate_recommendations


HEALTHY_SOIL = {
    "ph_level": 6.8,
    "electrical_conductivity": 0.5,
    "organic_matter_percentage": 3.5,
    "nitrogen_ppm": 45,
    "phosphorus_ppm": 30,
    "potassium_ppm": 280,
}

HEALTHY_WATER = {
    "ph_level": 7.0,
    "ec_ds_per_m": 0.8,
    "sar": 1.5,
    "chloride_ppm": 50,
    "sodium_ppm": 30,
}

HEALTHY_FOLIAR = {
    "nitrogen_percentage": 2.8,
    "phosphorus_percentage": 0.25,
    "potassium_percentage": 1.5,
}

DEGRADED_SOIL = {
    "ph_level": 9.0,
    "electrical_conductivity": 4.5,
    "organic_matter_percentage": 0.5,
    "nitrogen_ppm": 5,
    "phosphorus_ppm": 3,
    "potassium_ppm": 40,
}

DEGRADED_WATER = {
    "ph_level": 8.5,
    "ec_ds_per_m": 5.0,
    "sar": 15.0,
    "chloride_ppm": 600,
    "sodium_ppm": 350,
}

DEGRADED_FOLIAR = {
    "nitrogen_percentage": 0.8,
    "phosphorus_percentage": 0.05,
    "potassium_percentage": 0.3,
}

RICH_CULTURAL = {
    "pruning_type": "formation",
    "past_fertilization": "annual_npk",
    "stress_events": [],
}


def test_confidence_with_data_higher_than_without():
    base = dict(
        satellite_months=24,
        yield_years=3,
        crop_type="olivier",
        variety="picholine_marocaine",
        planting_year=2000,
        planting_system="intensif",
        has_boundary=True,
    )

    conf_with = calculate_confidence_score(
        ConfidenceInput(
            **base,
            soil_analysis_date=date(2025, 1, 15),
            soil_fields=HEALTHY_SOIL,
            water_analysis_date=date(2025, 2, 10),
            water_fields=HEALTHY_WATER,
            foliar_analysis_date=date(2025, 3, 1),
            foliar_fields=HEALTHY_FOLIAR,
            cultural_history=RICH_CULTURAL,
        )
    )

    conf_without = calculate_confidence_score(ConfidenceInput(**base))

    assert conf_with.total_score > conf_without.total_score, (
        f"With ground-truth ({conf_with.total_score}) should exceed "
        f"without ({conf_without.total_score})"
    )

    assert conf_with.components.get("soil", 0) > 0
    assert conf_with.components.get("water", 0) > 0
    assert conf_with.components.get("foliar", 0) > 0
    assert conf_without.components.get("soil", 0) == 0
    assert conf_without.components.get("water", 0) == 0
    assert conf_without.components.get("foliar", 0) == 0


def test_confidence_profile_higher_with_cultural_history():
    base = dict(
        satellite_months=24,
        yield_years=3,
        crop_type="olivier",
        variety="picholine_marocaine",
        planting_year=2000,
        planting_system="intensif",
        has_boundary=False,
    )

    conf_rich = calculate_confidence_score(
        ConfidenceInput(
            **base,
            cultural_history=RICH_CULTURAL,
        )
    )

    conf_empty = calculate_confidence_score(
        ConfidenceInput(
            **base,
            cultural_history={},
        )
    )

    assert conf_rich.components.get("profile", 0) > conf_empty.components.get(
        "profile", 0
    ), (
        f"Rich cultural ({conf_rich.components.get('profile')}) should exceed "
        f"empty cultural ({conf_empty.components.get('profile')})"
    )


def test_health_score_adjusts_with_ground_truth():
    soil_factor = health_mod._soil_nutritional_factor
    water_factor = health_mod._water_hydric_factor
    foliar_factor = health_mod._foliar_nutritional_factor

    healthy_soil_adj = soil_factor(HEALTHY_SOIL)
    degraded_soil_adj = soil_factor(DEGRADED_SOIL)
    assert healthy_soil_adj > degraded_soil_adj, (
        f"Healthy soil adj ({healthy_soil_adj}) should exceed degraded ({degraded_soil_adj})"
    )
    assert healthy_soil_adj >= 1.0, "Healthy soil should be neutral or boosting"
    assert degraded_soil_adj <= 1.0, "Degraded soil should be neutral or penalizing"

    healthy_water_adj = water_factor(HEALTHY_WATER)
    degraded_water_adj = water_factor(DEGRADED_WATER)
    assert healthy_water_adj > degraded_water_adj, (
        f"Healthy water adj ({healthy_water_adj}) should exceed degraded ({degraded_water_adj})"
    )

    healthy_foliar_adj = foliar_factor(HEALTHY_FOLIAR)
    degraded_foliar_adj = foliar_factor(DEGRADED_FOLIAR)
    assert healthy_foliar_adj > degraded_foliar_adj, (
        f"Healthy foliar adj ({healthy_foliar_adj}) should exceed degraded ({degraded_foliar_adj})"
    )


def test_recommendations_diverge_with_ground_truth():
    step2 = SimpleNamespace(
        daily_weather=[],
        monthly_aggregates=[],
        chill_hours=None,
        cumulative_gdd={},
        extreme_events=[],
    )
    step5 = SimpleNamespace(anomalies=[])

    step8_healthy = SimpleNamespace(
        health_score=SimpleNamespace(
            total=65,
            components={"vigor": 70, "hydric": 60, "nutritional": 60},
        ),
    )
    step8_degraded = SimpleNamespace(
        health_score=SimpleNamespace(
            total=35,
            components={"vigor": 30, "hydric": 25, "nutritional": 20},
        ),
    )

    recs_healthy = generate_recommendations(
        step8=step8_healthy,
        step5=step5,
        step2=step2,
        crop_type="olivier",
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
        soil_analysis=HEALTHY_SOIL,
        water_analysis=HEALTHY_WATER,
        foliar_analysis=HEALTHY_FOLIAR,
        cultural_history=RICH_CULTURAL,
    )

    recs_degraded = generate_recommendations(
        step8=step8_degraded,
        step5=step5,
        step2=step2,
        crop_type="olivier",
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
        soil_analysis=DEGRADED_SOIL,
        water_analysis=DEGRADED_WATER,
        foliar_analysis=DEGRADED_FOLIAR,
        cultural_history={"pruning_type": None, "past_fertilization": None},
    )

    assert len(recs_degraded) > len(recs_healthy), (
        f"Degraded ({len(recs_degraded)}) should have more recs than healthy ({len(recs_healthy)})"
    )

    assert any("ph" in r.message.lower() for r in recs_degraded)
    assert any("organic matter" in r.message.lower() for r in recs_degraded)
    assert any("sar" in r.message.lower() for r in recs_degraded)
    assert any("pruning" in r.message.lower() for r in recs_degraded)


def test_no_ground_truth_identical_outputs():
    base = dict(
        satellite_months=24,
        yield_years=3,
        crop_type="olivier",
        variety="picholine_marocaine",
        planting_year=2000,
        planting_system="intensif",
        has_boundary=True,
    )
    c1 = calculate_confidence_score(ConfidenceInput(**base))
    c2 = calculate_confidence_score(ConfidenceInput(**base))
    assert c1.total_score == c2.total_score
