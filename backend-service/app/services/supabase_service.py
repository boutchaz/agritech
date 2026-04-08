import os
import math
import uuid
import base64
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import httpx
import json
import logging
from ..core.config import settings

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

    @staticmethod
    def _round_weather_coordinate(value: float) -> float:
        """Round coordinates so nearby AOIs reuse the same weather cache entry."""
        return round(float(value), 2)

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
                payload = response.json()
                if isinstance(payload, list):
                    return payload
                logger.warning(
                    "satellite_indices_data returned non-list payload: %s",
                    type(payload).__name__,
                )
                return []
        except Exception as e:
            logger.error(f"Error fetching satellite data: {e}")
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
