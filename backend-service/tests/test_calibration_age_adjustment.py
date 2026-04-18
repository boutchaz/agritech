from importlib import import_module
from typing import Callable, cast

age_adjustment_module = import_module("app.services.calibration.support.age_adjustment")

determine_maturity_phase = cast(
    Callable[..., object], getattr(age_adjustment_module, "determine_maturity_phase")
)
get_threshold_adjustment = cast(
    Callable[..., dict[str, float]],
    getattr(age_adjustment_module, "get_threshold_adjustment"),
)


def test_25_year_old_picholine_is_pleine_production() -> None:
    reference_data = {
        "varietes": [
            {
                "nom": "Picholine Marocaine",
                "code": "picholine_marocaine",
                "rendement_kg_arbre": {
                    "juvenile": [5, 12],
                    "entree_production": [15, 28],
                    "pleine_production": [28, 45],
                    "maturite_avancee": [35, 55],
                    "senescence": [20, 30],
                },
            }
        ]
    }

    phase = determine_maturity_phase(
        planting_year=2001,
        crop_type="olivier",
        reference_data=reference_data,
        variety="picholine_marocaine",
        current_year=2026,
    )

    assert getattr(phase, "value") == "pleine_production"
    adjustment = get_threshold_adjustment(phase)
    assert adjustment["NDVI"] == 1.0


def test_3_year_old_is_juvenile() -> None:
    phase = determine_maturity_phase(
        planting_year=2023,
        crop_type="agrumes",
        reference_data={},
        current_year=2026,
    )

    assert getattr(phase, "value") == "juvenile"
    adjustment = get_threshold_adjustment(phase)
    assert 0.7 <= adjustment["NDVI"] <= 0.8


def test_arbosana_declin_classified_as_senescence() -> None:
    reference_data = {
        "varietes": [
            {
                "nom": "Arbosana",
                "code": "arbosana",
                "rendement_kg_arbre": {
                    "juvenile": [8, 16],
                    "entree_production": [18, 30],
                    "pleine_production": [25, 40],
                    "maturite_avancee": "declin",
                    "senescence": [22, 34],
                },
            }
        ]
    }

    phase = determine_maturity_phase(
        planting_year=1976,
        crop_type="olivier",
        reference_data=reference_data,
        variety="arbosana",
        current_year=2026,
    )

    assert getattr(phase, "value") == "senescence"
    adjustment = get_threshold_adjustment(phase)
    assert 0.8 <= adjustment["NDVI"] <= 0.9


def test_missing_planting_year_is_unknown_with_neutral_multiplier() -> None:
    phase = determine_maturity_phase(
        planting_year=None,
        crop_type="avocatier",
        reference_data={},
        current_year=2026,
    )

    assert getattr(phase, "value") == "unknown"
    adjustment = get_threshold_adjustment(phase)
    assert adjustment["NDVI"] == 1.0


def test_generic_reference_range_does_not_override_age_phase_logic() -> None:
    phase = determine_maturity_phase(
        planting_year=2023,
        crop_type="palmier_dattier",
        reference_data={
            "varietes_calibrage": [
                {
                    "code": "MEJHOUL",
                    "nom": "Mejhoul",
                    "aliases": ["Medjool"],
                    "yield_unit": "kg/tree",
                    "reference_range_kg_arbre": [80, 120],
                }
            ]
        },
        variety="Medjool",
        current_year=2026,
    )

    assert getattr(phase, "value") == "juvenile"
