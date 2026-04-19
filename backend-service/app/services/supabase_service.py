import os
import math
import uuid
import base64
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import httpx
import json
import logging
from supabase import acreate_client, AsyncClient
from ..core.config import settings
from .calibration.support.gdd_service import compute_daily_gdd

logger = logging.getLogger(__name__)


class SupabaseService:
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_SERVICE_KEY
        self.headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
        }
        self._sdk_client: AsyncClient | None = None

    async def _get_sdk_client(self) -> AsyncClient:
        """Lazy-initialize the official Supabase async SDK client.

        The async client cannot be created in __init__ (requires await), so we
        initialize it on first use and reuse the singleton across calls.
        """
        if self._sdk_client is None:
            self._sdk_client = await acreate_client(
                self.supabase_url, self.supabase_key
            )
        return self._sdk_client

    @staticmethod
    def _round_weather_coordinate(value: float) -> float:
        """Round coordinates so nearby AOIs reuse the same weather cache entry."""
        return round(float(value), 2)

    @staticmethod
    def _to_finite_float(value: Any, default: float | None = None) -> float | None:
        """Convert to finite float; fallback to default for None/NaN/inf/invalid."""
        if value is None:
            return default
        try:
            f = float(value)
        except (TypeError, ValueError):
            return default
        if not math.isfinite(f):
            return default
        return f

    async def get_organization_farms(
        self, organization_id: str
    ) -> List[Dict[str, Any]]:
        """Get all farms for an organization"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/rpc/get_organization_farms",
                    headers=self.headers,
                    params={"org_uuid": organization_id},
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching organization farms: {e}")
            return []

    async def get_farm_parcels(self, farm_id: str) -> List[Dict[str, Any]]:
        """Get all parcels for a farm"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/rpc/get_farm_parcels",
                    headers=self.headers,
                    params={"farm_uuid": farm_id},
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching farm parcels: {e}")
            return []

    async def get_farm_hierarchy_tree(
        self, organization_id: str, root_farm_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get farm hierarchy tree"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                params = {"org_uuid": organization_id}
                if root_farm_id:
                    params["root_farm_id"] = root_farm_id

                response = await client.get(
                    f"{self.supabase_url}/rest/v1/rpc/get_farm_hierarchy_tree",
                    headers=self.headers,
                    params=params,
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching farm hierarchy: {e}")
            return []

    async def get_parcel_details(self, parcel_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a parcel"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/parcels",
                    headers=self.headers,
                    params={"id": f"eq.{parcel_id}", "select": "*"},
                )
                response.raise_for_status()
                parcels = response.json()
                return parcels[0] if parcels else None
        except Exception as e:
            logger.error(f"Error fetching parcel details: {e}")
            return None

    async def get_farm_details(self, farm_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a farm"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/farms",
                    headers=self.headers,
                    params={"id": f"eq.{farm_id}", "select": "*"},
                )
                response.raise_for_status()
                farms = response.json()
                return farms[0] if farms else None
        except Exception as e:
            logger.error(f"Error fetching farm details: {e}")
            return None

    async def save_processing_job(self, job_data: Dict[str, Any]) -> Optional[str]:
        """Save a processing job to the database"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.supabase_url}/rest/v1/satellite_processing_jobs",
                    headers=self.headers,
                    json=job_data,
                )
                response.raise_for_status()
                result = response.json()
                return result[0]["id"] if result else None
        except Exception as e:
            logger.error(f"Error saving processing job: {e}")
            return None

    async def get_processing_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get a processing job by ID"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/satellite_processing_jobs",
                    headers=self.headers,
                    params={"id": f"eq.{job_id}", "select": "*"},
                )
                response.raise_for_status()
                jobs = response.json()
                return jobs[0] if jobs else None
        except Exception as e:
            logger.error(f"Error fetching processing job: {e}")
            return None

    async def update_processing_job(self, job_id: str, updates: Dict[str, Any]) -> bool:
        """Update a processing job"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.patch(
                    f"{self.supabase_url}/rest/v1/satellite_processing_jobs",
                    headers=self.headers,
                    params={"id": f"eq.{job_id}"},
                    json=updates,
                )
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Error updating processing job: {e}")
            return False

    async def save_satellite_data(self, data: Dict[str, Any]) -> Optional[str]:
        """Save satellite indices data"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.supabase_url}/rest/v1/satellite_indices_data",
                    headers=self.headers,
                    json=data,
                )
                response.raise_for_status()
                result = response.json()
                return result[0]["id"] if result else None
        except Exception as e:
            logger.error(f"Error saving satellite data: {e}")
            return None

    async def get_satellite_data(
        self, parcel_id: str, date_range: Optional[Dict[str, str]] = None
    ) -> List[Dict[str, Any]]:
        """Get satellite indices data for a parcel"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Use list-of-tuples so httpx emits duplicate 'date' keys
                # for PostgREST range filtering on the same column
                query_params: list[tuple[str, Any]] = [("parcel_id", f"eq.{parcel_id}")]
                if date_range:
                    start = date_range.get("start_date")
                    end = date_range.get("end_date")
                    if start:
                        query_params.append(("date", f"gte.{start}"))
                    if end:
                        query_params.append(("date", f"lte.{end}"))

                response = await client.get(
                    f"{self.supabase_url}/rest/v1/satellite_indices_data",
                    headers=self.headers,
                    params=query_params,
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching satellite data: {e}")
            return []

    async def get_gdd_timeseries(
        self,
        latitude: float,
        longitude: float,
        crop_type: str,
        start_date: str,
        end_date: str,
    ) -> List[Dict[str, Any]]:
        """Fetch pre-computed daily GDD rows from ``weather_gdd_daily`` for a crop.

        Returns rows ordered by date with keys: ``date``, ``gdd_daily``, ``chill_hours``.
        Uses the official Supabase async SDK — no manual header or URL construction.
        Returns empty list when Supabase is unavailable (tests, offline).
        """
        if not self.supabase_url or not self.supabase_key:
            return []
        lat = self._round_weather_coordinate(latitude)
        lon = self._round_weather_coordinate(longitude)
        try:
            client = await self._get_sdk_client()
            result = (
                await client.table("weather_gdd_daily")
                .select("date, gdd_daily, chill_hours")
                .eq("latitude", f"{lat:.2f}")
                .eq("longitude", f"{lon:.2f}")
                .eq("crop_type", crop_type)
                .gte("date", start_date)
                .lte("date", end_date)
                .order("date")
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching GDD timeseries for {crop_type}: {e}")
            return []

    async def get_cached_par_data(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str,
    ) -> Dict[str, float]:
        """Get cached daily PAR values for a rounded location and date range."""
        if not self.supabase_url or not self.supabase_key:
            return {}

        lat = self._round_weather_coordinate(latitude)
        lon = self._round_weather_coordinate(longitude)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                query_params: list[tuple[str, Any]] = [
                    ("select", "date,par_value"),
                    ("latitude", f"eq.{lat:.2f}"),
                    ("longitude", f"eq.{lon:.2f}"),
                    ("date", f"gte.{start_date}"),
                    ("date", f"lte.{end_date}"),
                    ("order", "date.asc"),
                ]

                response = await client.get(
                    f"{self.supabase_url}/rest/v1/satellite_par_data",
                    headers=self.headers,
                    params=query_params,
                )
                response.raise_for_status()
                rows = response.json()

                par_by_date: Dict[str, float] = {}
                for row in rows:
                    date_key = row.get("date")
                    par_value = row.get("par_value")
                    if date_key and par_value is not None:
                        par_by_date[str(date_key)] = float(par_value)

                return par_by_date
        except Exception as e:
            logger.error(f"Error fetching cached PAR data: {e}")
            return {}

    async def upsert_par_data(
        self,
        latitude: float,
        longitude: float,
        par_by_date: Dict[str, float],
        source: str = "open-meteo-archive",
    ) -> bool:
        """Upsert daily PAR values for a rounded location."""
        if not self.supabase_url or not self.supabase_key or not par_by_date:
            return False

        lat = self._round_weather_coordinate(latitude)
        lon = self._round_weather_coordinate(longitude)

        rows = [
            {
                "latitude": lat,
                "longitude": lon,
                "date": date_key,
                "par_value": float(par_value),
                "source": source,
            }
            for date_key, par_value in sorted(par_by_date.items())
            if par_value is not None
        ]

        if not rows:
            return False

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.supabase_url}/rest/v1/satellite_par_data",
                    headers={**self.headers, "Prefer": "resolution=merge-duplicates"},
                    params={"on_conflict": "latitude,longitude,date"},
                    json=rows,
                )
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Error upserting PAR data: {e}")
            return False

    async def convert_boundary_to_geojson(
        self, boundary: List[List[float]]
    ) -> Dict[str, Any]:
        """Convert parcel boundary to GeoJSON format"""
        try:
            # Check if coordinates are in Web Mercator (EPSG:3857) or geographic (WGS84)
            first_coord = boundary[0]
            geo_coordinates: List[List[float]]

            if abs(first_coord[0]) > 180 or abs(first_coord[1]) > 90:
                # Coordinates are in Web Mercator (EPSG:3857), need to convert to WGS84
                logger.info("Converting coordinates from Web Mercator to WGS84")
                geo_coordinates = []
                for coord in boundary:
                    x, y = coord
                    # Convert from Web Mercator to WGS84
                    lon = (x / 20037508.34) * 180
                    lat = (
                        math.atan(math.exp((y / 20037508.34) * math.pi)) * 360 / math.pi
                    ) - 90
                    geo_coordinates.append([lon, lat])
            else:
                # Coordinates are already in geographic (WGS84)
                logger.info("Coordinates are already in WGS84")
                geo_coordinates = boundary

            # Ensure the polygon is closed (first and last points should be the same)
            if geo_coordinates and len(geo_coordinates) > 0:
                first = geo_coordinates[0]
                last = geo_coordinates[-1]
                if first[0] != last[0] or first[1] != last[1]:
                    geo_coordinates.append([first[0], first[1]])

            return {"type": "Polygon", "coordinates": [geo_coordinates]}
        except Exception as e:
            logger.error(f"Error converting boundary to GeoJSON: {e}")
            return {"type": "Polygon", "coordinates": [[]]}

    async def get_organization_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Get organizations for a user"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/rpc/get_user_organizations",
                    headers=self.headers,
                    params={"user_uuid": user_id},
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching user organizations: {e}")
            return []

    async def upload_satellite_file(
        self,
        file_data: bytes,
        filename: str,
        organization_id: str,
        index: str,
        date: str,
        parcel_id: Optional[str] = None,
    ) -> Optional[str]:
        """Upload satellite data file to Supabase Storage"""
        try:
            # Create folder structure: satellite-data/{organization_id}/{index}/{date}/
            folder_path = f"satellite-data/{organization_id}/{index}/{date}"
            file_path = f"{folder_path}/{filename}"

            # Upload file to Supabase Storage
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.supabase_url}/storage/v1/object/satellite-data/{file_path}",
                    headers={
                        "apikey": self.supabase_key,
                        "Authorization": f"Bearer {self.supabase_key}",
                        "Content-Type": "application/octet-stream",
                    },
                    content=file_data,
                )
                response.raise_for_status()

                # Return the public URL
                public_url = f"{self.supabase_url}/storage/v1/object/public/satellite-data/{file_path}"

                # Save file metadata to database
                await self.save_file_metadata(
                    {
                        "organization_id": organization_id,
                        "parcel_id": parcel_id,
                        "index": index,
                        "date": date,
                        "filename": filename,
                        "file_path": file_path,
                        "public_url": public_url,
                        "file_size": len(file_data),
                        "created_at": datetime.utcnow().isoformat(),
                    }
                )

                logger.info(f"Uploaded satellite file: {file_path}")
                return public_url

        except Exception as e:
            logger.error(f"Error uploading satellite file: {e}")
            return None

    async def upload_calibration_raster(
        self,
        file_data: bytes,
        organization_id: str,
        parcel_id: str,
        index: str,
        raster_date: str,
        filename: Optional[str] = None,
    ) -> Optional[str]:
        try:
            safe_filename = filename or f"{index.lower()}.tif"
            file_path = f"calibration-rasters/{organization_id}/{parcel_id}/{raster_date}/{safe_filename}"

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.supabase_url}/storage/v1/object/satellite-data/{file_path}",
                    headers={
                        "apikey": self.supabase_key,
                        "Authorization": f"Bearer {self.supabase_key}",
                        "Content-Type": "application/octet-stream",
                        "x-upsert": "true",
                    },
                    content=file_data,
                )
                response.raise_for_status()

            return f"{self.supabase_url}/storage/v1/object/public/satellite-data/{file_path}"
        except Exception as e:
            logger.error(f"Error uploading calibration raster: {e}")
            return None

    def calibration_raster_path(
        self,
        organization_id: str,
        parcel_id: str,
        index: str,
        raster_date: str,
        filename: Optional[str] = None,
    ) -> str:
        safe_filename = filename or f"{index.lower()}.tif"
        return f"calibration-rasters/{organization_id}/{parcel_id}/{raster_date}/{safe_filename}"

    async def save_file_metadata(self, metadata: Dict[str, Any]) -> Optional[str]:
        """Save file metadata to database"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.supabase_url}/rest/v1/satellite_files",
                    headers=self.headers,
                    json=metadata,
                )
                response.raise_for_status()
                result = response.json()
                return result[0]["id"] if result else None
        except Exception as e:
            logger.error(f"Error saving file metadata: {e}")
            return None

    async def get_satellite_files(
        self,
        organization_id: str,
        index: Optional[str] = None,
        date_range: Optional[Dict[str, str]] = None,
    ) -> List[Dict[str, Any]]:
        """Get satellite files for an organization"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                query_params: list[tuple[str, Any]] = [
                    ("organization_id", f"eq.{organization_id}")
                ]

                if index:
                    query_params.append(("index", f"eq.{index}"))

                if date_range:
                    if date_range.get("start_date"):
                        query_params.append(("date", f"gte.{date_range['start_date']}"))
                    if date_range.get("end_date"):
                        query_params.append(("date", f"lte.{date_range['end_date']}"))

                response = await client.get(
                    f"{self.supabase_url}/rest/v1/satellite_files",
                    headers=self.headers,
                    params=query_params,
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching satellite files: {e}")
            return []

    async def delete_satellite_file(self, file_id: str) -> bool:
        """Delete satellite file and its metadata"""
        try:
            # First get file metadata
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/satellite_files",
                    headers=self.headers,
                    params={"id": f"eq.{file_id}"},
                )
                response.raise_for_status()
                files = response.json()

                if not files:
                    return False

                file_metadata = files[0]
                file_path = file_metadata["file_path"]

                # Delete from storage
                delete_response = await client.delete(
                    f"{self.supabase_url}/storage/v1/object/satellite-data/{file_path}",
                    headers={
                        "apikey": self.supabase_key,
                        "Authorization": f"Bearer {self.supabase_key}",
                    },
                )
                delete_response.raise_for_status()

                # Delete metadata
                meta_response = await client.delete(
                    f"{self.supabase_url}/rest/v1/satellite_files",
                    headers=self.headers,
                    params={"id": f"eq.{file_id}"},
                )
                meta_response.raise_for_status()

                logger.info(f"Deleted satellite file: {file_path}")
                return True

        except Exception as e:
            logger.error(f"Error deleting satellite file: {e}")
            return False

    # ------------------------------------------------------------------ #
    # Weather DB cache (weather_daily_data)                              #
    # ------------------------------------------------------------------ #

    async def get_cached_weather(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str,
    ) -> List[Dict[str, Any]]:
        """Return daily weather rows already stored for a rounded location."""
        if not self.supabase_url or not self.supabase_key:
            return []
        lat = self._round_weather_coordinate(latitude)
        lon = self._round_weather_coordinate(longitude)
        try:
            client = await self._get_sdk_client()
            result = (
                await client.table("weather_daily_data")
                .select("*")
                .eq("latitude", f"{lat:.2f}")
                .eq("longitude", f"{lon:.2f}")
                .gte("date", start_date)
                .lte("date", end_date)
                .order("date")
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching cached weather: {e}")
            return []

    async def upsert_weather_daily(
        self,
        latitude: float,
        longitude: float,
        records: List[Dict[str, Any]],
        source: str = "open-meteo-archive",
    ) -> bool:
        """Upsert daily weather rows (raw meteorological data only).

        GDD values are no longer stored as per-crop columns here. Instead they
        are written to ``weather_gdd_daily`` via :meth:`upsert_gdd_rows` — one
        row per (lat, lon, date, crop_type).  Simple crops (agrumes, avocatier,
        palmier_dattier) are computed and persisted automatically after the
        weather upsert.  Olive (two-phase model) is written by the calibration
        orchestrator after ``precompute_gdd_rows`` runs with NIRv data.
        """
        if not self.supabase_url or not self.supabase_key or not records:
            return False
        lat = self._round_weather_coordinate(latitude)
        lon = self._round_weather_coordinate(longitude)

        # Load GDD params per crop for weather_gdd_daily persistence
        from .calibration.referential_utils import (
            CROP_TYPE_TO_REFERENTIAL_JSON,
            get_gdd_tbase_tupper,
        )
        crop_gdd_params: list[tuple[str, float, float]] = []
        for ct in CROP_TYPE_TO_REFERENTIAL_JSON:
            tb, tu = get_gdd_tbase_tupper(ct)
            if tb is not None:
                crop_gdd_params.append((ct, tb, tu if tu is not None else 40.0))

        rows = []
        for r in records:
            date_val = r.get("date")
            if not date_val:
                continue
            date_str = str(date_val)
            try:
                # Validate ISO date early to avoid failing the whole PostgREST batch.
                datetime.fromisoformat(date_str)
            except ValueError:
                logger.warning(f"Skipping weather row with invalid date: {date_str}")
                continue

            tmin = self._to_finite_float(r.get("temp_min"), None)
            if tmin is None:
                tmin = self._to_finite_float(r.get("temperature_min"), 0.0) or 0.0
            tmax = self._to_finite_float(r.get("temp_max"), None)
            if tmax is None:
                tmax = self._to_finite_float(r.get("temperature_max"), 0.0) or 0.0
            tavg = (tmin + tmax) / 2.0
            # Raw meteorological data only — no per-crop GDD columns.
            # GDD is stored in weather_gdd_daily (generic, one row per crop_type).
            rows.append({
                "latitude": lat,
                "longitude": lon,
                "date": date_str,
                "temperature_min": tmin,
                "temperature_max": tmax,
                "temperature_mean": round(tavg, 2),
                "precipitation_sum": self._to_finite_float(
                    r.get("precip"),
                    self._to_finite_float(r.get("precipitation_sum"), 0.0) or 0.0,
                ),
                "wind_speed_max": self._to_finite_float(r.get("wind_speed_max"), None),
                "et0_fao_evapotranspiration": self._to_finite_float(
                    r.get("et0"),
                    self._to_finite_float(r.get("et0_fao_evapotranspiration"), None),
                ),
                "source": source,
                "chill_hours": 1.0 if tmin < 7.2 else 0.0,
            })

        if not rows:
            return False

        try:
            client = await self._get_sdk_client()
            # Batch in chunks of 500 to stay within request limits.
            for i in range(0, len(rows), 500):
                chunk = rows[i : i + 500]
                await (
                    client.table("weather_daily_data")
                    .upsert(chunk, on_conflict="latitude,longitude,date")
                    .execute()
                )
        except Exception as e:
            logger.error(f"Error upserting weather daily data: {e}")
            if rows:
                logger.error(f"First failing row sample: {rows[0]}")
                logger.error(f"Total rows: {len(rows)}")
            return False

        # Persist GDD to generic weather_gdd_daily (one row per crop_type per day).
        for ct, tb, tu in crop_gdd_params:
            gdd_records: List[Dict[str, Any]] = []
            for r in records:
                tmin_r = float(r.get("temp_min") or r.get("temperature_min") or 0.0)
                tmax_r = float(r.get("temp_max") or r.get("temperature_max") or 0.0)
                gdd_val = compute_daily_gdd(tmax_r, tmin_r, tb, tu)
                gdd_records.append(
                    {
                        "date": str(r.get("date")),
                        f"gdd_{ct}": round(gdd_val, 4),
                        "chill_hours": 1.0 if tmin_r < 7.2 else 0.0,
                    }
                )
            await self.upsert_gdd_rows(lat, lon, ct, gdd_records)

        return True

    # ------------------------------------------------------------------ #
    # Threshold cache (weather_threshold_cache) — phenological counters  #
    # ------------------------------------------------------------------ #

    async def get_cached_threshold_counts(
        self,
        latitude: float,
        longitude: float,
        year: int,
        crop_type: str,
    ) -> List[Dict[str, Any]]:
        """Return precomputed (stage_key, threshold_key, count) rows for a (lat, lon, year, crop)."""
        if not self.supabase_url or not self.supabase_key:
            return []
        lat = self._round_weather_coordinate(latitude)
        lon = self._round_weather_coordinate(longitude)
        try:
            client = await self._get_sdk_client()
            result = (
                await client.table("weather_threshold_cache")
                .select("stage_key, threshold_key, count")
                .eq("latitude", f"{lat:.2f}")
                .eq("longitude", f"{lon:.2f}")
                .eq("year", year)
                .eq("crop_type", crop_type)
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching cached threshold counts: {e}")
            return []

    async def persist_threshold_counts(self, rows: List[Dict[str, Any]]) -> bool:
        """Upsert (lat, lon, year, crop, stage, threshold) → count rows."""
        if not self.supabase_url or not self.supabase_key or not rows:
            return False
        records = []
        for r in rows:
            lat = self._round_weather_coordinate(r["latitude"])
            lon = self._round_weather_coordinate(r["longitude"])
            records.append({
                "latitude": f"{lat:.2f}",
                "longitude": f"{lon:.2f}",
                "year": r["year"],
                "crop_type": r["crop_type"],
                "stage_key": r["stage_key"],
                "threshold_key": r["threshold_key"],
                "count": int(r["count"]),
            })
        try:
            client = await self._get_sdk_client()
            await (
                client.table("weather_threshold_cache")
                .upsert(records, on_conflict="latitude,longitude,year,crop_type,stage_key,threshold_key")
                .execute()
            )
            return True
        except Exception as e:
            logger.error(f"Error persisting threshold counts: {e}")
            return False

    # ------------------------------------------------------------------ #
    # Hourly weather cache (weather_hourly_data) — chill_hours source    #
    # ------------------------------------------------------------------ #

    async def get_cached_hourly_weather(
        self,
        latitude: float,
        longitude: float,
        start_at: str,
        end_at: str,
    ) -> List[Dict[str, Any]]:
        """Return hourly temperature rows already cached for a rounded location.

        ``start_at`` / ``end_at`` are ISO datetime strings (inclusive on start, inclusive on end).
        """
        if not self.supabase_url or not self.supabase_key:
            return []
        lat = self._round_weather_coordinate(latitude)
        lon = self._round_weather_coordinate(longitude)
        try:
            client = await self._get_sdk_client()
            result = (
                await client.table("weather_hourly_data")
                .select("recorded_at, temperature_2m")
                .eq("latitude", f"{lat:.2f}")
                .eq("longitude", f"{lon:.2f}")
                .gte("recorded_at", start_at)
                .lte("recorded_at", end_at)
                .order("recorded_at")
                .execute()
            )
            return result.data or []
        except Exception as e:
            logger.error(f"Error fetching cached hourly weather: {e}")
            return []

    async def persist_hourly_weather(
        self,
        rows: List[Dict[str, Any]],
        latitude: float,
        longitude: float,
        source: str = "open-meteo-archive",
    ) -> bool:
        """Upsert hourly temperature rows. Each row: {recorded_at: str, temperature_2m: float}."""
        if not self.supabase_url or not self.supabase_key or not rows:
            return False
        lat = self._round_weather_coordinate(latitude)
        lon = self._round_weather_coordinate(longitude)
        records = []
        for r in rows:
            recorded_at = r.get("recorded_at")
            temp = self._to_finite_float(r.get("temperature_2m"), None) if hasattr(self, "_to_finite_float") else r.get("temperature_2m")
            if not recorded_at:
                continue
            records.append({
                "latitude": f"{lat:.2f}",
                "longitude": f"{lon:.2f}",
                "recorded_at": recorded_at,
                "temperature_2m": temp,
                "source": source,
            })
        if not records:
            return False
        try:
            client = await self._get_sdk_client()
            await (
                client.table("weather_hourly_data")
                .upsert(records, on_conflict="latitude,longitude,recorded_at,source")
                .execute()
            )
            return True
        except Exception as e:
            logger.error(f"Error persisting hourly weather: {e}")
            return False

    async def upsert_gdd_rows(
        self,
        latitude: float,
        longitude: float,
        crop_type: str,
        gdd_rows: List[Dict[str, Any]],
        model_version: str = "v1",
    ) -> bool:
        """Persist pre-computed daily GDD to ``weather_gdd_daily`` for any crop type.

        ``gdd_rows`` must contain a ``date`` key and a ``gdd_{crop_type}`` key.
        Rows that lack a computed value for the given crop are silently skipped.
        Supports any crop — adding a new crop type requires no schema change.

        Args:
            latitude: Location latitude (rounded to 2dp internally).
            longitude: Location longitude (rounded to 2dp internally).
            crop_type: Crop key matching the referential (e.g. ``"olivier"``).
            gdd_rows: Output of ``precompute_gdd_rows`` or equivalent.
            model_version: Bumped when the GDD formula changes to invalidate stale cache.
        """
        if not self.supabase_url or not self.supabase_key or not gdd_rows:
            return False
        lat = self._round_weather_coordinate(latitude)
        lon = self._round_weather_coordinate(longitude)
        gdd_col = f"gdd_{crop_type}"
        rows: List[Dict[str, Any]] = []
        for r in gdd_rows:
            gdd_val = r.get(gdd_col)
            if gdd_val is None:
                continue
            date_val = r.get("date")
            if not date_val:
                continue
            date_str = str(date_val)
            try:
                datetime.fromisoformat(date_str)
            except ValueError:
                logger.warning(f"Skipping GDD row with invalid date: {date_str}")
                continue
            rows.append(
                {
                    "latitude": lat,
                    "longitude": lon,
                    "date": date_str,
                    "crop_type": crop_type,
                    "gdd_daily": round(float(gdd_val), 4),
                    "chill_hours": r.get("chill_hours"),
                    "model_version": model_version,
                }
            )
        if not rows:
            return False
        try:
            client = await self._get_sdk_client()
            for i in range(0, len(rows), 500):
                chunk = rows[i : i + 500]
                await (
                    client.table("weather_gdd_daily")
                    .upsert(chunk, on_conflict="latitude,longitude,date,crop_type")
                    .execute()
                )
            return True
        except Exception as e:
            logger.error(f"Error upserting GDD rows for {crop_type}: {e}")
            return False

    async def get_monthly_gdd_by_cycle(
        self,
        latitude: float,
        longitude: float,
        start_date: str,
        end_date: str,
        cycle_start_month: int = 12,
        crop_type: str = "olivier",
    ) -> List[Dict[str, Any]]:
        """Return monthly GDD aggregates reset per agronomic cycle — pure SQL, no Python compute.

        Reads from ``weather_gdd_daily`` (generic crop table) joined with
        ``weather_daily_data`` for precipitation.

        cycle_start_month=12 → cycle Dec(Y-1)..Nov(Y), year key = Y.
        Returns rows: {cycle_year, month_key, gdd_total, precip_total, gdd_cumulative}.
        """
        import re

        if not self.supabase_url or not self.supabase_key:
            return []
        # Validate crop_type to a safe identifier before interpolating into SQL
        if not re.fullmatch(r"[a-z][a-z0-9_]*", crop_type):
            logger.error(f"Invalid crop_type for SQL query: {crop_type!r}")
            return []
        lat = self._round_weather_coordinate(latitude)
        lon = self._round_weather_coordinate(longitude)

        sql = f"""
        WITH monthly AS (
            SELECT
                CASE
                    WHEN EXTRACT(MONTH FROM g.date) >= {cycle_start_month}
                    THEN EXTRACT(YEAR FROM g.date)::int + 1
                    ELSE EXTRACT(YEAR FROM g.date)::int
                END AS cycle_year,
                TO_CHAR(g.date, 'YYYY-MM') AS month_key,
                SUM(g.gdd_daily) AS gdd_total,
                SUM(w.precipitation_sum) AS precip_total
            FROM weather_gdd_daily g
            LEFT JOIN weather_daily_data w
                ON w.latitude = g.latitude AND w.longitude = g.longitude AND w.date = g.date
            WHERE g.latitude = {lat}
              AND g.longitude = {lon}
              AND g.crop_type = '{crop_type}'
              AND g.date BETWEEN '{start_date}' AND '{end_date}'
            GROUP BY cycle_year, month_key
        )
        SELECT
            cycle_year,
            month_key,
            ROUND(gdd_total::numeric, 3) AS gdd_total,
            ROUND(precip_total::numeric, 2) AS precip_total,
            ROUND(SUM(gdd_total) OVER (
                PARTITION BY cycle_year ORDER BY month_key
            )::numeric, 3) AS gdd_cumulative
        FROM monthly
        ORDER BY cycle_year, month_key
        """

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{self.supabase_url}/rest/v1/rpc/execute_sql",
                    headers=self.headers,
                    json={"query": sql},
                )
                if response.status_code == 404:
                    # execute_sql RPC not available — caller falls back to Python
                    return []
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching monthly GDD by cycle: {e}")
            return []

    async def get_organizations_with_active_subscriptions(
        self,
    ) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/subscriptions",
                    headers={**self.headers, "Accept": "application/json"},
                    params={
                        "select": "organization_id,organizations(id,name)",
                        "status": "in.(active,trialing)",
                    },
                )
                response.raise_for_status()
                rows = response.json()
                results = []
                for row in rows:
                    org = row.get("organizations")
                    if org:
                        results.append({"id": org["id"], "name": org.get("name", "")})
                return results
        except Exception as e:
            logger.error(f"Error fetching organizations with active subscriptions: {e}")
            return []


# Singleton instance
supabase_service = SupabaseService()
