from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import httpx


@dataclass
class RasterStorageConfig:
    supabase_url: str
    supabase_service_key: str
    bucket: str = "satellite-data"


class CalibrationRasterStorage:
    def __init__(self, config: RasterStorageConfig):
        self.config = config

    def build_path(
        self,
        organization_id: str,
        parcel_id: str,
        raster_date: str,
        index: str,
        filename: Optional[str] = None,
    ) -> str:
        safe_filename = filename or f"{index.lower()}.tif"
        return f"calibration-rasters/{organization_id}/{parcel_id}/{raster_date}/{safe_filename}"

    async def upload_raster(
        self,
        *,
        organization_id: str,
        parcel_id: str,
        raster_date: str,
        index: str,
        file_data: bytes,
        filename: Optional[str] = None,
    ) -> str:
        path = self.build_path(
            organization_id=organization_id,
            parcel_id=parcel_id,
            raster_date=raster_date,
            index=index,
            filename=filename,
        )

        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{self.config.supabase_url}/storage/v1/object/{self.config.bucket}/{path}",
                headers={
                    "apikey": self.config.supabase_service_key,
                    "Authorization": f"Bearer {self.config.supabase_service_key}",
                    "Content-Type": "application/octet-stream",
                    "x-upsert": "true",
                },
                content=file_data,
            )
            response.raise_for_status()

        return self.public_url(path)

    def public_url(self, path: str) -> str:
        return f"{self.config.supabase_url}/storage/v1/object/public/{self.config.bucket}/{path}"
