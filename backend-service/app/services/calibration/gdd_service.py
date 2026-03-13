from __future__ import annotations

from datetime import date
from typing import Any


TBASE_BY_CROP = {
    "olivier": 10.0,
    "agrumes": 13.0,
    "avocatier": 10.0,
    "palmier_dattier": 18.0,
}


def compute_daily_gdd(temp_max: float, temp_min: float, tbase: float) -> float:
    return max(0.0, ((temp_max + temp_min) / 2.0) - tbase)


def estimate_chill_hours(temp_max: float, temp_min: float) -> float:
    if temp_min >= 7.2:
        return 0.0
    if temp_max <= 0:
        return 0.0
    return min(12.0, max(0.0, (7.2 - temp_min) * 1.5))


def precompute_gdd_rows(
    rows: list[dict[str, Any]],
    crop_type: str,
) -> tuple[list[dict[str, Any]], int]:
    if crop_type not in TBASE_BY_CROP:
        return rows, 0

    tbase = TBASE_BY_CROP[crop_type]
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

        copied[column] = round(compute_daily_gdd(tmax, tmin, tbase), 4)
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
