from importlib import import_module


step6_module = import_module("app.services.calibration.pipeline.s6_yield_potential")
types_module = import_module("app.services.calibration.types")

calculate_yield_potential = getattr(step6_module, "calculate_yield_potential")
MaturityPhase = getattr(types_module, "MaturityPhase")


def test_step6_uses_reference_bracket_by_age() -> None:
    output = calculate_yield_potential(
        planting_year=2000,
        crop_type="olivier",
        variety="picholine_marocaine",
        reference_data={
            "varietes": [
                {
                    "nom": "Picholine Marocaine",
                    "code": "picholine_marocaine",
                    "rendement_kg_arbre": {
                        "juvenile": [5, 12],
                        "entree_production": [15, 28],
                        "pleine_production": [35, 55],
                    },
                }
            ]
        },
        harvest_records=[],
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
        current_year=2026,
    )

    assert output.yield_potential.reference_bracket == "pleine_production"
    assert output.yield_potential.minimum == 35
    assert output.yield_potential.maximum == 55


def test_step6_combines_reference_with_history() -> None:
    output = calculate_yield_potential(
        planting_year=2000,
        crop_type="olivier",
        variety="picholine_marocaine",
        reference_data={
            "varietes": [
                {
                    "nom": "Picholine Marocaine",
                    "code": "picholine_marocaine",
                    "rendement_kg_arbre": {
                        "pleine_production": [35, 55],
                    },
                }
            ]
        },
        harvest_records=[
            {"yield_quantity": 32},
            {"yield_quantity": 40},
            {"yield_quantity": 48},
        ],
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
        current_year=2026,
    )

    assert output.yield_potential.method == "reference_and_history"
    assert output.yield_potential.historical_average == 40
    assert output.yield_potential.minimum == 35
    assert output.yield_potential.maximum == 55


def test_step6_handles_missing_reference_data() -> None:
    output = calculate_yield_potential(
        planting_year=None,
        crop_type="olivier",
        variety=None,
        reference_data={},
        harvest_records=[{"yield_quantity": 20}],
        maturity_phase=MaturityPhase.UNKNOWN,
        current_year=2026,
    )

    assert output.yield_potential.reference_bracket == "unknown"
    assert output.yield_potential.minimum == 0
    assert output.yield_potential.maximum == 20


def test_step6_uses_t_per_ha_reference_without_density_conversion() -> None:
    output = calculate_yield_potential(
        planting_year=2000,
        crop_type="agrumes",
        variety="Valencia Late",
        reference_data={
            "varietes_calibrage": [
                {
                    "code": "ORANGE_VALENCIA",
                    "nom": "Orange Valencia",
                    "aliases": ["Valencia Late", "VALENCIA"],
                    "yield_unit": "t/ha",
                    "yield_curve_key": "orange_valencia",
                }
            ],
            "rendement_t_ha": {
                "orange_valencia": {
                    "juvenile": [5, 15],
                    "entree_production": [25, 40],
                    "pleine_production": [40, 60],
                }
            },
        },
        harvest_records=[],
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
        current_year=2026,
        density_per_hectare=400,
    )

    assert output.yield_potential.reference_bracket == "pleine_production"
    assert output.yield_potential.minimum == 40
    assert output.yield_potential.maximum == 60
    assert output.yield_potential.unit == "t/ha"


def test_step6_supports_generic_reference_range_profiles() -> None:
    output = calculate_yield_potential(
        planting_year=2000,
        crop_type="palmier_dattier",
        variety="Medjool",
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
        harvest_records=[],
        maturity_phase=MaturityPhase.PLEINE_PRODUCTION,
        current_year=2026,
    )

    assert output.yield_potential.reference_bracket == "reference"
    assert output.yield_potential.minimum == 80
    assert output.yield_potential.maximum == 120
    assert output.yield_potential.unit == "kg/tree"
