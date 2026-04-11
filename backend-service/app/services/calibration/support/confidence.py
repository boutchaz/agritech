from __future__ import annotations

from datetime import date
from pydantic import BaseModel, Field


class ConfidenceInput(BaseModel):
    satellite_months: int = Field(ge=0)
    soil_analysis_date: date | None = None
    soil_fields: dict[str, float | int | str | None] = Field(default_factory=dict)
    water_analysis_date: date | None = None
    water_fields: dict[str, float | int | str | None] = Field(default_factory=dict)
    yield_years: int = Field(ge=0)
    crop_type: str | None = None
    variety: str | None = None
    planting_year: int | None = None
    planting_system: str | None = None
    irrigation_frequency: str | None = None
    volume_per_tree_liters: float | None = None
    water_source: str | None = None
    has_boundary: bool = False
    coherence_level: str = "none"
    as_of: date = Field(default_factory=date.today)


class ConfidenceOutput(BaseModel):
    total_score: float = Field(ge=0, le=110)
    normalized_score: float = Field(ge=0, le=1)
    components: dict[str, float]


SOIL_REQUIRED_FIELDS = {
    "ph_level",
    "electrical_conductivity",
    "organic_matter_percentage",
    "nitrogen_ppm",
    "phosphorus_ppm",
    "potassium_ppm",
}

WATER_REQUIRED_FIELDS = {
    "ph_level",
    "ec_ds_per_m",
    "sar",
    "chloride_ppm",
    "sodium_ppm",
}


def _satellite_score(months: int) -> float:
    if months >= 36:
        return 30
    if months >= 24:
        return 20
    if months >= 12:
        return 10
    return 5


def _analysis_completeness_score(
    fields: dict[str, float | int | str | None],
    required_fields: set[str],
    full_points: float,
    partial_points: float,
) -> float:
    if not fields:
        return 0

    present_count = 0
    for field_name in required_fields:
        value = fields.get(field_name)
        if value is not None:
            present_count += 1

    if present_count == len(required_fields):
        return full_points
    if present_count > 0:
        return partial_points
    return 0


def _soil_score(input_data: ConfidenceInput) -> float:
    if input_data.soil_analysis_date is None:
        return 0

    age_days = (input_data.as_of - input_data.soil_analysis_date).days
    if age_days > 730:
        return 10

    return _analysis_completeness_score(
        fields=input_data.soil_fields,
        required_fields=SOIL_REQUIRED_FIELDS,
        full_points=20,
        partial_points=10,
    )


def _water_score(input_data: ConfidenceInput) -> float:
    if input_data.water_analysis_date is None:
        return 0

    return _analysis_completeness_score(
        fields=input_data.water_fields,
        required_fields=WATER_REQUIRED_FIELDS,
        full_points=15,
        partial_points=8,
    )


def _yield_score(years: int) -> float:
    if years >= 5:
        return 20
    if years >= 3:
        return 15
    if years >= 1:
        return 8
    return 0


def _profile_score(input_data: ConfidenceInput) -> float:
    points = 0.0
    points += 2.0 if input_data.crop_type else 0.0
    points += 2.0 if input_data.variety else 0.0
    points += 2.0 if input_data.planting_year else 0.0
    points += 2.0 if input_data.planting_system else 0.0
    points += 2.0 if input_data.has_boundary else 0.0
    return points


def _irrigation_score(input_data: ConfidenceInput) -> float:
    fields = (
        input_data.irrigation_frequency,
        input_data.volume_per_tree_liters,
        input_data.water_source,
    )
    present_count = sum(value is not None for value in fields)

    if present_count == 3:
        return 10
    if present_count > 0:
        return 5
    return 0


def _coherence_score(level: str) -> float:
    normalized = level.strip().lower()
    if normalized in {"major", "critical"}:
        return 0
    if normalized in {"minor", "medium"}:
        return 2
    return 5


def calculate_confidence_score(input_data: ConfidenceInput) -> ConfidenceOutput:
    satellite = _satellite_score(input_data.satellite_months)
    soil = _soil_score(input_data)
    water = _water_score(input_data)
    yield_history = _yield_score(input_data.yield_years)
    profile = _profile_score(input_data)
    irrigation = _irrigation_score(input_data)
    coherence = _coherence_score(input_data.coherence_level)

    total = satellite + soil + water + yield_history + profile + irrigation + coherence
    normalized = round(total / 110, 4)

    return ConfidenceOutput(
        total_score=total,
        normalized_score=normalized,
        components={
            "satellite": satellite,
            "soil": soil,
            "water": water,
            "yield": yield_history,
            "profile": profile,
            "irrigation": irrigation,
            "coherence": coherence,
        },
    )
