from __future__ import annotations

from datetime import datetime
import re
from typing import cast

from .types import MaturityPhase


YieldValue = float | int | str | list[float] | tuple[float, float]


DEFAULT_PHASE_BOUNDARIES = {
    MaturityPhase.JUVENILE: (0, 5),
    MaturityPhase.ENTREE_PRODUCTION: (5, 10),
    MaturityPhase.PLEINE_PRODUCTION: (10, 40),
    MaturityPhase.MATURITE_AVANCEE: (40, 60),
    MaturityPhase.SENESCENCE: (60, 200),
}

DEFAULT_INDEX_MULTIPLIERS = {
    "NDVI": 1.0,
    "NIRv": 1.0,
    "NDMI": 1.0,
    "NDRE": 1.0,
    "EVI": 1.0,
    "MSAVI": 1.0,
    "MSI": 1.0,
    "GCI": 1.0,
}


def _extract_age_brackets(
    yield_by_age: dict[str, YieldValue],
) -> list[tuple[int, int, YieldValue]]:
    brackets: list[tuple[int, int, YieldValue]] = []
    for key, value in yield_by_age.items():
        range_match = re.match(r"^(\d+)-(\d+)_ans$", key)
        plus_match = re.match(r"^plus_(\d+)_ans$", key)

        if range_match:
            start = int(range_match.group(1))
            end = int(range_match.group(2))
            brackets.append((start, end, value))
            continue

        if plus_match:
            start = int(plus_match.group(1))
            brackets.append((start, 200, value))

    return sorted(brackets, key=lambda item: item[0])


def _lookup_variety_yield_curve(
    reference_data: dict[str, object], variety: str | None
) -> dict[str, YieldValue]:
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

    yield_curve = _lookup_variety_yield_curve(reference_data, variety)
    if yield_curve:
        for start, end, value in _extract_age_brackets(yield_curve):
            if age < start or age > end:
                continue
            if isinstance(value, str) and value in {"declin", "arrachage"}:
                return MaturityPhase.SENESCENCE

    boundaries = DEFAULT_PHASE_BOUNDARIES
    for phase, (start, end) in boundaries.items():
        if age >= start and age < end:
            return phase

    return MaturityPhase.SENESCENCE


def _entree_multiplier(age: int) -> float:
    start_age = DEFAULT_PHASE_BOUNDARIES[MaturityPhase.ENTREE_PRODUCTION][0]
    end_age = DEFAULT_PHASE_BOUNDARIES[MaturityPhase.ENTREE_PRODUCTION][1]
    if age <= start_age:
        return 0.8
    if age >= end_age:
        return 1.0

    progress = (age - start_age) / (end_age - start_age)
    return 0.8 + (0.2 * progress)


def get_threshold_adjustment(
    phase: MaturityPhase,
    planting_year: int | None = None,
    current_year: int | None = None,
) -> dict[str, float]:
    if phase == MaturityPhase.UNKNOWN:
        return DEFAULT_INDEX_MULTIPLIERS.copy()

    if phase == MaturityPhase.JUVENILE:
        multiplier = 0.75
    elif phase == MaturityPhase.ENTREE_PRODUCTION:
        resolved_year = (
            current_year if current_year is not None else datetime.now().year
        )
        age = 0 if planting_year is None else max(0, resolved_year - planting_year)
        multiplier = _entree_multiplier(age)
    elif phase == MaturityPhase.PLEINE_PRODUCTION:
        multiplier = 1.0
    elif phase == MaturityPhase.MATURITE_AVANCEE:
        multiplier = 0.95
    else:
        multiplier = 0.85

    return {key: value * multiplier for key, value in DEFAULT_INDEX_MULTIPLIERS.items()}
