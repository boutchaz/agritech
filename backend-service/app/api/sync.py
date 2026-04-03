from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import math

from app.middleware.auth import get_current_user_or_service

router = APIRouter(dependencies=[Depends(get_current_user_or_service)])
logger = logging.getLogger(__name__)

CORE_INDICES = ["NIRv", "EVI", "NDRE", "NDMI"]
SYNC_WINDOW_YEARS = 2


class ParcelSyncRequest(BaseModel):
    parcel_id: str
    organization_id: str
    boundary: List[List[float]]
    farm_id: Optional[str] = None
    parcel_name: Optional[str] = None
    indices: Optional[List[str]] = None


class ParcelSyncResponse(BaseModel):
    status: str
    parcel_id: str
    message: str


def _boundary_to_geojson(boundary: List[List[float]]) -> Dict[str, Any]:
    def _to_wgs84(x: float, y: float) -> List[float]:
        if abs(x) > 180 or abs(y) > 90:
            lon = (x / 20037508.34) * 180
            lat = (
                math.atan(math.exp((y / 20037508.34) * math.pi)) * 360 / math.pi
            ) - 90
            return [lon, lat]
        return [x, y]

    coords = [_to_wgs84(coord[0], coord[1]) for coord in boundary]
    if coords and coords[0] != coords[-1]:
        coords.append(coords[0])
    return {"type": "Polygon", "coordinates": [coords]}


async def _run_parcel_sync(
    parcel_id: str,
    organization_id: str,
    boundary: List[List[float]],
    farm_id: Optional[str],
    parcel_name: Optional[str],
    indices: List[str],
):
    from app.services.satellite.factory import get_satellite_provider
    from app.services.supabase_service import supabase_service

    geometry = _boundary_to_geojson(boundary)
    end_date = datetime.utcnow().strftime("%Y-%m-%d")
    start_date = (datetime.utcnow() - timedelta(days=SYNC_WINDOW_YEARS * 365)).strftime(
        "%Y-%m-%d"
    )

    logger.info(
        f"Starting sync for parcel {parcel_id}: {len(indices)} indices, "
        f"{start_date} to {end_date}"
    )

    try:
        satellite_provider = get_satellite_provider()
        provider_name = satellite_provider.provider_name
    except Exception as e:
        logger.error(f"Failed to initialize satellite provider for sync: {e}")
        return

    logger.info(f"Using satellite provider: {provider_name}")

    total_saved = 0

    for index in indices:
        try:
            ts_result = satellite_provider.get_time_series(
                geometry,
                start_date,
                end_date,
                index,
                "week",
            )

            for point in ts_result.data:
                if point.value is None:
                    continue
                try:
                    await supabase_service.save_satellite_data(
                        {
                            "parcel_id": parcel_id,
                            "organization_id": organization_id,
                            "farm_id": farm_id,
                            "index_name": index,
                            "date": str(point.date)[:10],
                            "mean_value": float(point.value),
                            "image_source": "sentinel-2",
                        }
                    )
                    total_saved += 1
                except Exception:
                    pass

            logger.info(
                f"Synced {index} for parcel {parcel_id} via {provider_name}: "
                f"{len(ts_result.data)} points"
            )
        except Exception as e:
            logger.error(f"Failed to sync {index} for parcel {parcel_id}: {e}")
            continue

    logger.info(
        f"Sync complete for parcel {parcel_id}: {total_saved} data points saved"
    )


@router.post("/parcel", response_model=ParcelSyncResponse)
async def sync_parcel(
    request: ParcelSyncRequest,
    background_tasks: BackgroundTasks,
):
    if not request.boundary or len(request.boundary) < 3:
        raise HTTPException(
            status_code=400,
            detail="Boundary must have at least 3 coordinates",
        )

    indices = request.indices or CORE_INDICES

    background_tasks.add_task(
        _run_parcel_sync,
        parcel_id=request.parcel_id,
        organization_id=request.organization_id,
        boundary=request.boundary,
        farm_id=request.farm_id,
        parcel_name=request.parcel_name,
        indices=indices,
    )

    return ParcelSyncResponse(
        status="accepted",
        parcel_id=request.parcel_id,
        message=f"Background sync started for {len(indices)} indices over {SYNC_WINDOW_YEARS} years",
    )


@router.get("/parcel/{parcel_id}/status")
async def get_sync_status(parcel_id: str):
    from app.services.supabase_service import supabase_service

    data = await supabase_service.get_satellite_data(parcel_id)

    if not data:
        return {
            "parcel_id": parcel_id,
            "status": "no_data",
            "total_records": 0,
            "indices": [],
            "date_range": None,
        }

    indices = list({d.get("index_name") for d in data if d.get("index_name")})
    dates = sorted([d.get("date") for d in data if d.get("date")])

    return {
        "parcel_id": parcel_id,
        "status": "synced" if len(indices) >= len(CORE_INDICES) else "partial",
        "total_records": len(data),
        "indices": indices,
        "date_range": {
            "start": dates[0] if dates else None,
            "end": dates[-1] if dates else None,
        },
    }
