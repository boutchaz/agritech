"""Generic hour counter — counts hourly rows whose temperature satisfies a comparison.

Used by the phenological-counters service (and by calibration step 2 for chill_hours)
as the single source of truth for threshold-based hour counting.
"""
from __future__ import annotations

import math
from datetime import datetime
from typing import Iterable, Mapping, Optional, Set

Compare = str  # 'below' | 'above' | 'between'


def _parse_month(recorded_at) -> Optional[int]:
    """Best-effort extraction of month from an ISO datetime or datetime instance."""
    if recorded_at is None:
        return None
    if isinstance(recorded_at, datetime):
        return recorded_at.month
    s = str(recorded_at)
    if len(s) < 7:
        return None
    try:
        return int(s[5:7])
    except (ValueError, TypeError):
        return None


def _is_valid_temp(t) -> bool:
    if t is None:
        return False
    try:
        f = float(t)
    except (ValueError, TypeError):
        return False
    return not math.isnan(f) and not math.isinf(f)


def count_hours(
    rows: Iterable[Mapping],
    threshold: float,
    compare: Compare,
    upper: Optional[float] = None,
    months: Optional[Set[int]] = None,
) -> int:
    """Count rows whose `temperature_2m` satisfies the comparison.

    Args:
        rows: iterable of dicts with `recorded_at` (ISO string or datetime) + `temperature_2m`
        threshold: numeric value compared against
        compare: 'below' (strict <), 'above' (strict >), 'between' (inclusive [threshold, upper])
        upper: required when compare='between'
        months: optional set of 1–12 integers — restricts rows to those calendar months
    """
    if compare == "between" and upper is None:
        raise ValueError("compare='between' requires upper bound")

    count = 0
    for r in rows:
        temp = r.get("temperature_2m") if isinstance(r, Mapping) else None
        if not _is_valid_temp(temp):
            continue
        if months is not None:
            m = _parse_month(r.get("recorded_at"))
            if m is None or m not in months:
                continue
        t = float(temp)
        if compare == "below" and t < threshold:
            count += 1
        elif compare == "above" and t > threshold:
            count += 1
        elif compare == "between" and threshold <= t <= upper:
            count += 1
    return count
