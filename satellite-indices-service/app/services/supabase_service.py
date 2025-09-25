import os
import math
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import httpx
import json
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class SupabaseService:
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.supabase_key = settings.SUPABASE_SERVICE_KEY
        self.headers = {
            'apikey': self.supabase_key,
            'Authorization': f'Bearer {self.supabase_key}',
            'Content-Type': 'application/json'
        }
    
    async def get_organization_farms(self, organization_id: str) -> List[Dict[str, Any]]:
        """Get all farms for an organization"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/rpc/get_organization_farms",
                    headers=self.headers,
                    params={'org_uuid': organization_id}
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching organization farms: {e}")
            return []
    
    async def get_farm_parcels(self, farm_id: str) -> List[Dict[str, Any]]:
        """Get all parcels for a farm"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/rpc/get_farm_parcels",
                    headers=self.headers,
                    params={'farm_uuid': farm_id}
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching farm parcels: {e}")
            return []
    
    async def get_farm_hierarchy_tree(self, organization_id: str, root_farm_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get farm hierarchy tree"""
        try:
            async with httpx.AsyncClient() as client:
                params = {'org_uuid': organization_id}
                if root_farm_id:
                    params['root_farm_id'] = root_farm_id
                
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/rpc/get_farm_hierarchy_tree",
                    headers=self.headers,
                    params=params
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching farm hierarchy: {e}")
            return []
    
    async def get_parcel_details(self, parcel_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a parcel"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/parcels",
                    headers=self.headers,
                    params={'id': f'eq.{parcel_id}', 'select': '*'}
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
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/farms",
                    headers=self.headers,
                    params={'id': f'eq.{farm_id}', 'select': '*'}
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
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.supabase_url}/rest/v1/satellite_processing_jobs",
                    headers=self.headers,
                    json=job_data
                )
                response.raise_for_status()
                result = response.json()
                return result[0]['id'] if result else None
        except Exception as e:
            logger.error(f"Error saving processing job: {e}")
            return None
    
    async def update_processing_job(self, job_id: str, updates: Dict[str, Any]) -> bool:
        """Update a processing job"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.supabase_url}/rest/v1/satellite_processing_jobs",
                    headers=self.headers,
                    params={'id': f'eq.{job_id}'},
                    json=updates
                )
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Error updating processing job: {e}")
            return False
    
    async def save_satellite_data(self, data: Dict[str, Any]) -> Optional[str]:
        """Save satellite indices data"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.supabase_url}/rest/v1/satellite_indices_data",
                    headers=self.headers,
                    json=data
                )
                response.raise_for_status()
                result = response.json()
                return result[0]['id'] if result else None
        except Exception as e:
            logger.error(f"Error saving satellite data: {e}")
            return None
    
    async def get_satellite_data(self, parcel_id: str, date_range: Optional[Dict[str, str]] = None) -> List[Dict[str, Any]]:
        """Get satellite indices data for a parcel"""
        try:
            async with httpx.AsyncClient() as client:
                params = {'parcel_id': f'eq.{parcel_id}'}
                if date_range:
                    if date_range.get('start_date'):
                        params['date'] = f'gte.{date_range["start_date"]}'
                    if date_range.get('end_date'):
                        params['date'] = f'lte.{date_range["end_date"]}'
                
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/satellite_indices_data",
                    headers=self.headers,
                    params=params
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching satellite data: {e}")
            return []
    
    async def convert_boundary_to_geojson(self, boundary: List[List[float]]) -> Dict[str, Any]:
        """Convert parcel boundary to GeoJSON format"""
        try:
            # Check if coordinates are in Web Mercator (EPSG:3857) or geographic (WGS84)
            first_coord = boundary[0]
            geo_coordinates: List[List[float]]

            if abs(first_coord[0]) > 180 or abs(first_coord[1]) > 90:
                # Coordinates are in Web Mercator (EPSG:3857), need to convert to WGS84
                logger.info('Converting coordinates from Web Mercator to WGS84')
                geo_coordinates = []
                for coord in boundary:
                    x, y = coord
                    # Convert from Web Mercator to WGS84
                    lon = (x / 20037508.34) * 180
                    lat = (math.atan(math.exp((y / 20037508.34) * math.pi)) * 360 / math.pi) - 90
                    geo_coordinates.append([lon, lat])
            else:
                # Coordinates are already in geographic (WGS84)
                logger.info('Coordinates are already in WGS84')
                geo_coordinates = boundary

            # Ensure the polygon is closed (first and last points should be the same)
            if geo_coordinates and len(geo_coordinates) > 0:
                first = geo_coordinates[0]
                last = geo_coordinates[-1]
                if first[0] != last[0] or first[1] != last[1]:
                    geo_coordinates.append([first[0], first[1]])

            return {
                'type': 'Polygon',
                'coordinates': [geo_coordinates]
            }
        except Exception as e:
            logger.error(f"Error converting boundary to GeoJSON: {e}")
            return {
                'type': 'Polygon',
                'coordinates': [[]]
            }
    
    async def get_organization_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Get organizations for a user"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.supabase_url}/rest/v1/rpc/get_user_organizations",
                    headers=self.headers,
                    params={'user_uuid': user_id}
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching user organizations: {e}")
            return []

# Singleton instance
supabase_service = SupabaseService()
