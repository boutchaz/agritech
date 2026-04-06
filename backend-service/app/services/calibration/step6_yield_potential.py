from __future__ import annotations

from datetime import datetime
from typing import Any

from .referential_utils import (
    get_phase_boundaries_from_reference,
    span_for_rendement_key,
)
from .types import (
    AlternanceInfo,
    MaturityPhase,
    Step1Output,
    Step6Output,
    YieldPotential,
)


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
    reference_data: dict[str, Any],
) -> tuple[str, tuple[float, float]]:
    boundaries = get_phase_boundaries_from_reference(reference_data)
    best: tuple[str, tuple[float, float], int] | None = None

    for key, raw_value in rendement_map.items():
        span = span_for_rendement_key(str(key), boundaries)
        if span is None:
            continue
        lo, hi = span
        if age < lo or age >= hi:
            continue
        width = hi - lo
        pair = _extract_reference_range(raw_value)
        if best is None or width < best[2]:
            best = (key, pair, width)

    if best is not None:
        return best[0], best[1]

    if rendement_map:
        key = next(iter(rendement_map.keys()))
        return key, _extract_reference_range(rendement_map[key])

    return "unknown", (0.0, 0.0)


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


def _kg_per_tree_to_t_per_ha(
    kg_per_tree: float,
    *,
    density_per_hectare: int | None = None,
    plant_count: int | None = None,
    area_hectares: float | None = None,
) -> float:
    density = density_per_hectare
    if density is None and plant_count and area_hectares and area_hectares > 0:
        density = int(round(plant_count / area_hectares))
    if not density or density <= 0:
        return kg_per_tree
    return kg_per_tree * density / 1000


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
    plant_count: int | None = None,
    area_hectares: float | None = None,
    density_per_hectare: int | None = None,
) -> Step6Output:
    _ = (crop_type, maturity_phase)

    year = current_year if current_year is not None else datetime.now().year
    age = 0 if planting_year is None else max(0, year - planting_year)

    rendement_map: dict[str, Any] = {}
    varieties = reference_data.get("varietes")
    if isinstance(varieties, list):
        # Parcel variety (from calibration_input) is matched to referential varietes by nom or code.
        normalized_variety = (variety or "").strip().lower()
        matched_item: dict[str, Any] | None = None
        for item in varieties:
            if not isinstance(item, dict):
                continue
            name = str(item.get("nom", "")).strip().lower()
            code = str(item.get("code", "")).strip().lower()
            if normalized_variety and normalized_variety not in {name, code}:
                continue
            matched_item = item
            break

        # Fallback: when variety doesn't match any referential entry,
        # use the first variety that has rendement_kg_arbre data.
        if matched_item is None:
            for item in varieties:
                if isinstance(item, dict) and isinstance(
                    item.get("rendement_kg_arbre"), dict
                ):
                    matched_item = item
                    break

        if matched_item is not None:
            candidate = matched_item.get("rendement_kg_arbre")
            if isinstance(candidate, dict):
                rendement_map = candidate

    bracket, (min_ref, max_ref) = _resolve_bracket(age, rendement_map, reference_data)
    historical_avg = _historical_average(harvest_records)

    convert = lambda v: _kg_per_tree_to_t_per_ha(
        v,
        density_per_hectare=density_per_hectare,
        plant_count=plant_count,
        area_hectares=area_hectares,
    )

    min_value = convert(min_ref)
    max_value = convert(max_ref)
    method = "reference_only"

    if historical_avg is not None:
        method = "reference_and_history"
        min_value = min(min_value, convert(historical_avg))
        max_value = max(max_value, convert(historical_avg))

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

    has_density = (density_per_hectare is not None and density_per_hectare > 0) or (
        plant_count and area_hectares and area_hectares > 0
    )

    yield_potential = YieldPotential(
        minimum=round(min_value, 4),
        maximum=round(max_value, 4),
        method=method,
        reference_bracket=bracket,
        historical_average=(
            None if historical_avg is None else round(convert(historical_avg), 4)
        ),
        unit="t/ha" if has_density else "kg/tree",
    )

    return Step6Output(yield_potential=yield_potential, alternance=alternance)
