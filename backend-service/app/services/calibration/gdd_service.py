from __future__ import annotations

from datetime import date
from typing import Any


# De Melo-Abreu (2004) parameters for olive; standard values for other crops.
TBASE_BY_CROP: dict[str, float] = {
    "olivier": 7.5,
    "agrumes": 13.0,
    "avocatier": 10.0,
    "palmier_dattier": 18.0,
}

TUPPER_BY_CROP: dict[str, float] = {
    "olivier": 30.0,
    "agrumes": 36.0,
    "avocatier": 33.0,
    "palmier_dattier": 45.0,
}

# Fallback chill-hour threshold when no variety-specific value is provided.
CHILL_THRESHOLD_DEFAULT: dict[str, int] = {
    "olivier": 150,
}

# Chill accumulation only during dormancy months (November–February).
_CHILL_MONTHS = {11, 12, 1, 2}

# Month that resets the chill accumulator for a new season.
_CHILL_SEASON_RESET_MONTH = 11


def compute_daily_gdd(
    temp_max: float,
    temp_min: float,
    tbase: float,
    tupper: float | None = None,
) -> float:
    """GDD with optional upper-temperature cap (De Melo-Abreu)."""
    tmoy = (temp_max + temp_min) / 2.0
    if tupper is not None:
        tmoy = min(tmoy, tupper)
    return max(0.0, tmoy - tbase)


def estimate_chill_hours(temp_max: float, temp_min: float) -> float:
    """Estimate daily chill-hour contribution (T < 7.2 C window)."""
    if temp_min >= 7.2:
        return 0.0
    if temp_max <= 0:
        return 0.0
    return min(12.0, max(0.0, (7.2 - temp_min) * 1.5))


def _parse_row_date(row: dict[str, Any]) -> date | None:
    raw = row.get("date")
    if raw is None:
        return None
    if isinstance(raw, date):
        return raw
    try:
        return date.fromisoformat(str(raw)[:10])
    except (ValueError, TypeError):
        return None


def _build_nirv_lookup(nirv_series: list[dict[str, Any]]) -> dict[str, float]:
    """Build a date-string → NIRv value lookup from the series."""
    lookup: dict[str, float] = {}
    for entry in nirv_series:
        d = entry.get("date")
        v = entry.get("value")
        if d is not None and v is not None:
            try:
                lookup[str(d)[:10]] = float(v)
            except (ValueError, TypeError):
                continue
    return lookup


def _compute_nirv_baseline(
    nirv_lookup: dict[str, float],
    rows: list[dict[str, Any]],
) -> float | None:
    """Compute winter NIRv baseline (mean of Dec-Jan values)."""
    winter_values: list[float] = []
    for row in rows:
        d = _parse_row_date(row)
        if d is None:
            continue
        if d.month in (12, 1):
            v = nirv_lookup.get(d.isoformat())
            if v is not None:
                winter_values.append(v)
    if not winter_values:
        return None
    return sum(winter_values) / len(winter_values)


def compute_olive_gdd_two_phase(
    rows: list[dict[str, Any]],
    chill_threshold: int,
    nirv_series: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """De Melo-Abreu (2004) two-phase chill-heating model for olive.

    Phase 1 — Chill accumulation: chill hours accumulate during dormancy
    months (Nov–Feb) until the variety-specific *chill_threshold* is met.

    Phase 2 — GDD accumulation: daily GDD (Tbase=7.5, Tupper=30) accrues
    only when **both** conditions are satisfied:
      1. Tmoy > Tbase (7.5 C)
      2. NIRv shows ≥ 20 % rise above winter baseline (or NIRv unavailable
         for that date → temperature-only fallback).

    The chill accumulator resets every November (new dormancy cycle).
    """
    tbase = TBASE_BY_CROP["olivier"]
    tupper = TUPPER_BY_CROP["olivier"]
    nirv_lookup = _build_nirv_lookup(nirv_series)
    nirv_baseline = _compute_nirv_baseline(nirv_lookup, rows)

    cumulative_chill = 0.0
    chill_satisfied = False
    result: list[dict[str, Any]] = []

    for row in rows:
        copied = dict(row)
        d = _parse_row_date(copied)

        tmax = float(copied.get("temperature_max") or copied.get("temp_max") or 0.0)
        tmin = float(copied.get("temperature_min") or copied.get("temp_min") or 0.0)

        # Always compute chill hours for the record.
        ch = estimate_chill_hours(tmax, tmin)
        copied["chill_hours"] = round(ch, 4)

        # Season reset in November.
        if d is not None and d.month == _CHILL_SEASON_RESET_MONTH and d.day <= 7:
            cumulative_chill = 0.0
            chill_satisfied = False

        # Phase 1 — accumulate chill during dormancy months.
        if d is not None and d.month in _CHILL_MONTHS:
            cumulative_chill += ch

        if not chill_satisfied and cumulative_chill >= chill_threshold:
            chill_satisfied = True

        # Phase 2 — GDD gated by chill satisfaction + NIRv condition.
        if chill_satisfied:
            tmoy = (tmax + tmin) / 2.0
            temp_ok = tmoy > tbase

            # NIRv gate: ≥ 20 % rise above winter baseline.
            nirv_ok = True  # fallback when no NIRv data
            if nirv_baseline is not None and d is not None:
                nirv_val = nirv_lookup.get(d.isoformat())
                if nirv_val is not None:
                    nirv_ok = nirv_val >= nirv_baseline * 1.20

            if temp_ok and nirv_ok:
                copied["gdd_olivier"] = round(
                    compute_daily_gdd(tmax, tmin, tbase, tupper), 4
                )
            else:
                copied["gdd_olivier"] = 0.0
        else:
            copied["gdd_olivier"] = 0.0

        result.append(copied)

    return result


def precompute_gdd_rows(
    rows: list[dict[str, Any]],
    crop_type: str,
    *,
    variety: str | None = None,
    chill_threshold: int | None = None,
    nirv_series: list[dict[str, Any]] | None = None,
) -> tuple[list[dict[str, Any]], int]:
    if crop_type not in TBASE_BY_CROP:
        return rows, 0

    # --- Olive: two-phase De Melo-Abreu model ---
    if crop_type == "olivier":
        threshold = chill_threshold or CHILL_THRESHOLD_DEFAULT.get("olivier", 150)
        result = compute_olive_gdd_two_phase(
            rows,
            chill_threshold=threshold,
            nirv_series=nirv_series or [],
        )
        updated = sum(
            1
            for orig, new in zip(rows, result)
            if orig.get("gdd_olivier") is None and new.get("gdd_olivier") is not None
        )
        return result, updated

    # --- Other crops: simple GDD with Tupper cap ---
    tbase = TBASE_BY_CROP[crop_type]
    tupper = TUPPER_BY_CROP.get(crop_type)
    column = f"gdd_{crop_type}"
    updated = 0
    result_rows: list[dict[str, Any]] = []

    for row in rows:
        copied = dict(row)
        current_value = copied.get(column)
        if current_value is not None:
            result_rows.append(copied)
            continue

        tmax = float(copied.get("temperature_max") or copied.get("temp_max") or 0.0)
        tmin = float(copied.get("temperature_min") or copied.get("temp_min") or 0.0)

        copied[column] = round(compute_daily_gdd(tmax, tmin, tbase, tupper), 4)
        copied["chill_hours"] = round(estimate_chill_hours(tmax, tmin), 4)
        updated += 1
        result_rows.append(copied)

    return result_rows, updated


def precompute_gdd(
    latitude: float,
    longitude: float,
    crop_type: str,
    rows: list[dict[str, Any]] | None = None,
    as_of: date | None = None,
) -> int:
    _ = (latitude, longitude, as_of)
    if rows is None:
        return 0
    _, count = precompute_gdd_rows(rows, crop_type)
    return count
