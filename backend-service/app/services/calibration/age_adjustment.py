from __future__ import annotations

from datetime import datetime
from typing import Any, cast

from .referential_utils import (
    DEFAULT_MATURITY_PHASE_BOUNDARIES,
    get_phase_boundaries_from_reference,
    iter_yield_curve_age_brackets,
)
from .types import MaturityPhase

YieldValue = float | int | str | list[float] | tuple[float, float]

# Back-compat alias for tests and callers
DEFAULT_PHASE_BOUNDARIES = DEFAULT_MATURITY_PHASE_BOUNDARIES

DEFAULT_INDEX_MULTIPLIERS = {
    "NDVI": 1.0,
    "NIRv": 1.0,
    "NDMI": 1.0,
    "NDRE": 1.0,
    "EVI": 1.0,
    "MSAVI2": 1.0,
    "MSAVI": 1.0,
    "MSI": 1.0,
    "GCI": 1.0,
    "OSAVI": 1.0,
    "SAVI": 1.0,
    "MNDWI": 1.0,
    "MCARI": 1.0,
    "TCARI": 1.0,
    "TCARI_OSAVI": 1.0,
}


def _lookup_variety_yield_curve(
    reference_data: dict[str, object], variety: str | None
) -> dict[str, YieldValue]:
    """Look up yield-by-age curve for the parcel's variety from the crop referential.

    The variety comes from the parcel (calibration_input.variety) and must match
    a variete in reference_data.varietes by nom or code (case-insensitive).
    """
    if variety is None:
        return {}

    varieties = reference_data.get("varietes")
    if not isinstance(varieties, list):
        return {}

    target = variety.strip().lower()
    for raw_item in varieties:
        if not isinstance(raw_item, dict):
            continue
        item = cast(dict[str, object], raw_item)
        name = str(item.get("nom", "")).strip().lower()
        code = str(item.get("code", "")).strip().lower()
        if name == target or code == target:
            curve = item.get("rendement_kg_arbre")
            if isinstance(curve, dict):
                typed_curve: dict[str, YieldValue] = {}
                for key, value in curve.items():
                    if isinstance(value, (int, float, str, list, tuple)):
                        typed_curve[str(key)] = cast(YieldValue, value)
                return typed_curve
    return {}


def determine_maturity_phase(
    planting_year: int | None,
    crop_type: str,
    reference_data: dict[str, object],
    variety: str | None = None,
    current_year: int | None = None,
) -> MaturityPhase:
    _ = crop_type
    if planting_year is None:
        return MaturityPhase.UNKNOWN

    resolved_year = current_year if current_year is not None else datetime.now().year
    age = max(0, resolved_year - planting_year)

    boundaries = get_phase_boundaries_from_reference(
        cast(dict[str, Any], reference_data),
    )
    yield_curve = _lookup_variety_yield_curve(reference_data, variety)
    if yield_curve:
        for start, end, value in iter_yield_curve_age_brackets(
            cast(dict[str, Any], yield_curve),
            boundaries,
        ):
            if age < start or age >= end:
                continue
            if isinstance(value, str) and value in {"declin", "arrachage"}:
                return MaturityPhase.SENESCENCE

    for phase, (start, end) in sorted(
        boundaries.items(),
        key=lambda kv: kv[1][0],
    ):
        if age >= start and age < end:
            return phase

    return MaturityPhase.SENESCENCE


def _entree_multiplier(
    age: int,
    boundaries: dict[MaturityPhase, tuple[int, int]],
) -> float:
    start_age, end_age = boundaries[MaturityPhase.ENTREE_PRODUCTION]
    if age < start_age:
        return 0.8
    if age >= end_age:
        return 1.0
    progress = (age - start_age) / (end_age - start_age)
    return 0.8 + (0.2 * progress)


def get_threshold_adjustment(
    phase: MaturityPhase,
    planting_year: int | None = None,
    current_year: int | None = None,
    reference_data: dict[str, object] | None = None,
) -> dict[str, float]:
    boundaries = get_phase_boundaries_from_reference(
        cast(dict[str, Any], reference_data if reference_data is not None else {}),
    )
    if phase == MaturityPhase.UNKNOWN:
        return DEFAULT_INDEX_MULTIPLIERS.copy()

    if phase == MaturityPhase.JUVENILE:
        multiplier = 0.75
    elif phase == MaturityPhase.ENTREE_PRODUCTION:
        resolved_year = (
            current_year if current_year is not None else datetime.now().year
        )
        age = 0 if planting_year is None else max(0, resolved_year - planting_year)
        multiplier = _entree_multiplier(age, boundaries)
    elif phase == MaturityPhase.PLEINE_PRODUCTION:
        multiplier = 1.0
    elif phase == MaturityPhase.MATURITE_AVANCEE:
        multiplier = 0.95
    else:
        multiplier = 0.85

    return {key: value * multiplier for key, value in DEFAULT_INDEX_MULTIPLIERS.items()}
