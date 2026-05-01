"""Tests for ground-truth data integration into confidence scoring.

Task 3: Soil analysis content scoring (field completeness, not just date)
Task 4: Water analysis content scoring
Task 5: Foliar analysis confidence component
Task 6: Cultural history boosts profile score
"""

from __future__ import annotations

from datetime import date, timedelta
from importlib import import_module

confidence_module = import_module("app.services.calibration.support.confidence")

calculate_confidence_score = getattr(confidence_module, "calculate_confidence_score")
ConfidenceInput = getattr(confidence_module, "ConfidenceInput")

TODAY = date.today()
RECENT = TODAY - timedelta(days=180)
OLD = TODAY - timedelta(days=800)


def test_soil_complete_fields_recent_date_scores_full() -> None:
    """Complete soil analysis (all 6 required fields) with recent date → 20/20."""
    inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        soil_analysis_date=RECENT,
        soil_fields={
            "ph_level": 7.2,
            "electrical_conductivity": 1.8,
            "organic_matter_percentage": 2.5,
            "nitrogen_ppm": 45,
            "phosphorus_ppm": 32,
            "potassium_ppm": 280,
        },
    )
    result = calculate_confidence_score(inp)
    assert result.components["soil"] == 20.0


def test_soil_partial_fields_recent_date_scores_partial() -> None:
    """Partial soil analysis (2/6 fields) with recent date → between 0 and 20."""
    inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        soil_analysis_date=RECENT,
        soil_fields={
            "ph_level": 7.2,
            "electrical_conductivity": 1.8,
        },
    )
    result = calculate_confidence_score(inp)
    assert 0 < result.components["soil"] < 20.0


def test_soil_empty_fields_with_date_scores_zero() -> None:
    """Soil analysis date but empty fields dict → 0 (no useful data)."""
    inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        soil_analysis_date=RECENT,
        soil_fields={},
    )
    result = calculate_confidence_score(inp)
    assert result.components["soil"] == 0.0


def test_soil_no_date_scores_zero() -> None:
    """No soil analysis date → 0 regardless of fields."""
    inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        soil_fields={"ph_level": 7.2},
    )
    result = calculate_confidence_score(inp)
    assert result.components["soil"] == 0.0


def test_soil_old_date_caps_score() -> None:
    """Old soil analysis (>2 years) caps the score even with complete fields."""
    inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        soil_analysis_date=OLD,
        soil_fields={
            "ph_level": 7.2,
            "electrical_conductivity": 1.8,
            "organic_matter_percentage": 2.5,
            "nitrogen_ppm": 45,
            "phosphorus_ppm": 32,
            "potassium_ppm": 280,
        },
    )
    result = calculate_confidence_score(inp)
    assert result.components["soil"] == 10.0


def test_water_complete_fields_recent_date_scores_full() -> None:
    """Complete water analysis (all 5 required fields) with recent date → 15/15."""
    inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        water_analysis_date=RECENT,
        water_fields={
            "ph_level": 7.0,
            "ec_ds_per_m": 1.5,
            "sar": 3.0,
            "chloride_ppm": 5.0,
            "sodium_ppm": 4.0,
        },
    )
    result = calculate_confidence_score(inp)
    assert result.components["water"] == 15.0


def test_water_partial_fields_recent_date_scores_partial() -> None:
    """Partial water analysis (2/5 fields) with recent date → between 0 and 15."""
    inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        water_analysis_date=RECENT,
        water_fields={
            "ph_level": 7.0,
            "ec_ds_per_m": 1.5,
        },
    )
    result = calculate_confidence_score(inp)
    assert 0 < result.components["water"] < 15.0


def test_water_empty_fields_with_date_scores_zero() -> None:
    """Water analysis date but empty fields → 0."""
    inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        water_analysis_date=RECENT,
        water_fields={},
    )
    result = calculate_confidence_score(inp)
    assert result.components["water"] == 0.0


def test_water_no_date_scores_zero() -> None:
    """No water analysis date → 0."""
    inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        water_fields={"ph_level": 7.0},
    )
    result = calculate_confidence_score(inp)
    assert result.components["water"] == 0.0


def test_foliar_complete_produces_component() -> None:
    """Foliar analysis with required fields produces a 'foliar' component > 0."""
    inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        foliar_analysis_date=RECENT,
        foliar_fields={
            "nitrogen_percentage": 2.1,
            "phosphorus_percentage": 0.3,
            "potassium_percentage": 1.2,
        },
    )
    result = calculate_confidence_score(inp)
    assert "foliar" in result.components
    assert result.components["foliar"] > 0


def test_foliar_no_date_scores_zero() -> None:
    """No foliar analysis date → foliar component = 0."""
    inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        foliar_fields={"nitrogen_percentage": 2.1},
    )
    result = calculate_confidence_score(inp)
    assert result.components.get("foliar", 0) == 0


def test_foliar_max_score_is_5() -> None:
    """Complete foliar analysis with recent date scores 5/5."""
    inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        foliar_analysis_date=RECENT,
        foliar_fields={
            "nitrogen_percentage": 2.1,
            "phosphorus_percentage": 0.3,
            "potassium_percentage": 1.2,
        },
    )
    result = calculate_confidence_score(inp)
    assert result.components["foliar"] == 5.0


def test_profile_with_cultural_history_higher_than_without() -> None:
    """Profile score with cultural history data > profile score without."""
    base_inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        crop_type="olivier",
        variety="Arbequina",
        has_boundary=True,
        cultural_history=None,
    )
    cultural_inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        crop_type="olivier",
        variety="Arbequina",
        has_boundary=True,
        cultural_history={
            "pruning_type": "production",
            "past_fertilization": "yes",
            "stress_events": [{"type": "drought", "year": 2024}],
        },
    )
    base_result = calculate_confidence_score(base_inp)
    cultural_result = calculate_confidence_score(cultural_inp)
    assert cultural_result.components["profile"] > base_result.components["profile"]


def test_profile_cultural_history_capped() -> None:
    """Profile score with all cultural fields doesn't exceed 10."""
    inp = ConfidenceInput(
        satellite_months=12,
        yield_years=0,
        crop_type="olivier",
        variety="Arbequina",
        planting_year=2015,
        planting_system="super_intensive",
        has_boundary=True,
        cultural_history={
            "pruning_type": "production",
            "past_fertilization": "yes",
            "stress_events": [{"type": "drought"}],
        },
    )
    result = calculate_confidence_score(inp)
    assert result.components["profile"] <= 10.0
