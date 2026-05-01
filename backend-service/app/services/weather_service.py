import httpx
import logging
from datetime import date, timedelta
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

CROP_THRESHOLDS = {
    "olive": {"tbase": 10.0, "frost": -5.0, "heat": 40.0, "chill_hours_min": 200},
    "avocado": {"tbase": 10.0, "frost": -1.0, "heat": 35.0, "chill_hours_min": 100},
    "citrus": {"tbase": 13.0, "frost": -3.0, "heat": 38.0, "chill_hours_min": 100},
    "almond": {"tbase": 4.5, "frost": -2.0, "heat": 38.0, "chill_hours_min": 400},
    "vine": {"tbase": 10.0, "frost": -2.0, "heat": 40.0, "chill_hours_min": 300},
    "pomegranate": {
        "tbase": 10.0,
        "frost": -10.0,
        "heat": 42.0,
        "chill_hours_min": 200,
    },
    "fig": {"tbase": 10.0, "frost": -8.0, "heat": 42.0, "chill_hours_min": 100},
    "apple_pear": {"tbase": 7.0, "frost": -2.0, "heat": 35.0, "chill_hours_min": 500},
    "stone_fruit": {"tbase": 7.0, "frost": -2.0, "heat": 38.0, "chill_hours_min": 400},
    "date_palm": {"tbase": 18.0, "frost": -5.0, "heat": 50.0, "chill_hours_min": 0},
    "walnut": {"tbase": 7.0, "frost": -2.0, "heat": 38.0, "chill_hours_min": 400},
}


class WeatherFetchError(RuntimeError):
    """Raised when an upstream weather provider (Open-Meteo) is unavailable.

    Used by hourly chill-hours computation — we fail loudly rather than fall back
    to a sine-modeled estimate, per chill-hours-hourly-fetch design decision.
    """


class WeatherService:
    HISTORICAL_URL = "https://archive-api.open-meteo.com/v1/archive"
    FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

    DAILY_VARIABLES = ",".join(
        [
            "temperature_2m_max",
            "temperature_2m_min",
            "temperature_2m_mean",
            "relative_humidity_2m_mean",
            "relative_humidity_2m_max",
            "relative_humidity_2m_min",
            "precipitation_sum",
            "wind_speed_10m_max",
            "wind_gusts_10m_max",
            "shortwave_radiation_sum",
            "et0_fao_evapotranspiration",
            "soil_temperature_0_to_7cm_mean",
            "soil_temperature_7_to_28cm_mean",
            "soil_moisture_0_to_7cm_mean",
            "soil_moisture_7_to_28cm_mean",
        ]
    )

    FORECAST_DAILY_VARIABLES = ",".join(
        [
            "temperature_2m_max",
            "temperature_2m_min",
            "temperature_2m_mean",
            "relative_humidity_2m_mean",
            "precipitation_sum",
            "wind_speed_10m_max",
            "shortwave_radiation_sum",
            "et0_fao_evapotranspiration",
        ]
    )

    async def fetch_with_db_cache(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str,
    ) -> List[Dict]:
        """Cache-aside: read from weather_daily_data, fill gaps with Open-Meteo, persist back.

        Returns a list of parsed daily weather records (same shape as parse_open_meteo_response).
        Never calls the API for dates already cached.
        """
        from app.services.supabase_service import supabase_service

        cached = await supabase_service.get_cached_weather(
            latitude, longitude, start_date, end_date
        )

        cached_dates: set[str] = {str(row["date"]) for row in cached}

        # Build list of all expected dates in range
        d_start = date.fromisoformat(start_date)
        d_end = date.fromisoformat(end_date)
        all_dates: set[str] = set()
        cur = d_start
        while cur <= d_end:
            all_dates.add(cur.isoformat())
            cur += timedelta(days=1)

        missing_dates = sorted(all_dates - cached_dates)

        fetched_records: List[Dict] = []
        if missing_dates:
            # Group contiguous missing date ranges to minimize API calls
            ranges = self._contiguous_ranges(missing_dates)
            for gap_start, gap_end in ranges:
                try:
                    raw = await self.fetch_historical(latitude, longitude, gap_start, gap_end)
                    gap_records = self.parse_open_meteo_response(raw)
                    fetched_records.extend(gap_records)
                    # Persist asynchronously — do not block on failure
                    await supabase_service.upsert_weather_daily(latitude, longitude, gap_records)
                except Exception as e:
                    logger.warning(f"Could not fetch gap {gap_start}..{gap_end}: {e}")

        # Merge: convert cached rows to the shared record format, then append fetched
        def _from_db_row(row: Dict) -> Dict:
            return {
                "date": str(row["date"]),
                "temp_min": row.get("temperature_min"),
                "temp_max": row.get("temperature_max"),
                "precip": row.get("precipitation_sum"),
                "et0": row.get("et0_fao_evapotranspiration"),
                "wind_speed_max": row.get("wind_speed_max"),
                "temperature_min": row.get("temperature_min"),
                "temperature_max": row.get("temperature_max"),
                "precipitation_sum": row.get("precipitation_sum"),
                "et0_fao_evapotranspiration": row.get("et0_fao_evapotranspiration"),
            }

        all_records = [_from_db_row(r) for r in cached] + fetched_records
        all_records.sort(key=lambda r: str(r["date"]))
        if not all_records:
            logger.warning(
                "fetch_with_db_cache: no weather rows lat=%s lon=%s %s..%s "
                "(cached=%s, fetched=%s) — check Open-Meteo from this host and Supabase upsert",
                latitude,
                longitude,
                start_date,
                end_date,
                len(cached),
                len(fetched_records),
            )
        return all_records

    @staticmethod
    def _contiguous_ranges(dates: List[str]) -> List[tuple]:
        """Group sorted ISO date strings into contiguous (start, end) range pairs."""
        if not dates:
            return []
        ranges = []
        start = end = date.fromisoformat(dates[0])
        for ds in dates[1:]:
            d = date.fromisoformat(ds)
            if (d - end).days == 1:
                end = d
            else:
                ranges.append((start.isoformat(), end.isoformat()))
                start = end = d
        ranges.append((start.isoformat(), end.isoformat()))
        return ranges

    async def fetch_historical(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str,
    ) -> Dict:
        lat = round(latitude, 2)
        lon = round(longitude, 2)

        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "daily": self.DAILY_VARIABLES,
            "timezone": "UTC",
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.HISTORICAL_URL, params=params, timeout=30
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Open-Meteo historical API error: {e.response.status_code} - {e.response.text}"
            )
            raise
        except httpx.RequestError as e:
            logger.error(f"Open-Meteo historical API request failed: {e}")
            raise

    @staticmethod
    def _expected_hour_count(start_date: str, end_date: str) -> int:
        """Number of hours in [start_date 00h, end_date 23h] inclusive (24h per calendar day)."""
        d_start = date.fromisoformat(start_date)
        d_end = date.fromisoformat(end_date)
        return ((d_end - d_start).days + 1) * 24

    async def fetch_hourly_temperature(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str,
    ) -> List[Dict]:
        """Fetch hourly temperature_2m for a (lat, lon, [start_date, end_date]) range.

        Returns list of dicts: [{ "recorded_at": str ISO, "temperature_2m": float }, ...].
        Used as the source of truth for chill_hours and other phenological hour-counters.
        Open-Meteo failure raises (no sine fallback) — caller must handle.
        Caching is added in a later step.
        """
        lat = round(latitude, 2)
        lon = round(longitude, 2)

        # Cache-aside with gap-fill
        from app.services.supabase_service import supabase_service
        start_at_iso = f"{start_date}T00:00:00+00:00"
        end_at_iso = f"{end_date}T23:00:00+00:00"
        cached = await supabase_service.get_cached_hourly_weather(lat, lon, start_at_iso, end_at_iso)
        cached_rows = [
            {"recorded_at": str(r.get("recorded_at")), "temperature_2m": r.get("temperature_2m")}
            for r in (cached or [])
        ]

        # Identify which calendar dates are missing from cache
        d_start = date.fromisoformat(start_date)
        d_end = date.fromisoformat(end_date)
        all_dates: set[str] = set()
        cur = d_start
        while cur <= d_end:
            all_dates.add(cur.isoformat())
            cur += timedelta(days=1)
        cached_dates: set[str] = set()
        for r in cached_rows:
            ra = r.get("recorded_at")
            if ra:
                cached_dates.add(str(ra)[:10])
        # A day is "fully cached" only if it has 24 rows
        fully_cached: set[str] = set()
        for d in cached_dates:
            day_count = sum(1 for r in cached_rows if str(r.get("recorded_at"))[:10] == d)
            if day_count >= 24:
                fully_cached.add(d)
        missing_dates = sorted(all_dates - fully_cached)

        if not missing_dates:
            return cached_rows

        fetched_rows: List[Dict] = []
        for sub_start, sub_end in self._contiguous_ranges(missing_dates):
            params = {
                "latitude": lat,
                "longitude": lon,
                "start_date": sub_start,
                "end_date": sub_end,
                "hourly": "temperature_2m",
                "timezone": "UTC",
            }
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(self.HISTORICAL_URL, params=params, timeout=30)
                    response.raise_for_status()
                    payload = response.json()
            except (httpx.HTTPStatusError, httpx.RequestError) as e:
                raise WeatherFetchError(
                    f"Open-Meteo hourly fetch failed for ({lat},{lon}) {sub_start}–{sub_end}: {e}"
                ) from e
            hourly = payload.get("hourly") or {}
            times = hourly.get("time") or []
            temps = hourly.get("temperature_2m") or []
            for t, v in zip(times, temps):
                fetched_rows.append({"recorded_at": t, "temperature_2m": v})

        if fetched_rows:
            try:
                await supabase_service.persist_hourly_weather(fetched_rows, lat, lon)
            except Exception as e:
                logger.warning(f"persist_hourly_weather failed (non-fatal): {e}")

        # Drop cached rows for missing-day partial coverage to avoid double-counting
        cached_filtered = [r for r in cached_rows if str(r.get("recorded_at"))[:10] not in set(missing_dates)]
        return cached_filtered + fetched_rows

    async def fetch_forecast(
        self,
        latitude: float,
        longitude: float,
        days: int = 7,
    ) -> Dict:
        lat = round(latitude, 2)
        lon = round(longitude, 2)

        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": self.FORECAST_DAILY_VARIABLES,
            "timezone": "UTC",
            "forecast_days": days,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.FORECAST_URL, params=params, timeout=30
                )
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Open-Meteo forecast API error: {e.response.status_code} - {e.response.text}"
            )
            raise
        except httpx.RequestError as e:
            logger.error(f"Open-Meteo forecast API request failed: {e}")
            raise

    @staticmethod
    def calculate_gdd(t_min: float, t_max: float, t_base: float = 10.0) -> float:
        """max(0, (Tmax + Tmin) / 2 - Tbase)"""
        if t_min is None or t_max is None:
            return 0.0
        return max(0.0, (t_max + t_min) / 2.0 - t_base)

    @staticmethod
    def estimate_chill_hours_from_daily(t_min: float, t_max: float) -> float:
        """Estimate chill hours (T < 7.2C) via linear interpolation of daily min/max."""
        if t_min is None or t_max is None:
            return 0.0
        threshold = 7.2
        if t_max <= threshold:
            return 24.0
        if t_min >= threshold:
            return 0.0
        total_range = t_max - t_min
        if total_range == 0:
            return 0.0
        fraction_below = (threshold - t_min) / total_range
        return max(0.0, min(24.0, fraction_below * 24.0))

    @staticmethod
    def calculate_water_balance(
        precipitation: float,
        et0: float,
        kc: float = 1.0,
        irrigation: float = 0.0,
    ) -> float:
        """Precipitation + Irrigation - ET0 x Kc"""
        precip = precipitation or 0.0
        etp = et0 or 0.0
        return precip + irrigation - (etp * kc)

    def get_crop_thresholds(self, crop_type: str) -> Dict:
        return CROP_THRESHOLDS.get(crop_type, CROP_THRESHOLDS["olive"])

    def compute_derived_data(
        self,
        daily_data: List[Dict],
        crop_type: str = "olive",
        tbase_override: Optional[float] = None,
        kc: float = 1.0,
    ) -> List[Dict]:
        thresholds = self.get_crop_thresholds(crop_type)
        tbase = tbase_override if tbase_override is not None else thresholds["tbase"]
        frost_threshold = thresholds["frost"]
        heat_threshold = thresholds["heat"]

        gdd_cumulative = 0.0
        chill_cumulative = 0.0
        results = []

        for day in daily_data:
            t_min = day.get("temperature_min")
            t_max = day.get("temperature_max")
            et0 = day.get("et0_fao_evapotranspiration")
            precip = day.get("precipitation_sum")

            gdd_daily = self.calculate_gdd(t_min, t_max, tbase)
            gdd_cumulative += gdd_daily

            chill_daily = self.estimate_chill_hours_from_daily(t_min, t_max)
            chill_cumulative += chill_daily

            frost_risk = t_min is not None and t_min <= frost_threshold
            heat_stress = t_max is not None and t_max >= heat_threshold

            water_bal = self.calculate_water_balance(precip, et0, kc)

            results.append(
                {
                    "date": day["date"],
                    "gdd_daily": round(gdd_daily, 2),
                    "gdd_cumulative": round(gdd_cumulative, 2),
                    "gdd_base_temp": tbase,
                    "chill_hours_daily": round(chill_daily, 1),
                    "chill_hours_cumulative": round(chill_cumulative, 1),
                    "frost_risk": frost_risk,
                    "heat_stress": heat_stress,
                    "water_balance": round(water_bal, 2),
                    "kc_used": kc,
                    "et0": et0,
                }
            )

        return results

    def parse_open_meteo_response(self, response_data: Dict) -> List[Dict]:
        daily = response_data.get("daily", {})
        dates = daily.get("time", [])
        if not dates:
            return []

        records = []
        for i, d in enumerate(dates):
            record = {
                "date": d,
                "temperature_min": _safe_get(daily, "temperature_2m_min", i),
                "temperature_max": _safe_get(daily, "temperature_2m_max", i),
                "temperature_mean": _safe_get(daily, "temperature_2m_mean", i),
                "relative_humidity_mean": _safe_get(
                    daily, "relative_humidity_2m_mean", i
                ),
                "relative_humidity_max": _safe_get(
                    daily, "relative_humidity_2m_max", i
                ),
                "relative_humidity_min": _safe_get(
                    daily, "relative_humidity_2m_min", i
                ),
                "precipitation_sum": _safe_get(daily, "precipitation_sum", i),
                "wind_speed_max": _safe_get(daily, "wind_speed_10m_max", i),
                "wind_gusts_max": _safe_get(daily, "wind_gusts_10m_max", i),
                "shortwave_radiation_sum": _safe_get(
                    daily, "shortwave_radiation_sum", i
                ),
                "et0_fao_evapotranspiration": _safe_get(
                    daily, "et0_fao_evapotranspiration", i
                ),
                "soil_temperature_0_7cm": _safe_get(
                    daily, "soil_temperature_0_to_7cm_mean", i
                ),
                "soil_temperature_7_28cm": _safe_get(
                    daily, "soil_temperature_7_to_28cm_mean", i
                ),
                "soil_moisture_0_7cm": _safe_get(
                    daily, "soil_moisture_0_to_7cm_mean", i
                ),
                "soil_moisture_7_28cm": _safe_get(
                    daily, "soil_moisture_7_to_28cm_mean", i
                ),
            }
            records.append(record)
        return records


def _safe_get(daily: Dict, key: str, index: int):
    values = daily.get(key, [])
    if index < len(values):
        return values[index]
    return None


weather_service = WeatherService()
