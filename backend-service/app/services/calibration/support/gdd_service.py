from __future__ import annotations

import math
from datetime import date
from typing import Any

from ..referential_utils import (
    CROP_TYPE_TO_REFERENTIAL_JSON,
    FALLBACK_GDD_TBASE,
    FALLBACK_GDD_TUPPER,
    OliveStadesBbchGddContext,
    get_gdd_tbase_tupper,
    parse_olive_stades_bbch_gdd_context,
)

# Snapshot of thresholds from referential JSON (or fallbacks) at import — for callers
# that expect dicts. Prefer :func:`get_gdd_tbase_tupper` when ``reference_data`` is available.


def _snapshot_gdd_maps() -> tuple[dict[str, float], dict[str, float]]:
    tbase_map: dict[str, float] = {}
    tupper_map: dict[str, float] = {}
    for crop in CROP_TYPE_TO_REFERENTIAL_JSON:
        tb, tu = get_gdd_tbase_tupper(crop, None)
        if tb is not None:
            tbase_map[crop] = tb
        if tu is not None:
            tupper_map[crop] = tu
    return tbase_map, tupper_map


TBASE_BY_CROP, TUPPER_BY_CROP = _snapshot_gdd_maps()

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
    """GDD using referential formula: cap Tmax at plafond, floor Tmin at tbase.

    Formula: ``max(0, (min(Tmax, plafond) + max(Tmin, tbase)) / 2 - tbase)``

    This matches the olive referential (Moriondo et al. 2001) and generalizes
    to all crops by reading ``gdd.tbase_c`` and ``gdd.plafond_c`` from the
    crop's referential JSON.
    """
    capped_max = min(temp_max, tupper) if tupper is not None else temp_max
    floored_min = max(temp_min, tbase)
    return max(0.0, (capped_max + floored_min) / 2.0 - tbase)


def estimate_chill_hours(temp_max: float, temp_min: float) -> float:
    """Estimate daily chill-hour contribution (T < 7.2 °C window).

    Uses a sinusoidal model to simulate 24 hourly temperatures from
    daily min/max (min at 6 am, max at 3 pm) — same approach as the
    frontend temperature counter.
    """
    if temp_min >= 7.2:
        return 0.0
    if temp_max <= 0:
        return 0.0
    midpoint = (temp_min + temp_max) / 2.0
    amplitude = (temp_max - temp_min) / 2.0
    count = 0
    for hour in range(24):
        hourly = midpoint + amplitude * math.sin(((hour - 9) / 24) * 2 * math.pi)
        if hourly < 7.2:
            count += 1
    return float(count)


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
    baseline_months: set[int] | None = None,
) -> float | None:
    """Mean NIRv on dates whose month is in *baseline_months* (default December–January)."""
    months = baseline_months if baseline_months else {12, 1}
    samples: list[float] = []
    for row in rows:
        d = _parse_row_date(row)
        if d is None:
            continue
        if d.month in months:
            v = nirv_lookup.get(d.isoformat())
            if v is not None:
                samples.append(v)
    if not samples:
        return None
    return sum(samples) / len(samples)


def compute_olive_gdd_two_phase(
    rows: list[dict[str, Any]],
    chill_threshold: int,
    nirv_series: list[dict[str, Any]],
    *,
    reference_data: dict[str, Any] | None = None,
    tbase: float | None = None,
    tupper: float | None = None,
    gdd_column: str = "gdd_olivier",
) -> list[dict[str, Any]]:
    """De Melo-Abreu (2004) two-phase chill-heating model for olive.

    Phase 1 — Chill accumulation: chill hours accumulate during dormancy
    months (Nov–Feb) until the variety-specific *chill_threshold* is met.

    Phase 2 — GDD accumulation: daily GDD (Tbase / Tupper from referential ``gdd``)
    accrues only when **both** conditions are satisfied:
      1. Tmoy > Tbase
      2. NIRv shows ≥ 20 % rise above winter baseline (or NIRv unavailable
         for that date → temperature-only fallback).

    When ``reference_data['stades_bbch']`` is present:
      - NIRv baseline uses stage **00** ``mois`` (dormancy window), else December–January.
      - GDD accrues only on calendar months listed in any BBCH stage ``mois``.
      - Season cumulative GDD (resets with chill in early November) may not exceed the
        referential **maximum** ``gdd_cumul`` upper bound for that calendar month.

    The chill accumulator resets every November (new dormancy cycle).
    """
    if tbase is None or tupper is None:
        tb, tu = get_gdd_tbase_tupper("olivier", reference_data)
        tbase = tb if tbase is None else tbase
        tupper = tu if tupper is None else tupper
    if tbase is None:
        tbase = FALLBACK_GDD_TBASE["olivier"]
    if tupper is None:
        tupper = FALLBACK_GDD_TUPPER["olivier"]

    bbch_ctx: OliveStadesBbchGddContext | None = parse_olive_stades_bbch_gdd_context(
        reference_data
    )
    baseline_months = set(bbch_ctx.baseline_months) if bbch_ctx else None

    nirv_lookup = _build_nirv_lookup(nirv_series)
    nirv_baseline = _compute_nirv_baseline(
        nirv_lookup, rows, baseline_months=baseline_months
    )

    cumulative_chill = 0.0
    chill_satisfied = False
    season_cumulative_gdd = 0.0
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
            season_cumulative_gdd = 0.0

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

            daily = 0.0
            if temp_ok and nirv_ok:
                daily = compute_daily_gdd(tmax, tmin, tbase, tupper)

            if bbch_ctx is not None and d is not None:
                if d.month not in bbch_ctx.allowed_gdd_months:
                    daily = 0.0
                else:
                    cap = bbch_ctx.month_max_gdd.get(d.month)
                    if cap is not None and daily > 0.0:
                        if season_cumulative_gdd + daily > cap + 1e-6:
                            daily = 0.0

            season_cumulative_gdd += daily
            copied[gdd_column] = round(daily, 4)
        else:
            copied[gdd_column] = 0.0

        result.append(copied)

    return result


def _resolve_chill_threshold_from_ref(
    variety: str | None,
    reference_data: dict[str, Any] | None,
) -> int | None:
    """Read variety-specific chill threshold from referential.

    Returns the **lower bound** of ``gdd.seuils_chill_units_par_variete[variety]``,
    or ``None`` if the referential has no chill data (crop doesn't need chill gating).
    """
    if not reference_data:
        return None
    gdd_block = reference_data.get("gdd")
    if not isinstance(gdd_block, dict):
        return None
    seuils = gdd_block.get("seuils_chill_units_par_variete")
    if not isinstance(seuils, dict):
        return None
    # Has chill data — resolve variety or fallback
    if variety:
        entry = seuils.get(variety)
        if isinstance(entry, (list, tuple)) and len(entry) >= 1:
            return int(entry[0])
    # Fallback: use lowest threshold across all varieties
    all_thresholds = [
        int(v[0]) for v in seuils.values()
        if isinstance(v, (list, tuple)) and len(v) >= 1
    ]
    return min(all_thresholds) if all_thresholds else 150


def _has_activation_forcing(reference_data: dict[str, Any] | None) -> bool:
    """Check if the referential requires NIRv activation gating for GDD."""
    if not reference_data:
        return False
    gdd_block = reference_data.get("gdd")
    if not isinstance(gdd_block, dict):
        return False
    return bool(gdd_block.get("activation_forcing"))


def precompute_gdd_rows(
    rows: list[dict[str, Any]],
    crop_type: str,
    *,
    variety: str | None = None,
    chill_threshold: int | None = None,
    nirv_series: list[dict[str, Any]] | None = None,
    reference_data: dict[str, Any] | None = None,
) -> tuple[list[dict[str, Any]], int]:
    """Compute daily GDD for any crop, reading rules from its referential.

    The function is generic — it reads ``gdd.tbase_c``, ``gdd.plafond_c``,
    and optionally ``gdd.seuils_chill_units_par_variete`` from the crop's
    referential JSON.  Chill gating and NIRv activation are applied only
    when the referential provides them.

    For olive (which has chill + NIRv + BBCH month filtering), this delegates
    to ``compute_olive_gdd_two_phase``.  For other crops, a simpler
    temperature-only model is used with the same corrected formula.
    """
    if crop_type not in CROP_TYPE_TO_REFERENTIAL_JSON:
        return rows, 0

    tbase, tupper = get_gdd_tbase_tupper(crop_type, reference_data)
    if tbase is None:
        return rows, 0

    column = f"gdd_{crop_type}"
    has_chill = _resolve_chill_threshold_from_ref(variety, reference_data) is not None
    has_forcing = _has_activation_forcing(reference_data)

    # Crops with chill gating + activation forcing → full two-phase model
    if has_chill or has_forcing:
        threshold = chill_threshold or _resolve_chill_threshold_from_ref(variety, reference_data) or 150
        result = compute_olive_gdd_two_phase(
            rows,
            chill_threshold=threshold,
            nirv_series=nirv_series or [],
            reference_data=reference_data,
            tbase=tbase,
            tupper=tupper,
            gdd_column=column,
        )
        updated = sum(
            1
            for orig, new in zip(rows, result)
            if orig.get(column) is None and new.get(column) is not None
        )
        return result, updated

    # Crops without chill/forcing → simple daily GDD from referential formula
    updated = 0
    result_rows: list[dict[str, Any]] = []

    for row in rows:
        copied = dict(row)
        if copied.get(column) is not None:
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
