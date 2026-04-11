"""
Helpers for Sentinel-2 available-date lists returned for an AOI.

Date *eligibility* comes from the provider (GEE / Copernicus STAC) intersecting
the request geometry — not from global calendar cutoffs here.

We only deduplicate when multiple granules share the same calendar day (keep
lowest cloud %). Malformed date strings are skipped.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List


def dedupe_s2_available_dates_by_day(
    entries: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    One entry per calendar day (lowest cloud %). AOI/coverage is unchanged.
    """
    by_date: Dict[str, Dict[str, Any]] = {}

    for entry in entries:
        ds = entry.get("date")
        if not ds or not isinstance(ds, str) or len(ds) < 10:
            continue
        day_str = ds[:10]
        try:
            datetime.strptime(day_str, "%Y-%m-%d")
        except ValueError:
            continue

        cloud_raw = entry.get("cloud_coverage")
        try:
            cloud_val = float(cloud_raw) if cloud_raw is not None else 0.0
        except (TypeError, ValueError):
            cloud_val = 0.0

        if day_str not in by_date or by_date[day_str]["cloud_coverage"] > cloud_val:
            ts = entry.get("timestamp")
            by_date[day_str] = {
                "date": day_str,
                "cloud_coverage": round(cloud_val, 2),
                "timestamp": ts,
                "available": True,
            }

    return sorted(by_date.values(), key=lambda x: x["date"])
