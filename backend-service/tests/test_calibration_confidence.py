from datetime import date
from importlib import import_module
from typing import Callable, Protocol, cast

confidence_module = import_module("app.services.calibration.support.confidence")

ConfidenceInput = cast(type, getattr(confidence_module, "ConfidenceInput"))
calculate_confidence_score = cast(
    Callable[..., object], getattr(confidence_module, "calculate_confidence_score")
)


class ConfidenceResult(Protocol):
    total_score: float
    normalized_score: float
    components: dict[str, float]


def test_confidence_score_with_full_data_is_100() -> None:
    input_data = ConfidenceInput(
        satellite_months=40,
        soil_analysis_date=date(2025, 8, 1),
        soil_fields={
            "ph_level": 7.1,
            "electrical_conductivity": 1.2,
            "organic_matter_percentage": 2.8,
            "nitrogen_ppm": 28,
            "phosphorus_ppm": 18,
            "potassium_ppm": 220,
        },
        water_analysis_date=date(2025, 9, 15),
        water_fields={
            "ph_level": 7.3,
            "ec_ds_per_m": 1.0,
            "sar": 2.4,
            "chloride_ppm": 90,
            "sodium_ppm": 50,
        },
        yield_years=6,
        crop_type="olivier",
        variety="picholine_marocaine",
        planting_year=2000,
        planting_system="intensif",
        has_boundary=True,
        coherence_level="none",
        as_of=date(2026, 3, 1),
    )

    result = cast(ConfidenceResult, calculate_confidence_score(input_data))

    assert result.total_score == 100
    assert result.normalized_score == 1.0
    assert result.components == {
        "satellite": 30,
        "soil": 20,
        "water": 15,
        "yield": 20,
        "profile": 10,
        "coherence": 5,
    }


def test_confidence_score_with_minimal_data_is_low_but_non_zero() -> None:
    input_data = ConfidenceInput(
        satellite_months=8,
        soil_analysis_date=None,
        water_analysis_date=None,
        yield_years=0,
        crop_type="olivier",
        variety=None,
        planting_year=None,
        planting_system=None,
        has_boundary=False,
        coherence_level="none",
        as_of=date(2026, 3, 1),
    )

    result = cast(ConfidenceResult, calculate_confidence_score(input_data))

    assert result.total_score == 12
    assert result.components["satellite"] == 5
    assert result.components["soil"] == 0
    assert result.components["water"] == 0
    assert result.components["yield"] == 0
    assert result.components["profile"] == 2
    assert result.components["coherence"] == 5


def test_confidence_component_sum_matches_total() -> None:
    input_data = ConfidenceInput(
        satellite_months=24,
        soil_analysis_date=date(2023, 1, 10),
        soil_fields={
            "ph_level": 6.8,
            "nitrogen_ppm": 20,
        },
        water_analysis_date=date(2025, 1, 10),
        water_fields={
            "ph_level": 7.2,
            "ec_ds_per_m": 1.1,
        },
        yield_years=2,
        crop_type="agrumes",
        variety="clementine",
        planting_year=2018,
        planting_system="traditionnel",
        has_boundary=True,
        coherence_level="minor",
        as_of=date(2026, 3, 1),
    )

    result = cast(ConfidenceResult, calculate_confidence_score(input_data))
    component_sum = sum(result.components.values())

    assert component_sum == result.total_score
    assert round(result.normalized_score, 4) == round(result.total_score / 100, 4)
