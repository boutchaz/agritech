from __future__ import annotations

from datetime import datetime
from typing import Any

from ..referential_utils import (
    get_phase_boundaries_from_reference,
    get_variety_yield_profile,
    span_for_rendement_key,
)
from ..types import (
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
    has_age_scoped_entries = False

    for key, raw_value in rendement_map.items():
        span = span_for_rendement_key(str(key), boundaries)
        if span is None:
            continue
        has_age_scoped_entries = True
        lo, hi = span
        if age < lo or age >= hi:
            continue
        width = hi - lo
        pair = _extract_reference_range(raw_value)
        if best is None or width < best[2]:
            best = (key, pair, width)

    if best is not None:
        return best[0], best[1]

    if has_age_scoped_entries:
        return "unknown", (0.0, 0.0)

    if rendement_map:
        key = next(iter(rendement_map.keys()))
        return key, _extract_reference_range(rendement_map[key])

    return "unknown", (0.0, 0.0)


def _round_yearly_means(yearly_means: dict[int, float]) -> dict[int, float]:
    return {year: round(value, 4) for year, value in yearly_means.items()}


def _detect_alternance(
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
    harvest_regularity: str | None = None,
) -> Step6Output:
    _ = (crop_type, maturity_phase)

    year = current_year if current_year is not None else datetime.now().year
    age = 0 if planting_year is None else max(0, year - planting_year)

    profile = get_variety_yield_profile(reference_data, variety)
    rendement_map = profile.yield_curve if profile is not None else {}
    reference_unit = profile.yield_unit if profile is not None else "kg/tree"

    bracket, (min_ref, max_ref) = _resolve_bracket(age, rendement_map, reference_data)
    historical_avg = _historical_average(harvest_records)

    has_density = (density_per_hectare is not None and density_per_hectare > 0) or (
        plant_count and area_hectares and area_hectares > 0
    )

    if reference_unit == "t/ha":
        convert = lambda v: v
        output_unit = "t/ha"
    else:
        convert = lambda v: _kg_per_tree_to_t_per_ha(
            v,
            density_per_hectare=density_per_hectare,
            plant_count=plant_count,
            area_hectares=area_hectares,
        )
        output_unit = "t/ha" if has_density else "kg/tree"

    min_value = convert(min_ref)
    max_value = convert(max_ref)
    method = "reference_only"

    if historical_avg is not None:
        method = "reference_and_history"
        min_value = min(min_value, convert(historical_avg))
        max_value = max(max_value, convert(historical_avg))

    alternance: AlternanceInfo | None = None
    if satellite_data is not None:
        alternance = _detect_alternance(
            satellite_data=satellite_data,
            current_year=year,
        )
        if alternance.detected and alternance.current_year_type == "on":
            max_value = max_value * 1.3
        elif alternance.detected and alternance.current_year_type == "off":
            min_value = min_value * 0.7

    if harvest_regularity == "marked_alternance":
        center = (min_value + max_value) / 2
        half_range = (max_value - min_value) / 2
        half_range *= 1.20
        min_value = center - half_range
        max_value = center + half_range
    elif harvest_regularity == "very_irregular":
        center = (min_value + max_value) / 2
        half_range = (max_value - min_value) / 2
        half_range *= 1.30
        min_value = center - half_range
        max_value = center + half_range
    elif harvest_regularity == "stable":
        center = (min_value + max_value) / 2
        half_range = (max_value - min_value) / 2
        half_range *= 0.90
        min_value = center - half_range
        max_value = center + half_range

    yield_potential = YieldPotential(
        minimum=round(min_value, 4),
        maximum=round(max_value, 4),
        method=method,
        reference_bracket=bracket,
        historical_average=(
            None if historical_avg is None else round(convert(historical_avg), 4)
        ),
        unit=output_unit,
    )

    return Step6Output(yield_potential=yield_potential, alternance=alternance)
