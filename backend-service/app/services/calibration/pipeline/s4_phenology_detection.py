"""Step 4 — Phenology detection.

Dispatches to the referential-driven state machine for crops that have a
``protocole_phenologique`` in their referential, or to the legacy
signal-based curve-fitting approach for other crops.
"""
from __future__ import annotations

from typing import Any

from ..archived.step4_legacy import detect_phenology_legacy
from .s4_state_machine import (
    run_olive_state_machine,
    map_timelines_to_step4output,
)
from ..types import Step1Output, Step2Output, Step4Output


def _has_protocole_phenologique(reference_data: dict | None) -> bool:
    """Check if the referential has a protocole_phenologique with phases."""
    if not reference_data:
        return False
    proto = reference_data.get("protocole_phenologique")
    if not isinstance(proto, dict):
        return False
    phases = proto.get("phases")
    return isinstance(phases, dict) and len(phases) > 0


def detect_phenology(
    satellite_data: Step1Output,
    weather_data: Step2Output,
    index_key: str = "NIRv",
    crop_type: str | None = None,
    variety: str | None = None,
    planting_system: str | None = None,
    reference_data: dict[str, Any] | None = None,
) -> Step4Output:
    """Detect phenological stages from satellite and weather data.

    For crops with a ``protocole_phenologique`` in their referential
    (currently olive), uses a GDD-driven state machine.  Otherwise
    falls back to the legacy signal-based approach.
    """
    if _has_protocole_phenologique(reference_data):
        return _detect_with_state_machine(
            satellite_data, weather_data,
            variety=variety,
            reference_data=reference_data,
        )

    return detect_phenology_legacy(
        satellite_data,
        weather_data,
        index_key=index_key,
        crop_type=crop_type,
        variety=variety,
        planting_system=planting_system,
        reference_data=reference_data,
    )


def _detect_with_state_machine(
    satellite_data: Step1Output,
    weather_data: Step2Output,
    variety: str | None = None,
    reference_data: dict[str, Any] | None = None,
) -> Step4Output:
    """Run the referential-driven state machine and map to Step4Output."""
    # Build weather dicts from Step2Output
    weather_days = [
        {
            "date": w.date,
            "temp_min": w.temp_min,
            "temp_max": w.temp_max,
            "precip": w.precip,
        }
        for w in weather_data.daily_weather
    ]

    # Build satellite series from Step1Output
    nirv_series = [
        {"date": p.date.isoformat(), "value": p.value}
        for p in satellite_data.index_time_series.get("NIRv", [])
    ]
    ndvi_series = [
        {"date": p.date.isoformat(), "value": p.value}
        for p in satellite_data.index_time_series.get("NDVI", [])
    ]

    timelines = run_olive_state_machine(
        weather_days=weather_days,
        nirv_series=nirv_series,
        ndvi_series=ndvi_series,
        variety=variety,
        reference_data=reference_data,
    )

    return map_timelines_to_step4output(
        timelines,
        cumulative_gdd=weather_data.cumulative_gdd,
    )
