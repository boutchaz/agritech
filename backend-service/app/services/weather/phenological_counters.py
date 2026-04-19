"""Stage-aware phenological counters service.

Loads `phenological_stages` definition from a crop's referentiel, then for each
(stage, threshold) computes the hour count via `count_hours` over the cached
hourly temperature series. Caches each computed count in `weather_threshold_cache`.

The single source of truth used by both:
  - calibration step 2 (chill_hours via direct `count_hours` call)
  - the weather tab UI (via `GET /weather/phenological-counters`)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.services.calibration.referential_utils import (
    CROP_TYPE_TO_REFERENTIAL_JSON,
    _load_referential_data_from_file,
)
from app.services.weather.hour_counter import count_hours
from app.services.weather_service import WeatherService


class UnsupportedCropError(ValueError):
    """Raised when crop_type has no referentiel or no `phenological_stages` block."""


def _stage_window_dates(year: int, months: List[int]) -> tuple[str, str]:
    """Compute [start_date, end_date] ISO dates spanning the given months in `year`.

    Months that wrap year (e.g. [11, 12, 1, 2]) are interpreted as
    Nov–Dec of (year - 1) + Jan–Feb of `year`. Returns the absolute
    earliest and latest ISO date covering all selected months.
    """
    if not months:
        return f"{year}-01-01", f"{year}-12-31"
    # Sort months but preserve wrap detection
    sorted_months = sorted(set(months))
    if sorted_months == months:
        # Strict ascending — entirely within `year`
        start_year = end_year = year
        start_month = sorted_months[0]
        end_month = sorted_months[-1]
    else:
        # Wraps: high months belong to `year - 1`
        high = [m for m in months if m >= 7]
        low = [m for m in months if m < 7]
        start_year = year - 1 if high else year
        start_month = min(high) if high else min(low)
        end_year = year
        end_month = max(low) if low else max(high)
    # Last day approximation
    if end_month in (1, 3, 5, 7, 8, 10, 12):
        last_day = 31
    elif end_month in (4, 6, 9, 11):
        last_day = 30
    else:
        last_day = 28
    return f"{start_year}-{start_month:02d}-01", f"{end_year}-{end_month:02d}-{last_day:02d}"


async def compute_phenological_counters(
    *,
    latitude: float,
    longitude: float,
    year: int,
    crop_type: str,
) -> Dict[str, Any]:
    """Compute hour counts for every (stage, threshold) defined in the crop's referentiel."""
    if crop_type not in CROP_TYPE_TO_REFERENTIAL_JSON:
        raise UnsupportedCropError(f"crop_type '{crop_type}' has no referentiel")

    ref = _load_referential_data_from_file(crop_type)
    if not isinstance(ref, dict) or "phenological_stages" not in ref:
        raise UnsupportedCropError(f"crop_type '{crop_type}' missing phenological_stages")

    stages_def = ref.get("phenological_stages") or []
    if not isinstance(stages_def, list) or not stages_def:
        raise UnsupportedCropError(f"crop_type '{crop_type}' has empty phenological_stages")

    # Lazy supabase import to allow patching at module boundary in tests
    from app.services.supabase_service import supabase_service

    cached_rows = await supabase_service.get_cached_threshold_counts(
        latitude=latitude, longitude=longitude, year=year, crop_type=crop_type
    )
    cached_lookup: Dict[tuple, int] = {}
    for r in cached_rows or []:
        sk = r.get("stage_key")
        tk = r.get("threshold_key")
        c = r.get("count")
        if sk and tk and c is not None:
            cached_lookup[(sk, tk)] = int(c)

    # Determine if all (stage, threshold) entries are cached → skip hourly fetch
    expected_keys = {(s["key"], t["key"]) for s in stages_def for t in (s.get("thresholds") or [])}
    full_cache_hit = expected_keys.issubset(set(cached_lookup.keys()))

    # Fetch hourly only if we need to compute something
    hourly_rows: List[Dict[str, Any]] = []
    if not full_cache_hit:
        ws = WeatherService()
        # One global fetch over the full union window — let count_hours filter by months
        hourly_rows = await ws.fetch_hourly_temperature(
            latitude=latitude,
            longitude=longitude,
            start_date=f"{year - 1}-11-01",
            end_date=f"{year}-12-31",
        )

    persisted: List[Dict[str, Any]] = []
    stages_out: List[Dict[str, Any]] = []
    for stage in stages_def:
        stage_key = stage.get("key")
        months = stage.get("months") or []
        counters_out: List[Dict[str, Any]] = []
        for th in stage.get("thresholds") or []:
            th_key = th.get("key")
            cache_key = (stage_key, th_key)
            if cache_key in cached_lookup:
                value = cached_lookup[cache_key]
            else:
                value = count_hours(
                    hourly_rows,
                    threshold=float(th.get("value", 0)),
                    compare=str(th.get("compare", "below")),
                    upper=float(th["upper"]) if th.get("upper") is not None else None,
                    months=set(months) if months else None,
                )
                persisted.append({
                    "latitude": latitude,
                    "longitude": longitude,
                    "year": year,
                    "crop_type": crop_type,
                    "stage_key": stage_key,
                    "threshold_key": th_key,
                    "count": int(value),
                })
            counters_out.append({
                "key": th_key,
                "label_fr": th.get("label_fr"),
                "label_en": th.get("label_en"),
                "value": int(value),
                "threshold": th.get("value"),
                "upper": th.get("upper"),
                "compare": th.get("compare"),
                "unit": th.get("unit"),
                "icon": th.get("icon"),
            })
        stages_out.append({
            "key": stage_key,
            "name_fr": stage.get("name_fr"),
            "name_en": stage.get("name_en"),
            "name_ar": stage.get("name_ar"),
            "months": months,
            "counters": counters_out,
        })

    if persisted:
        try:
            await supabase_service.persist_threshold_counts(persisted)
        except Exception:  # non-fatal — response still returned
            pass

    return {
        "crop_type": crop_type,
        "year": year,
        "computed_at": datetime.now(timezone.utc).isoformat(),
        "stages": stages_out,
    }
