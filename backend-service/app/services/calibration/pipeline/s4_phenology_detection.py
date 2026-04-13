"""Step 4 — Phenology detection via GDD-driven state machine.

All crops use the referential state machine (``run_state_machine``).
The referential JSON drives everything: GDD formula parameters, phase
transition thresholds, cycle months, and chill requirements.
"""
from __future__ import annotations

from typing import Any

from .s4_state_machine import (
    run_state_machine,
    map_timelines_to_step4output,
)
from ..types import Step1Output, Step2Output, Step4Output


def detect_phenology(
    satellite_data: Step1Output,
    weather_data: Step2Output,
    index_key: str = "NIRv",
    crop_type: str | None = None,
    variety: str | None = None,
    planting_system: str | None = None,
    reference_data: dict[str, Any] | None = None,
    maturity_phase: str | None = None,
) -> Step4Output:
    """Detect phenological stages from satellite and weather data.

    Uses the GDD-driven state machine for all crops.  All thresholds are
    sourced from ``reference_data`` (the crop referential JSON).  When
    ``reference_data`` is absent, the state machine falls back to built-in
    olive defaults.

    Args:
        satellite_data: Step 1 output with index time series.
        weather_data: Step 2 output with daily weather and GDD.
        index_key: Preferred vegetation index (unused — kept for API compat).
        crop_type: Canonical crop type key (e.g. "olivier", "agrumes").
        variety: Variety name for variety-specific chill thresholds.
        planting_system: Planting system key (unused — kept for API compat).
        reference_data: Parsed referential JSON; all thresholds read from here.
        maturity_phase: Tree maturity phase from age_adjustment. Juvenile trees
                        use a simplified phenology (no fruiting phases).
    """
    _ = index_key, planting_system  # not used by state machine; kept for call-site compat
    observed = _filter_observed(satellite_data)
    return _run_state_machine(
        observed,
        weather_data,
        crop_type=crop_type or "olivier",
        variety=variety,
        reference_data=reference_data,
        maturity_phase=maturity_phase,
    )


def _filter_observed(satellite_data: Step1Output) -> Step1Output:
    """Return a copy of satellite_data with outlier/interpolated points removed."""
    filtered = {
        name: [p for p in points if not p.interpolated and not p.outlier]
        for name, points in satellite_data.index_time_series.items()
    }
    return satellite_data.model_copy(update={"index_time_series": filtered})


def _run_state_machine(
    satellite_data: Step1Output,
    weather_data: Step2Output,
    crop_type: str = "olivier",
    variety: str | None = None,
    reference_data: dict[str, Any] | None = None,
    maturity_phase: str | None = None,
) -> Step4Output:
    """Run the state machine for a single crop and return Step4Output."""
    weather_days = [
        {
            "date": w.date,
            "temp_min": w.temp_min,
            "temp_max": w.temp_max,
            "precip": w.precip,
        }
        for w in weather_data.daily_weather
    ]
    nirv_series = [
        {"date": p.date.isoformat(), "value": p.value}
        for p in satellite_data.index_time_series.get("NIRv", [])
    ]
    ndvi_series = [
        {"date": p.date.isoformat(), "value": p.value}
        for p in satellite_data.index_time_series.get("NDVI", [])
    ]

    timelines = run_state_machine(
        weather_days=weather_days,
        nirv_series=nirv_series,
        ndvi_series=ndvi_series,
        crop_type=crop_type,
        variety=variety,
        reference_data=reference_data,
        maturity_phase=maturity_phase,
    )
    return map_timelines_to_step4output(timelines)
