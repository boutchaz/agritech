from __future__ import annotations

from datetime import datetime
import re
from typing import Any

from .types import (
    AlternanceInfo,
    MaturityPhase,
    Step1Output,
    Step6Output,
    YieldPotential,
)


def _parse_age_bracket(key: str) -> tuple[int, int] | None:
    # Format: "0-5_ans" or "5-10_ans"
    range_match = re.match(r"^(\d+)-(\d+)_ans$", key)
    if range_match:
        return int(range_match.group(1)), int(range_match.group(2))

    # Format: "ans_3_5" or "ans_11_20" (referentiel format)
    ans_match = re.match(r"^ans_(\d+)_(\d+)$", key)
    if ans_match:
        return int(ans_match.group(1)), int(ans_match.group(2))

    # Format: "plus_50_ans"
    plus_match = re.match(r"^plus_(\d+)_ans$", key)
    if plus_match:
        return int(plus_match.group(1)), 200

    # Format: "ans_40_plus"
    ans_plus_match = re.match(r"^ans_(\d+)_plus$", key)
    if ans_plus_match:
        return int(ans_plus_match.group(1)), 200

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


def _round_yearly_means(yearly_means: dict[int, float]) -> dict[int, float]:
    return {year: round(value, 4) for year, value in yearly_means.items()}


def _detect_olive_alternance(
    *, satellite_data: Step1Output, current_year: int
) -> AlternanceInfo:
    ndvi_points = satellite_data.index_time_series.get("NDVI", [])

    yearly_values: dict[int, list[float]] = {}
    for point in ndvi_points:
        year_values = yearly_values.setdefault(point.date.year, [])
        year_values.append(point.value)

    yearly_means: dict[int, float] = {}
    for year, values in yearly_values.items():
        if values:
            yearly_means[year] = sum(values) / len(values)

    if len(yearly_means) < 3:
        return AlternanceInfo(
            detected=False,
            current_year_type=None,
            confidence=0.0,
            yearly_means=_round_yearly_means(yearly_means),
        )

    sorted_years = sorted(yearly_means.keys())
    significant_directions: list[int] = []

    for index in range(1, len(sorted_years)):
        previous_year = sorted_years[index - 1]
        current = sorted_years[index]
        previous_mean = yearly_means[previous_year]
        current_mean = yearly_means[current]
        baseline = max(abs(previous_mean), 1e-6)
        relative_diff = abs(current_mean - previous_mean) / baseline
        if relative_diff <= 0.10:
            continue
        significant_directions.append(1 if current_mean > previous_mean else -1)

    if len(significant_directions) < 2:
        return AlternanceInfo(
            detected=False,
            current_year_type=None,
            confidence=0.0,
            yearly_means=_round_yearly_means(yearly_means),
        )

    alternating_matches = 0
    for index in range(1, len(significant_directions)):
        if significant_directions[index] == -significant_directions[index - 1]:
            alternating_matches += 1

    total_transitions = len(significant_directions) - 1
    confidence = (
        alternating_matches / total_transitions if total_transitions > 0 else 0.0
    )
    detected = confidence > 0.0 and alternating_matches == total_transitions

    current_year_type: str | None = None
    if detected:
        if current_year in yearly_means and (current_year - 1) in yearly_means:
            current_year_type = (
                "on"
                if yearly_means[current_year] >= yearly_means[current_year - 1]
                else "off"
            )
        elif sorted_years:
            latest_year = sorted_years[-1]
            if current_year > latest_year and significant_directions:
                current_year_type = "off" if significant_directions[-1] > 0 else "on"
            elif latest_year in yearly_means and (latest_year - 1) in yearly_means:
                current_year_type = (
                    "on"
                    if yearly_means[latest_year] >= yearly_means[latest_year - 1]
                    else "off"
                )

    return AlternanceInfo(
        detected=detected,
        current_year_type=current_year_type,
        confidence=round(confidence, 4),
        yearly_means=_round_yearly_means(yearly_means),
    )


def calculate_yield_potential(
    *,
    planting_year: int | None,
    crop_type: str,
    variety: str | None,
    reference_data: dict[str, Any],
    harvest_records: list[dict[str, Any]],
    maturity_phase: MaturityPhase | None = None,
    current_year: int | None = None,
    satellite_data: Step1Output | None = None,
) -> Step6Output:
    _ = (crop_type, maturity_phase)

    year = current_year if current_year is not None else datetime.now().year
    age = 0 if planting_year is None else max(0, year - planting_year)

    rendement_map: dict[str, Any] = {}
    varieties = reference_data.get("varietes")
    if isinstance(varieties, list):
        # Parcel variety (from calibration_input) is matched to referential varietes by nom or code.
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

    alternance: AlternanceInfo | None = None
    if crop_type == "olivier" and satellite_data is not None:
        alternance = _detect_olive_alternance(
            satellite_data=satellite_data,
            current_year=year,
        )
        if alternance.detected and alternance.current_year_type == "on":
            max_value = max_value * 1.3
        elif alternance.detected and alternance.current_year_type == "off":
            min_value = min_value * 0.7

    yield_potential = YieldPotential(
        minimum=round(min_value, 4),
        maximum=round(max_value, 4),
        method=method,
        reference_bracket=bracket,
        historical_average=None if historical_avg is None else round(historical_avg, 4),
    )

    return Step6Output(yield_potential=yield_potential, alternance=alternance)
