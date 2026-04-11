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
