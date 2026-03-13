from __future__ import annotations

from datetime import datetime
import re
from typing import Any

from .types import MaturityPhase, Step6Output, YieldPotential


def _parse_age_bracket(key: str) -> tuple[int, int] | None:
    range_match = re.match(r"^(\d+)-(\d+)_ans$", key)
    if range_match:
        return int(range_match.group(1)), int(range_match.group(2))

    plus_match = re.match(r"^plus_(\d+)_ans$", key)
    if plus_match:
        return int(plus_match.group(1)), 200

    return None


def _extract_reference_range(value: Any) -> tuple[float, float]:
    if isinstance(value, (int, float)):
        number = float(value)
        return number, number
    if isinstance(value, (list, tuple)) and len(value) >= 2:
        first = float(value[0])
        second = float(value[1])
        return (first, second) if first <= second else (second, first)
    return 0.0, 0.0


def _historical_average(harvest_records: list[dict[str, Any]]) -> float | None:
    values: list[float] = []
    for row in harvest_records:
        value = row.get("yield_quantity") or row.get("quantity")
        if isinstance(value, (int, float)):
            values.append(float(value))
    if not values:
        return None
    return sum(values) / len(values)


def _resolve_bracket(
    age: int,
    rendement_map: dict[str, Any],
) -> tuple[str, tuple[float, float]]:
    selected_label = "unknown"
    selected_range = (0.0, 0.0)

    for key, raw_value in rendement_map.items():
        parsed = _parse_age_bracket(key)
        if not parsed:
            continue
        start, end = parsed
        if age < start or age > end:
            continue
        selected_label = key
        selected_range = _extract_reference_range(raw_value)
        break

    if selected_label == "unknown" and rendement_map:
        key = next(iter(rendement_map.keys()))
        selected_label = key
        selected_range = _extract_reference_range(rendement_map[key])

    return selected_label, selected_range


def calculate_yield_potential(
    *,
    planting_year: int | None,
    crop_type: str,
    variety: str | None,
    reference_data: dict[str, Any],
    harvest_records: list[dict[str, Any]],
    maturity_phase: MaturityPhase | None = None,
    current_year: int | None = None,
) -> Step6Output:
    _ = (crop_type, maturity_phase)

    year = current_year if current_year is not None else datetime.now().year
    age = 0 if planting_year is None else max(0, year - planting_year)

    rendement_map: dict[str, Any] = {}
    varieties = reference_data.get("varietes")
    if isinstance(varieties, list):
        normalized_variety = (variety or "").strip().lower()
        for item in varieties:
            if not isinstance(item, dict):
                continue
            name = str(item.get("nom", "")).strip().lower()
            code = str(item.get("code", "")).strip().lower()
            if normalized_variety and normalized_variety not in {name, code}:
                continue
            candidate = item.get("rendement_kg_arbre")
            if isinstance(candidate, dict):
                rendement_map = candidate
                break

    bracket, (min_ref, max_ref) = _resolve_bracket(age, rendement_map)
    historical_avg = _historical_average(harvest_records)

    min_value = min_ref
    max_value = max_ref
    method = "reference_only"

    if historical_avg is not None:
        method = "reference_and_history"
        min_value = min(min_ref, historical_avg)
        max_value = max(max_ref, historical_avg)

    yield_potential = YieldPotential(
        minimum=round(min_value, 4),
        maximum=round(max_value, 4),
        method=method,
        reference_bracket=bracket,
        historical_average=None if historical_avg is None else round(historical_avg, 4),
    )

    return Step6Output(yield_potential=yield_potential)
