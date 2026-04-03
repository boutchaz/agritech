import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Depends
from typing import List, Dict, Optional, Tuple
import uuid
import hashlib
import json
import time
import traceback
from datetime import datetime, timedelta
from app.models.schemas import (
    IndexCalculationRequest,
    IndexCalculationResponse,
    TimeSeriesRequest,
    TimeSeriesResponse,
    ExportRequest,
    ExportResponse,
    InteractiveRequest,
    InteractiveDataResponse,
    HeatmapRequest,
    HeatmapDataResponse,
    AvailableDatesRequest,
    IndexValue,
    ErrorResponse,
)
from app.services.satellite import get_satellite_provider
from app.services.supabase_service import supabase_service
import logging
import ee
import httpx

from app.middleware.auth import get_current_user_or_service

router = APIRouter(dependencies=[Depends(get_current_user_or_service)])
logger = logging.getLogger(__name__)


def _geometry_fingerprint(geometry: Dict) -> str:
    """Create a short hash fingerprint of geometry for log correlation."""
    raw = json.dumps(geometry, sort_keys=True)
    return hashlib.md5(raw.encode()).hexdigest()[:8]


def _lon_to_utm_zone(lon: float) -> int:
    """Convert a longitude to its UTM zone number (1-60)."""
    return int((lon + 180) / 6) + 1


def _utm_epsg(lon: float, lat: float) -> str:
    """Return the EPSG code for the UTM zone at a given lon/lat."""
    zone = _lon_to_utm_zone(lon)
    if lat >= 0:
        return f"EPSG:{32600 + zone}"
    return f"EPSG:{32700 + zone}"


def _get_utm_info(lons: List[float], lats: List[float]) -> Dict:
    """Compute UTM zone info from coordinate lists for diagnostic logging.

    Returns a dict with:
      - zone: primary UTM zone number (from centroid)
      - epsg: EPSG code for the primary zone
      - hemisphere: 'N' or 'S'
      - spans_zones: True if the geometry crosses a UTM zone boundary
      - all_zones: list of all UTM zones the geometry touches
      - zone_boundary_lon: the nearest zone boundary longitude (if close)
    """
    if not lons or not lats:
        return {"error": "no_coordinates"}

    center_lon = sum(lons) / len(lons)
    center_lat = sum(lats) / len(lats)
    primary_zone = _lon_to_utm_zone(center_lon)
    hemisphere = "N" if center_lat >= 0 else "S"
    epsg = _utm_epsg(center_lon, center_lat)

    # Check all zones the geometry touches
    min_zone = _lon_to_utm_zone(min(lons))
    max_zone = _lon_to_utm_zone(max(lons))
    all_zones = list(range(min_zone, max_zone + 1))
    spans_zones = len(all_zones) > 1

    info = {
        "zone": primary_zone,
        "epsg": epsg,
        "hemisphere": hemisphere,
        "spans_zones": spans_zones,
        "all_zones": all_zones,
    }

    # Check proximity to nearest zone boundary (zone boundaries at -180, -174, -168, ... i.e. every 6° from -180)
    # Zone N starts at longitude = -180 + (N-1)*6
    zone_west_boundary = -180 + (primary_zone - 1) * 6
    zone_east_boundary = zone_west_boundary + 6
    dist_to_west = abs(min(lons) - zone_west_boundary)
    dist_to_east = abs(max(lons) - zone_east_boundary)
    nearest_boundary_dist = min(dist_to_west, dist_to_east)
    nearest_boundary_lon = zone_west_boundary if dist_to_west < dist_to_east else zone_east_boundary

    if nearest_boundary_dist < 0.5:  # within ~55 km of a zone boundary
        info["near_zone_boundary"] = True
        info["zone_boundary_lon"] = nearest_boundary_lon
        info["dist_to_boundary_deg"] = round(nearest_boundary_dist, 4)
    else:
        info["near_zone_boundary"] = False

    return info


def _geometry_summary(geometry: Dict) -> Dict:
    """Extract a human-readable summary of the geometry for logging, including UTM zone info."""
    geo_type = geometry.get("type", "unknown")
    coords = geometry.get("coordinates", [])

    summary = {"type": geo_type, "fingerprint": _geometry_fingerprint(geometry)}

    try:
        if geo_type == "Polygon" and coords:
            ring = coords[0]
            summary["num_vertices"] = len(ring)
            lons = [p[0] for p in ring]
            lats = [p[1] for p in ring]
            summary["bbox"] = {
                "min_lon": round(min(lons), 6),
                "max_lon": round(max(lons), 6),
                "min_lat": round(min(lats), 6),
                "max_lat": round(max(lats), 6),
            }
            summary["center"] = {
                "lon": round(sum(lons) / len(lons), 6),
                "lat": round(sum(lats) / len(lats), 6),
            }
            summary["utm"] = _get_utm_info(lons, lats)
        elif geo_type == "MultiPolygon" and coords:
            total_vertices = sum(len(ring) for poly in coords for ring in poly)
            summary["num_polygons"] = len(coords)
            summary["total_vertices"] = total_vertices
            all_lons = [p[0] for poly in coords for ring in poly for p in ring]
            all_lats = [p[1] for poly in coords for ring in poly for p in ring]
            if all_lons and all_lats:
                summary["bbox"] = {
                    "min_lon": round(min(all_lons), 6),
                    "max_lon": round(max(all_lons), 6),
                    "min_lat": round(min(all_lats), 6),
                    "max_lat": round(max(all_lats), 6),
                }
                summary["center"] = {
                    "lon": round(sum(all_lons) / len(all_lons), 6),
                    "lat": round(sum(all_lats) / len(all_lats), 6),
                }
                summary["utm"] = _get_utm_info(all_lons, all_lats)
        elif geo_type == "Point" and isinstance(coords, list) and len(coords) == 2:
            summary["lon"] = coords[0]
            summary["lat"] = coords[1]
            summary["utm"] = _get_utm_info([coords[0]], [coords[1]])
    except Exception as e:
        summary["parse_error"] = str(e)

    return summary


def _coords_depth(coords) -> int:
    """Determine nesting depth of coordinate arrays (for geometry validation logging)."""
    if not isinstance(coords, (list, tuple)) or not coords:
        return 0
    first = coords[0]
    if isinstance(first, (int, float)):
        return 1
    return 1 + _coords_depth(first)

async def _to_thread(fn, *args, **kwargs):
    """Run a blocking function in a thread pool so it doesn't block the async event loop.

    GEE's .getInfo() calls are synchronous and can take 10-120+ seconds.
    Running them on the main event loop blocks ALL concurrent requests.
    """
    return await asyncio.to_thread(fn, *args, **kwargs)


def _run_coro_sync(async_fn, *args, **kwargs):
    """Run an async-def-but-actually-blocking function synchronously.

    Some earth_engine_service methods are marked 'async def' but internally
    only call synchronous getInfo(). This helper lets us run them via to_thread.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(async_fn(*args, **kwargs))
    finally:
        loop.close()


def _extract_centroid(geometry: Dict) -> Optional[Tuple[float, float]]:
    """Extract a simple centroid (lat, lon) from GeoJSON geometry coordinates."""
    geo_type = geometry.get("type")
    coordinates = geometry.get("coordinates", [])

    points: List[List[float]] = []
    if geo_type == "Polygon" and coordinates:
        points = coordinates[0]
    elif geo_type == "MultiPolygon" and coordinates and coordinates[0]:
        points = coordinates[0][0]
    elif (
        geo_type == "Point" and isinstance(coordinates, list) and len(coordinates) == 2
    ):
        points = [coordinates]

    if not points:
        logger.warning(
            f"[centroid] Could not extract points from geometry type={geo_type}, "
            f"coordinates_len={len(coordinates)}"
        )
        return None

    lons = [p[0] for p in points]
    lats = [p[1] for p in points]
    centroid = (sum(lats) / len(lats), sum(lons) / len(lons))
    logger.debug(
        f"[centroid] Extracted centroid lat={centroid[0]:.6f}, lon={centroid[1]:.6f} "
        f"from {len(points)} points"
    )
    return centroid


async def _fetch_daily_par(
    latitude: float,
    longitude: float,
    start_date: str,
    end_date: str,
) -> Dict[str, float]:
    """
    Fetch daily PAR approximation from Open-Meteo archive.
    PAR ≈ 0.48 * shortwave_radiation_sum.

    Note: The archive API typically has a 2-5 day delay, so we cap the end date
    to 5 days ago to avoid requesting data that isn't available yet.
    """
    # Cap end date to 5 days ago (archive API delay)
    today = datetime.utcnow().date()
    max_available_date = today - timedelta(days=5)
    capped_end_date = min(
        datetime.strptime(end_date[:10], "%Y-%m-%d").date(), max_available_date
    )

    # Don't request if start_date is after capped_end_date
    start_dt = datetime.strptime(start_date[:10], "%Y-%m-%d").date()
    if start_dt > capped_end_date:
        logger.info(
            f"[PAR] Data not available yet for {start_date} to {end_date} "
            f"(archive delay: max available is {max_available_date}). "
            f"start_dt={start_dt}, capped_end_date={capped_end_date}"
        )
        return {}

    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "start_date": start_date[:10],
        "end_date": capped_end_date.strftime("%Y-%m-%d"),
        "daily": "shortwave_radiation_sum",
        "timezone": "UTC",
    }

    logger.debug(
        f"[PAR] Fetching from Open-Meteo: lat={latitude:.6f}, lon={longitude:.6f}, "
        f"start={start_date[:10]}, end={capped_end_date}, url={url}"
    )

    try:
        t0 = time.monotonic()
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            payload = response.json()
        elapsed = time.monotonic() - t0

        daily = payload.get("daily", {})
        dates = daily.get("time", [])
        shortwave = daily.get("shortwave_radiation_sum", [])

        logger.debug(
            f"[PAR] Open-Meteo response in {elapsed:.2f}s: "
            f"{len(dates)} dates returned, {len(shortwave)} shortwave values"
        )

        null_count = 0
        par_by_date: Dict[str, float] = {}
        for date_str, sw in zip(dates, shortwave):
            if sw is None:
                null_count += 1
                continue
            par_by_date[date_str] = float(sw) * 0.48

        logger.info(
            f"[PAR] Fetched PAR data for {len(par_by_date)} days "
            f"({start_date[:10]} to {capped_end_date}), "
            f"null_values={null_count}, elapsed={elapsed:.2f}s"
        )
        return par_by_date
    except httpx.HTTPStatusError as exc:
        logger.warning(
            f"[PAR] HTTP error from Open-Meteo: status={exc.response.status_code}, "
            f"body={exc.response.text[:500]}"
        )
        return {}
    except Exception as exc:
        logger.warning(
            f"[PAR] Failed to fetch PAR data from Open-Meteo: {exc}\n"
            f"{traceback.format_exc()}"
        )
        return {}


def _window_par_mean(
    start_date: str,
    step_days: int,
    par_by_date: Dict[str, float],
) -> Optional[float]:
    """Compute mean PAR over [start_date, start_date + step_days)."""
    start_dt = datetime.strptime(start_date[:10], "%Y-%m-%d")
    values: List[float] = []

    for offset in range(max(step_days, 1)):
        current = (start_dt + timedelta(days=offset)).strftime("%Y-%m-%d")
        par_value = par_by_date.get(current)
        if par_value is not None:
            values.append(par_value)

    if not values:
        return None
    return sum(values) / len(values)


def _daily_date_range(start_date: str, end_date: str) -> List[str]:
    """Build an inclusive YYYY-MM-DD date range."""
    start_dt = datetime.strptime(start_date[:10], "%Y-%m-%d")
    end_dt = datetime.strptime(end_date[:10], "%Y-%m-%d")
    dates: List[str] = []

    current = start_dt
    while current <= end_dt:
        dates.append(current.strftime("%Y-%m-%d"))
        current += timedelta(days=1)

    return dates


@router.post("/calculate", response_model=IndexCalculationResponse)
async def calculate_indices(
    request: IndexCalculationRequest,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    """Calculate vegetation indices for a given AOI and date range"""
    req_id = str(uuid.uuid4())[:8]
    geo_summary = _geometry_summary(request.aoi.geometry.model_dump())
    indices_requested = [idx.value for idx in request.indices]

    logger.info(
        f"[calculate][{req_id}] === START === "
        f"aoi_name={request.aoi.name!r}, "
        f"geometry={geo_summary}, "
        f"dates={request.date_range.start_date} -> {request.date_range.end_date}, "
        f"indices={indices_requested}, "
        f"cloud_coverage={request.cloud_coverage}, "
        f"scale={request.scale}, "
        f"use_aoi_cloud_filter={request.use_aoi_cloud_filter}, "
        f"cloud_buffer_meters={request.cloud_buffer_meters}, "
        f"provider_param={provider!r}"
    )

    utm_info = geo_summary.get("utm", {})
    if utm_info:
        log_fn = logger.warning if utm_info.get("spans_zones") or utm_info.get("near_zone_boundary") else logger.info
        log_fn(
            f"[calculate][{req_id}] UTM zone: {utm_info.get('zone')} {utm_info.get('hemisphere', '')} "
            f"(EPSG={utm_info.get('epsg')}), "
            f"spans_zones={utm_info.get('spans_zones')}, "
            f"all_zones={utm_info.get('all_zones')}, "
            f"near_boundary={utm_info.get('near_zone_boundary')}, "
            f"boundary_dist_deg={utm_info.get('dist_to_boundary_deg', 'N/A')}"
        )

    t_start = time.monotonic()

    try:
        # Get satellite provider
        satellite_provider = get_satellite_provider(provider)
        logger.info(
            f"[calculate][{req_id}] Provider resolved: {satellite_provider.provider_name}"
        )

        # For GEE provider, use the existing service directly for collection access
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            def _gee_calculate_indices():
                t_gee = time.monotonic()

                # Get Sentinel-2 collection with AOI-based cloud filtering if requested
                logger.info(
                    f"[calculate][{req_id}] GEE: Fetching Sentinel-2 collection..."
                )
                # Force tile-level only: SCL reserved for available-dates. B2,B3,B4,B8 at 10m.
                collection = earth_engine_service.get_sentinel2_collection(
                    request.aoi.geometry.model_dump(),
                    request.date_range.start_date,
                    request.date_range.end_date,
                    request.cloud_coverage,
                    use_aoi_cloud_filter=False,
                    cloud_buffer_meters=request.cloud_buffer_meters,
                )

                collection_size = collection.size().getInfo()
                logger.info(
                    f"[calculate][{req_id}] GEE: Collection size={collection_size} images, "
                    f"elapsed={time.monotonic() - t_gee:.2f}s"
                )

                if collection_size == 0:
                    logger.warning(
                        f"[calculate][{req_id}] GEE: EMPTY COLLECTION! "
                        f"No Sentinel-2 images found for geometry={geo_summary['fingerprint']}, "
                        f"dates={request.date_range.start_date} -> {request.date_range.end_date}, "
                        f"cloud_coverage<={request.cloud_coverage}%. "
                        f"This will likely produce null/zero index values."
                    )

                # Get the median composite
                composite = collection.median()

                # Calculate requested indices
                logger.info(
                    f"[calculate][{req_id}] GEE: Computing indices {indices_requested}..."
                )
                t_indices = time.monotonic()
                index_results = earth_engine_service.calculate_vegetation_indices(
                    composite, indices_requested
                )
                logger.info(
                    f"[calculate][{req_id}] GEE: Indices computed (server-side), "
                    f"result_keys={list(index_results.keys())}, "
                    f"elapsed={time.monotonic() - t_indices:.2f}s"
                )

                # Calculate mean values for each index
                aoi = ee.Geometry(request.aoi.geometry.model_dump())
                calculated_values = []

                for index_name, index_image in index_results.items():
                    t_reduce = time.monotonic()
                    mean_value = (
                        index_image.reduceRegion(
                            reducer=ee.Reducer.mean(),
                            geometry=aoi,
                            scale=request.scale,
                            maxPixels=1e13,
                            # Use native projection to avoid "geometry outside projection validity" errors
                        )
                        .get(index_name)
                        .getInfo()
                    )
                    reduce_elapsed = time.monotonic() - t_reduce

                    logger.info(
                        f"[calculate][{req_id}] GEE: reduceRegion for {index_name}: "
                        f"mean_value={mean_value}, "
                        f"is_null={mean_value is None}, "
                        f"elapsed={reduce_elapsed:.2f}s"
                    )

                    if mean_value is None:
                        logger.warning(
                            f"[calculate][{req_id}] GEE: NULL mean for index={index_name}! "
                            f"Possible causes: empty collection, geometry outside image bounds, "
                            f"all pixels masked by clouds. "
                            f"geometry_fingerprint={geo_summary['fingerprint']}, "
                            f"collection_size={collection_size}"
                        )

                    calculated_values.append(
                        {
                            "index": index_name,
                            "value": mean_value if mean_value is not None else 0.0,
                        }
                    )

                total_gee_elapsed = time.monotonic() - t_gee
                logger.info(
                    f"[calculate][{req_id}] GEE: All indices computed. "
                    f"results={calculated_values}, "
                    f"total_gee_elapsed={total_gee_elapsed:.2f}s"
                )
                return calculated_values, collection_size

            calculated_values, image_count = await _to_thread(_gee_calculate_indices)
            index_values = [
                IndexValue(
                    index=item["index"],
                    value=item["value"],
                    timestamp=datetime.utcnow(),
                )
                for item in calculated_values
            ]

            total_elapsed = time.monotonic() - t_start
            logger.info(
                f"[calculate][{req_id}] === DONE === "
                f"provider=GEE, image_count={image_count}, "
                f"results=[{', '.join(f'{iv.index}={iv.value}' for iv in index_values)}], "
                f"total_elapsed={total_elapsed:.2f}s"
            )

            return IndexCalculationResponse(
                request_id=str(uuid.uuid4()),
                timestamp=datetime.utcnow(),
                aoi_name=request.aoi.name,
                indices=index_values,
                metadata={
                    "start_date": request.date_range.start_date,
                    "end_date": request.date_range.end_date,
                    "cloud_coverage": request.cloud_coverage,
                    "scale": request.scale,
                    "image_count": image_count,
                    "provider": "Google Earth Engine",
                },
            )
        else:
            # CDSE provider - use the statistics method to get mean values
            logger.info(
                f"[calculate][{req_id}] CDSE: Fetching statistics for {indices_requested}..."
            )
            index_values = []

            try:
                t_cdse = time.monotonic()
                # Get statistics for all indices at once
                stats_results = await _to_thread(
                    satellite_provider.get_statistics,
                    geometry=request.aoi.geometry.model_dump(),
                    start_date=request.date_range.start_date,
                    end_date=request.date_range.end_date,
                    indices=indices_requested,
                )
                cdse_elapsed = time.monotonic() - t_cdse

                logger.info(
                    f"[calculate][{req_id}] CDSE: Statistics received in {cdse_elapsed:.2f}s, "
                    f"result_keys={list(stats_results.keys()) if stats_results else 'None'}"
                )

                for idx in request.indices:
                    if idx.value in stats_results:
                        stats = stats_results[idx.value].statistics
                        mean_val = stats.get("mean", 0.0)
                        logger.debug(
                            f"[calculate][{req_id}] CDSE: {idx.value} stats={stats}"
                        )
                    else:
                        mean_val = 0.0
                        logger.warning(
                            f"[calculate][{req_id}] CDSE: No stats for {idx.value}, "
                            f"available_keys={list(stats_results.keys())}"
                        )

                    index_values.append(
                        IndexValue(
                            index=idx.value, value=mean_val, timestamp=datetime.utcnow()
                        )
                    )
            except Exception as e:
                logger.warning(
                    f"[calculate][{req_id}] CDSE: Failed to get statistics: {e}\n"
                    f"{traceback.format_exc()}"
                )
                # Return zero values if statistics fail
                for idx in request.indices:
                    index_values.append(
                        IndexValue(
                            index=idx.value, value=0.0, timestamp=datetime.utcnow()
                        )
                    )

            total_elapsed = time.monotonic() - t_start
            logger.info(
                f"[calculate][{req_id}] === DONE === "
                f"provider=CDSE, "
                f"results=[{', '.join(f'{iv.index}={iv.value}' for iv in index_values)}], "
                f"total_elapsed={total_elapsed:.2f}s"
            )

            return IndexCalculationResponse(
                request_id=str(uuid.uuid4()),
                timestamp=datetime.utcnow(),
                aoi_name=request.aoi.name,
                indices=index_values,
                metadata={
                    "start_date": request.date_range.start_date,
                    "end_date": request.date_range.end_date,
                    "cloud_coverage": request.cloud_coverage,
                    "scale": request.scale,
                    "provider": satellite_provider.provider_name,
                },
            )

    except HTTPException:
        raise
    except Exception as e:
        total_elapsed = time.monotonic() - t_start
        logger.error(
            f"[calculate][{req_id}] === FAILED === "
            f"error={e}, elapsed={total_elapsed:.2f}s, "
            f"geometry={geo_summary}, "
            f"dates={request.date_range.start_date} -> {request.date_range.end_date}\n"
            f"{traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/timeseries", response_model=TimeSeriesResponse)
async def get_time_series(
    request: TimeSeriesRequest,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    """Get time series data for a specific vegetation index"""
    req_id = str(uuid.uuid4())[:8]
    geo_summary = _geometry_summary(request.aoi.geometry.model_dump())
    requested_index = request.index.value

    logger.info(
        f"[timeseries][{req_id}] === START === "
        f"aoi_name={request.aoi.name!r}, "
        f"geometry={geo_summary}, "
        f"dates={request.date_range.start_date} -> {request.date_range.end_date}, "
        f"index={requested_index}, "
        f"interval={request.interval.value}, "
        f"cloud_coverage={request.cloud_coverage}, "
        f"use_aoi_cloud_filter={request.use_aoi_cloud_filter}, "
        f"provider_param={provider!r}"
    )

    utm_info = geo_summary.get("utm", {})
    if utm_info:
        log_fn = logger.warning if utm_info.get("spans_zones") or utm_info.get("near_zone_boundary") else logger.info
        log_fn(
            f"[timeseries][{req_id}] UTM zone: {utm_info.get('zone')} {utm_info.get('hemisphere', '')} "
            f"(EPSG={utm_info.get('epsg')}), "
            f"spans_zones={utm_info.get('spans_zones')}, "
            f"all_zones={utm_info.get('all_zones')}, "
            f"near_boundary={utm_info.get('near_zone_boundary')}, "
            f"boundary_dist_deg={utm_info.get('dist_to_boundary_deg', 'N/A')}"
        )

    t_start = time.monotonic()

    try:
        satellite_provider = get_satellite_provider(provider)
        logger.info(
            f"[timeseries][{req_id}] Provider resolved: {satellite_provider.provider_name}"
        )

        base_index = "NIRv" if requested_index == "NIRvP" else requested_index
        if requested_index == "NIRvP":
            logger.info(
                f"[timeseries][{req_id}] NIRvP requested, will fetch NIRv then multiply by PAR"
            )

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            logger.info(
                f"[timeseries][{req_id}] GEE: Calling get_time_series for index={base_index}..."
            )
            t_gee = time.monotonic()
            # Force tile-level only: SCL reserved for available-dates. B2,B3,B4,B8 at 10m.
            time_series_data = await _to_thread(
                earth_engine_service.get_time_series,
                request.aoi.geometry.model_dump(),
                request.date_range.start_date,
                request.date_range.end_date,
                base_index,
                request.interval.value,
                max_cloud_coverage=request.cloud_coverage,
                use_aoi_cloud_filter=False,
            )
            gee_elapsed = time.monotonic() - t_gee

            null_count = sum(1 for p in time_series_data if p.get("value") is None)
            logger.info(
                f"[timeseries][{req_id}] GEE: Returned {len(time_series_data)} data points "
                f"(null_values={null_count}), elapsed={gee_elapsed:.2f}s"
            )
            if time_series_data:
                logger.debug(
                    f"[timeseries][{req_id}] GEE: First 3 points: {time_series_data[:3]}"
                )
                logger.debug(
                    f"[timeseries][{req_id}] GEE: Last 3 points: {time_series_data[-3:]}"
                )
            else:
                logger.warning(
                    f"[timeseries][{req_id}] GEE: EMPTY time series returned! "
                    f"geometry_fingerprint={geo_summary['fingerprint']}, "
                    f"dates={request.date_range.start_date} -> {request.date_range.end_date}, "
                    f"cloud_coverage<={request.cloud_coverage}%"
                )
        else:
            # Use the provider interface
            logger.info(
                f"[timeseries][{req_id}] CDSE: Calling get_time_series for index={base_index}..."
            )
            t_cdse = time.monotonic()
            ts_result = await _to_thread(
                satellite_provider.get_time_series,
                geometry=request.aoi.geometry.model_dump(),
                start_date=request.date_range.start_date,
                end_date=request.date_range.end_date,
                index=base_index,
                interval=request.interval.value,
            )
            cdse_elapsed = time.monotonic() - t_cdse
            time_series_data = [
                {"date": p.date, "value": p.value} for p in ts_result.data
            ]
            logger.info(
                f"[timeseries][{req_id}] CDSE: Returned {len(time_series_data)} data points, "
                f"elapsed={cdse_elapsed:.2f}s"
            )

        # Build NIRvP = NIRv * PAR for time-series use cases
        if requested_index == "NIRvP":
            logger.info(
                f"[timeseries][{req_id}] NIRvP: Starting PAR multiplication. "
                f"Base NIRv points={len(time_series_data)}"
            )
            centroid = _extract_centroid(request.aoi.geometry.model_dump())
            interval_days = {"day": 1, "week": 7, "month": 30, "year": 365}
            step_days = interval_days.get(request.interval.value, 30)
            logger.debug(
                f"[timeseries][{req_id}] NIRvP: centroid={centroid}, step_days={step_days}"
            )

            par_by_date: Dict[str, float] = {}
            if centroid is not None:
                latitude, longitude = centroid

                # 1) Read cache
                logger.debug(
                    f"[timeseries][{req_id}] NIRvP: Checking PAR cache for "
                    f"lat={latitude:.6f}, lon={longitude:.6f}"
                )
                t_cache = time.monotonic()
                par_by_date = await supabase_service.get_cached_par_data(
                    latitude=latitude,
                    longitude=longitude,
                    start_date=request.date_range.start_date,
                    end_date=request.date_range.end_date,
                )
                cache_elapsed = time.monotonic() - t_cache
                logger.info(
                    f"[timeseries][{req_id}] NIRvP: PAR cache returned {len(par_by_date)} days, "
                    f"elapsed={cache_elapsed:.2f}s"
                )

                # 2) Fetch and persist only missing days
                required_dates = set(
                    _daily_date_range(
                        request.date_range.start_date,
                        request.date_range.end_date,
                    )
                )
                missing_dates = sorted(required_dates - set(par_by_date.keys()))
                logger.info(
                    f"[timeseries][{req_id}] NIRvP: PAR coverage: "
                    f"required={len(required_dates)}, cached={len(par_by_date)}, "
                    f"missing={len(missing_dates)}"
                )

                if missing_dates:
                    logger.debug(
                        f"[timeseries][{req_id}] NIRvP: Missing dates range: "
                        f"{missing_dates[0]} -> {missing_dates[-1]}"
                    )
                    fetched_par = await _fetch_daily_par(
                        latitude=latitude,
                        longitude=longitude,
                        start_date=request.date_range.start_date,
                        end_date=request.date_range.end_date,
                    )
                    if fetched_par:
                        missing_par = {
                            date_key: value
                            for date_key, value in fetched_par.items()
                            if date_key in missing_dates
                        }
                        par_by_date.update(missing_par)

                        logger.info(
                            f"[timeseries][{req_id}] NIRvP: Fetched {len(fetched_par)} PAR values, "
                            f"matched_missing={len(missing_par)}, "
                            f"total_par_days={len(par_by_date)}"
                        )

                        if missing_par:
                            await supabase_service.upsert_par_data(
                                latitude=latitude,
                                longitude=longitude,
                                par_by_date=missing_par,
                            )
                            logger.debug(
                                f"[timeseries][{req_id}] NIRvP: Persisted {len(missing_par)} PAR values to cache"
                            )
                    else:
                        logger.warning(
                            f"[timeseries][{req_id}] NIRvP: PAR fetch returned NO data "
                            f"({request.date_range.start_date} -> {request.date_range.end_date}), "
                            f"lat={latitude:.6f}, lon={longitude:.6f}"
                        )
            else:
                logger.warning(
                    f"[timeseries][{req_id}] NIRvP: Could not extract centroid from geometry! "
                    f"PAR multiplication will fail. geometry={geo_summary}"
                )

            fallback_par = (
                sum(par_by_date.values()) / len(par_by_date) if par_by_date else None
            )
            logger.info(
                f"[timeseries][{req_id}] NIRvP: fallback_par={fallback_par}, "
                f"par_by_date_count={len(par_by_date)}"
            )

            nirvp_series = []
            skipped_count = 0
            used_fallback_count = 0
            for point in time_series_data:
                point_date = str(point["date"])[:10]
                par_mean = _window_par_mean(point_date, step_days, par_by_date)
                if par_mean is None:
                    par_mean = fallback_par
                    if par_mean is not None:
                        used_fallback_count += 1
                if par_mean is None:
                    logger.debug(
                        f"[timeseries][{req_id}] NIRvP: Skipping point {point_date}: "
                        f"no PAR data (window or fallback)"
                    )
                    skipped_count += 1
                    continue
                nirvp_series.append(
                    {
                        "date": point_date,
                        "value": float(point["value"]) * float(par_mean),
                    }
                )
            time_series_data = nirvp_series

            logger.info(
                f"[timeseries][{req_id}] NIRvP: Final series: "
                f"output_points={len(nirvp_series)}, "
                f"skipped_no_par={skipped_count}, "
                f"used_fallback={used_fallback_count}"
            )

        # Calculate statistics
        if time_series_data:
            values = [
                point["value"]
                for point in time_series_data
                if point["value"] is not None
            ]
            if values:
                import numpy as np

                statistics = {
                    "mean": float(np.mean(values)),
                    "std": float(np.std(values)),
                    "min": float(np.min(values)),
                    "max": float(np.max(values)),
                    "median": float(np.median(values)),
                }
                logger.debug(f"[timeseries][{req_id}] Statistics: {statistics}")
            else:
                statistics = None
                logger.warning(
                    f"[timeseries][{req_id}] All values in time series are None! "
                    f"data_points={len(time_series_data)}"
                )
        else:
            statistics = None
            logger.warning(
                f"[timeseries][{req_id}] Empty time series data, no statistics to compute"
            )

        total_elapsed = time.monotonic() - t_start
        logger.info(
            f"[timeseries][{req_id}] === DONE === "
            f"index={requested_index}, data_points={len(time_series_data)}, "
            f"has_statistics={statistics is not None}, "
            f"total_elapsed={total_elapsed:.2f}s"
        )

        return TimeSeriesResponse(
            index=requested_index,
            aoi_name=request.aoi.name,
            start_date=request.date_range.start_date,
            end_date=request.date_range.end_date,
            data=time_series_data,
            statistics=statistics,
        )

    except HTTPException:
        raise
    except Exception as e:
        total_elapsed = time.monotonic() - t_start
        logger.error(
            f"[timeseries][{req_id}] === FAILED === "
            f"error={e}, elapsed={total_elapsed:.2f}s, "
            f"index={requested_index}, "
            f"geometry={geo_summary}, "
            f"dates={request.date_range.start_date} -> {request.date_range.end_date}\n"
            f"{traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/export")
async def export_index_map(
    request: ExportRequest,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    """Export vegetation index map as GeoTIFF or interactive data"""
    req_id = str(uuid.uuid4())[:8]
    geo_summary = _geometry_summary(request.aoi.geometry.model_dump())

    logger.info(
        f"[export][{req_id}] === START === "
        f"aoi_name={request.aoi.name!r}, "
        f"geometry={geo_summary}, "
        f"date={request.date}, "
        f"index={request.index.value}, "
        f"scale={request.scale}, "
        f"format={request.format}, "
        f"interactive={request.interactive}, "
        f"provider_param={provider!r}"
    )

    utm_info = geo_summary.get("utm", {})
    if utm_info:
        log_fn = logger.warning if utm_info.get("spans_zones") or utm_info.get("near_zone_boundary") else logger.info
        log_fn(
            f"[export][{req_id}] UTM zone: {utm_info.get('zone')} {utm_info.get('hemisphere', '')} "
            f"(EPSG={utm_info.get('epsg')}), "
            f"spans_zones={utm_info.get('spans_zones')}, "
            f"all_zones={utm_info.get('all_zones')}, "
            f"near_boundary={utm_info.get('near_zone_boundary')}"
        )

    t_start = time.monotonic()

    try:
        satellite_provider = get_satellite_provider(provider)
        logger.info(
            f"[export][{req_id}] Provider resolved: {satellite_provider.provider_name}"
        )

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            logger.info(f"[export][{req_id}] GEE: Calling export_index_map...")
            t_gee = time.monotonic()
            result = await _to_thread(
                _run_coro_sync,
                earth_engine_service.export_index_map,
                request.aoi.geometry.model_dump(),
                request.date,
                request.index.value,
                request.scale,
                interactive=request.interactive,
            )
            gee_elapsed = time.monotonic() - t_gee
            logger.info(
                f"[export][{req_id}] GEE: export_index_map completed in {gee_elapsed:.2f}s, "
                f"result_type={type(result).__name__}, "
                f"result_keys={list(result.keys()) if isinstance(result, dict) else 'N/A'}"
            )
        else:
            # Use the provider interface for CDSE and other providers
            logger.info(f"[export][{req_id}] CDSE: Calling export_index_map...")
            t_cdse = time.monotonic()
            result = await _to_thread(
                _run_coro_sync,
                satellite_provider.export_index_map,
                geometry=request.aoi.geometry.model_dump(),
                date=request.date,
                index=request.index.value,
                scale=request.scale,
                interactive=request.interactive,
            )
            cdse_elapsed = time.monotonic() - t_cdse
            logger.info(
                f"[export][{req_id}] CDSE: export_index_map completed in {cdse_elapsed:.2f}s, "
                f"result_type={type(result).__name__}"
            )

        if request.interactive:
            # Return interactive data for ECharts
            total_elapsed = time.monotonic() - t_start
            logger.info(
                f"[export][{req_id}] === DONE (interactive) === "
                f"total_elapsed={total_elapsed:.2f}s"
            )
            return HeatmapDataResponse(**result)
        else:
            # Return traditional export response
            from datetime import timedelta

            expires_at = datetime.utcnow() + timedelta(hours=24)

            # Handle different result formats from providers
            download_url = (
                result.get("url", "")
                if isinstance(result, dict)
                else getattr(result, "url", "")
            )

            total_elapsed = time.monotonic() - t_start
            logger.info(
                f"[export][{req_id}] === DONE (file) === "
                f"download_url_present={bool(download_url)}, "
                f"total_elapsed={total_elapsed:.2f}s"
            )

            return ExportResponse(
                request_id=str(uuid.uuid4()),
                download_url=download_url,
                expires_at=expires_at,
                file_format=request.format,
                index=request.index.value,
                metadata={
                    "date": request.date,
                    "scale": request.scale,
                    "aoi_name": request.aoi.name,
                },
            )

    except HTTPException:
        raise
    except Exception as e:
        total_elapsed = time.monotonic() - t_start
        logger.error(
            f"[export][{req_id}] === FAILED === "
            f"error={e}, elapsed={total_elapsed:.2f}s, "
            f"geometry={geo_summary}, date={request.date}\n"
            f"{traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/interactive", response_model=InteractiveDataResponse)
async def get_interactive_data(
    request: InteractiveRequest,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    """Get interactive pixel data for scatter plot visualization"""
    req_id = str(uuid.uuid4())[:8]
    geo_summary = _geometry_summary(request.aoi.geometry.model_dump())

    logger.info(
        f"[interactive][{req_id}] === START === "
        f"aoi_name={request.aoi.name!r}, "
        f"geometry={geo_summary}, "
        f"date={request.date}, "
        f"index={request.index.value}, "
        f"scale={request.scale}, "
        f"max_pixels={request.max_pixels}, "
        f"provider_param={provider!r}"
    )

    utm_info = geo_summary.get("utm", {})
    if utm_info:
        log_fn = logger.warning if utm_info.get("spans_zones") or utm_info.get("near_zone_boundary") else logger.info
        log_fn(
            f"[interactive][{req_id}] UTM zone: {utm_info.get('zone')} {utm_info.get('hemisphere', '')} "
            f"(EPSG={utm_info.get('epsg')}), "
            f"spans_zones={utm_info.get('spans_zones')}, "
            f"all_zones={utm_info.get('all_zones')}, "
            f"near_boundary={utm_info.get('near_zone_boundary')}"
        )

    t_start = time.monotonic()

    try:
        satellite_provider = get_satellite_provider(provider)
        logger.info(
            f"[interactive][{req_id}] Provider resolved: {satellite_provider.provider_name}"
        )

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            logger.info(
                f"[interactive][{req_id}] GEE: Calling export_interactive_data..."
            )
            t_gee = time.monotonic()
            data = await _to_thread(
                _run_coro_sync,
                earth_engine_service.export_interactive_data,
                request.aoi.geometry.model_dump(),
                request.date,
                request.index.value,
                request.scale,
                request.max_pixels,
            )
            gee_elapsed = time.monotonic() - t_gee
            logger.info(
                f"[interactive][{req_id}] GEE: Completed in {gee_elapsed:.2f}s, "
                f"result_type={type(data).__name__}, "
                f"result_keys={list(data.keys()) if isinstance(data, dict) else 'N/A'}"
            )
        else:
            # Use the provider interface for CDSE and other providers
            logger.info(
                f"[interactive][{req_id}] CDSE: Calling export_interactive_data..."
            )
            t_cdse = time.monotonic()
            data = await _to_thread(
                _run_coro_sync,
                satellite_provider.export_interactive_data,
                geometry=request.aoi.geometry.model_dump(),
                date=request.date,
                index=request.index.value,
                scale=request.scale,
                max_pixels=request.max_pixels,
            )
            cdse_elapsed = time.monotonic() - t_cdse
            logger.info(
                f"[interactive][{req_id}] CDSE: Completed in {cdse_elapsed:.2f}s"
            )

        total_elapsed = time.monotonic() - t_start
        logger.info(
            f"[interactive][{req_id}] === DONE === total_elapsed={total_elapsed:.2f}s"
        )
        return InteractiveDataResponse(**data)

    except HTTPException:
        raise
    except Exception as e:
        total_elapsed = time.monotonic() - t_start
        logger.error(
            f"[interactive][{req_id}] === FAILED === "
            f"error={e}, elapsed={total_elapsed:.2f}s, "
            f"geometry={geo_summary}, date={request.date}\n"
            f"{traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/heatmap", response_model=HeatmapDataResponse)
async def get_heatmap_data(
    request: HeatmapRequest,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    """Get heatmap data for ECharts heatmap visualization"""
    req_id = str(uuid.uuid4())[:8]
    geo_summary = _geometry_summary(request.aoi.geometry.model_dump())

    logger.info(
        f"[heatmap][{req_id}] === START === "
        f"aoi_name={request.aoi.name!r}, "
        f"geometry={geo_summary}, "
        f"date={request.date}, "
        f"index={request.index.value}, "
        f"grid_size={request.grid_size}, "
        f"provider_param={provider!r}"
    )

    utm_info = geo_summary.get("utm", {})
    if utm_info:
        log_fn = logger.warning if utm_info.get("spans_zones") or utm_info.get("near_zone_boundary") else logger.info
        log_fn(
            f"[heatmap][{req_id}] UTM zone: {utm_info.get('zone')} {utm_info.get('hemisphere', '')} "
            f"(EPSG={utm_info.get('epsg')}), "
            f"spans_zones={utm_info.get('spans_zones')}, "
            f"all_zones={utm_info.get('all_zones')}, "
            f"near_boundary={utm_info.get('near_zone_boundary')}"
        )

    t_start = time.monotonic()

    try:
        satellite_provider = get_satellite_provider(provider)
        logger.info(
            f"[heatmap][{req_id}] Provider resolved: {satellite_provider.provider_name}"
        )

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            logger.info(f"[heatmap][{req_id}] GEE: Calling export_heatmap_data...")
            t_gee = time.monotonic()
            data = await _to_thread(
                _run_coro_sync,
                earth_engine_service.export_heatmap_data,
                request.aoi.geometry.model_dump(),
                request.date,
                request.index.value,
                request.grid_size,
            )
            gee_elapsed = time.monotonic() - t_gee
            logger.info(
                f"[heatmap][{req_id}] GEE: Completed in {gee_elapsed:.2f}s, "
                f"result_type={type(data).__name__}"
            )
        else:
            # Use the provider interface for CDSE and other providers
            logger.info(f"[heatmap][{req_id}] CDSE: Calling export_heatmap_data...")
            t_cdse = time.monotonic()
            data = await _to_thread(
                _run_coro_sync,
                satellite_provider.export_heatmap_data,
                geometry=request.aoi.geometry.model_dump(),
                date=request.date,
                index=request.index.value,
                grid_size=request.grid_size,
            )
            cdse_elapsed = time.monotonic() - t_cdse
            logger.info(f"[heatmap][{req_id}] CDSE: Completed in {cdse_elapsed:.2f}s")

        # Convert dataclass to dict for response
        if hasattr(data, "model_dump"):
            # Pydantic model
            data_dict = data.model_dump()
        elif hasattr(data, "__dict__"):
            # Dataclass
            data_dict = data.__dict__
        else:
            # Dict
            data_dict = data

        logger.debug(
            f"[heatmap][{req_id}] Response data_dict keys={list(data_dict.keys()) if isinstance(data_dict, dict) else 'N/A'}"
        )

        total_elapsed = time.monotonic() - t_start
        logger.info(
            f"[heatmap][{req_id}] === DONE === total_elapsed={total_elapsed:.2f}s"
        )
        return HeatmapDataResponse(**data_dict)

    except ValueError as e:
        total_elapsed = time.monotonic() - t_start
        logger.warning(
            f"[heatmap][{req_id}] === NO DATA (ValueError) === "
            f"error={e}, elapsed={total_elapsed:.2f}s, "
            f"geometry={geo_summary}, date={request.date}"
        )
        raise HTTPException(status_code=404, detail="No data found for the specified parameters")
    except HTTPException:
        raise
    except Exception as e:
        total_elapsed = time.monotonic() - t_start
        logger.error(
            f"[heatmap][{req_id}] === FAILED === "
            f"error={e}, elapsed={total_elapsed:.2f}s, "
            f"geometry={geo_summary}, date={request.date}\n"
            f"{traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/available", response_model=List[str])
async def get_available_indices():
    """Get list of available vegetation indices"""
    from app.models.schemas import VegetationIndex

    return [idx.value for idx in VegetationIndex]


@router.get("/provider-info")
async def get_provider_info():
    """Get information about available and configured satellite providers"""
    from app.services.satellite.factory import get_provider_info

    return get_provider_info()


@router.post("/available-dates")
async def get_available_dates(
    request: AvailableDatesRequest,
    provider: Optional[str] = Query(
        None, description="Satellite provider (gee, cdse, or auto)"
    ),
):
    """Get dates with available satellite imagery for a given AOI and date range"""
    req_id = str(uuid.uuid4())[:8]

    # Parse request parameters from validated Pydantic model
    aoi_geometry = request.aoi.geometry.model_dump()
    start_date = request.start_date
    end_date = request.end_date
    max_cloud_coverage = request.cloud_coverage or 30

    geo_summary = (
        _geometry_summary(aoi_geometry) if aoi_geometry else {"error": "no_geometry"}
    )

    logger.info(
        f"[available-dates][{req_id}] === START === "
        f"geometry={geo_summary}, "
        f"dates={start_date} -> {end_date}, "
        f"max_cloud_coverage={max_cloud_coverage}, "
        f"provider_param={provider!r}"
    )

    utm_info = geo_summary.get("utm", {}) if isinstance(geo_summary, dict) else {}
    if utm_info:
        log_fn = logger.warning if utm_info.get("spans_zones") or utm_info.get("near_zone_boundary") else logger.info
        log_fn(
            f"[available-dates][{req_id}] UTM zone: {utm_info.get('zone')} {utm_info.get('hemisphere', '')} "
            f"(EPSG={utm_info.get('epsg')}), "
            f"spans_zones={utm_info.get('spans_zones')}, "
            f"all_zones={utm_info.get('all_zones')}, "
            f"near_boundary={utm_info.get('near_zone_boundary')}, "
            f"boundary_dist_deg={utm_info.get('dist_to_boundary_deg', 'N/A')}"
        )

    # Log full raw geometry for deep debugging (truncated for very large geometries)
    if aoi_geometry:
        raw_geo_str = json.dumps(aoi_geometry)
        if len(raw_geo_str) > 2000:
            logger.debug(
                f"[available-dates][{req_id}] Raw geometry (truncated): {raw_geo_str[:2000]}..."
            )
        else:
            logger.debug(
                f"[available-dates][{req_id}] Raw geometry: {raw_geo_str}"
            )

    t_start = time.monotonic()

    try:
        # Date format and range already validated by Pydantic model.
        # Additional runtime checks below for logging purposes.
        try:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d")
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d")
            date_span_days = (parsed_end - parsed_start).days
            logger.info(
                f"[available-dates][{req_id}] Date validation: "
                f"start={parsed_start.date()}, end={parsed_end.date()}, "
                f"span={date_span_days} days, "
                f"start_is_future={parsed_start.date() > datetime.utcnow().date()}, "
                f"end_is_future={parsed_end.date() > datetime.utcnow().date()}"
            )
            if date_span_days <= 0:
                logger.warning(
                    f"[available-dates][{req_id}] Invalid date range: "
                    f"start={start_date} >= end={end_date} (span={date_span_days} days)"
                )
            if date_span_days > 365:
                logger.info(
                    f"[available-dates][{req_id}] Large date range: {date_span_days} days "
                    f"(>{date_span_days // 30} months). This may return many images."
                )
        except ValueError as ve:
            logger.error(
                f"[available-dates][{req_id}] Date parse error: {ve}, "
                f"start_date={start_date!r}, end_date={end_date!r}"
            )

        # Validate geometry structure
        geo_type = aoi_geometry.get("type", "MISSING") if isinstance(aoi_geometry, dict) else type(aoi_geometry).__name__
        geo_coords = aoi_geometry.get("coordinates", []) if isinstance(aoi_geometry, dict) else []
        logger.info(
            f"[available-dates][{req_id}] Geometry validation: "
            f"type={geo_type}, "
            f"has_coordinates={bool(geo_coords)}, "
            f"coordinates_depth={_coords_depth(geo_coords)}, "
            f"is_dict={isinstance(aoi_geometry, dict)}"
        )

        # Get satellite provider
        satellite_provider = get_satellite_provider(provider)
        logger.info(
            f"[available-dates][{req_id}] Provider resolved: {satellite_provider.provider_name}"
        )

        # For GEE provider, use the existing service directly
        if satellite_provider.provider_name == "Google Earth Engine":
            from app.services import earth_engine_service

            # Initialize Earth Engine
            logger.debug(f"[available-dates][{req_id}] GEE: Initializing Earth Engine...")
            t_init = time.monotonic()
            earth_engine_service.initialize()
            init_elapsed = time.monotonic() - t_init
            logger.debug(
                f"[available-dates][{req_id}] GEE: Earth Engine init took {init_elapsed:.2f}s"
            )

            # Convert geometry to GEE object
            logger.debug(
                f"[available-dates][{req_id}] GEE: Converting geometry to ee.Geometry..."
            )
            try:
                aoi = ee.Geometry(aoi_geometry)
            except Exception as geo_err:
                logger.error(
                    f"[available-dates][{req_id}] GEE: ee.Geometry() FAILED! "
                    f"error={geo_err}, geometry_type={geo_type}, "
                    f"coordinates_preview={str(geo_coords)[:500]}"
                )
                raise

            # Compute geometry area for diagnostics
            try:
                t_area = time.monotonic()
                area_sq_m = aoi.area().getInfo()
                area_elapsed = time.monotonic() - t_area
                area_hectares = area_sq_m / 10000.0 if area_sq_m else 0
                logger.info(
                    f"[available-dates][{req_id}] GEE: Geometry area = {area_sq_m:.2f} m² "
                    f"({area_hectares:.2f} hectares), computed in {area_elapsed:.2f}s"
                )
                if area_sq_m and area_sq_m < 100:
                    logger.warning(
                        f"[available-dates][{req_id}] GEE: VERY SMALL geometry area "
                        f"({area_sq_m:.2f} m²). May not intersect any S2 pixels at 10m resolution."
                    )
                if area_sq_m and area_sq_m > 1e9:
                    logger.warning(
                        f"[available-dates][{req_id}] GEE: VERY LARGE geometry area "
                        f"({area_hectares:.0f} ha). May span multiple S2 tiles with varying coverage."
                    )
            except Exception as area_err:
                logger.warning(
                    f"[available-dates][{req_id}] GEE: Could not compute geometry area: {area_err}"
                )
                area_hectares = None

            # For available-dates we use AOI-LEVEL cloud filtering by default.
            # This calculates the actual cloud coverage within the user's AOI
            # using the SCL band, which is more accurate than tile-level metadata.
            end_dt_inclusive = (
                datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            ).strftime("%Y-%m-%d")

            logger.info(
                f"[available-dates][{req_id}] GEE: Querying S2_SR_HARMONIZED with AOI-level cloud filtering, "
                f"filterDate={start_date} -> {end_dt_inclusive} (inclusive), "
                f"max_aoi_cloud_coverage={max_cloud_coverage}%"
            )

            # Get collection WITHOUT tile-level cloud filter first
            # We'll apply AOI-level filtering instead
            unfiltered_collection = (
                ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                .filterBounds(aoi)
                .filterDate(start_date, end_dt_inclusive)
            )

            # Get collection size
            def _gee_get_unfiltered_size():
                return unfiltered_collection.size().getInfo()

            logger.info(
                f"[available-dates][{req_id}] GEE: Checking unfiltered collection size..."
            )
            t_sizes = time.monotonic()
            unfiltered_count = await _to_thread(_gee_get_unfiltered_size)
            sizes_elapsed = time.monotonic() - t_sizes
            logger.info(
                f"[available-dates][{req_id}] GEE: Unfiltered collection size: {unfiltered_count}, "
                f"elapsed={sizes_elapsed:.2f}s"
            )

            if unfiltered_count == 0:
                logger.warning(
                    f"[available-dates][{req_id}] GEE: ZERO images found! "
                    f"This means NO Sentinel-2 data intersects this geometry for this date range. "
                    f"geometry_fingerprint={geo_summary.get('fingerprint', 'N/A')}, "
                    f"bbox={geo_summary.get('bbox', 'N/A')}"
                )
                total_elapsed = time.monotonic() - t_start
                logger.info(
                    f"[available-dates][{req_id}] === DONE (empty) === "
                    f"total_elapsed={total_elapsed:.2f}s"
                )
                return {
                    "available_dates": [],
                    "total_images": 0,
                    "date_range": {"start": start_date, "end": end_date},
                    "filters": {"max_cloud_coverage": max_cloud_coverage},
                    "debug_info": {
                        "message": "No Sentinel-2 images found for this location and time period",
                        "suggestion": "Check that the geometry is within Sentinel-2 coverage area",
                    },
                    "provider": satellite_provider.provider_name,
                }

            # SCL is ONLY used here for available-dates AOI-level cloud filtering (10%).
            # Heatmap and timeseries use tile-level CLOUDY_PIXEL_PERCENTAGE with 10m bands (B2,B3,B4,B8).
            # SCL values: 3=Cloud Shadow, 8=Cloud Medium, 9=Cloud High, 10=Cirrus
            def extract_date_with_aoi_cloud(image):
                """Extract date info with AOI-level cloud coverage calculation."""
                date = ee.Date(image.get("system:time_start"))

                # Get SCL band for cloud detection within AOI
                scl = image.select('SCL')

                # Cloud mask: pixels that are clouds (3, 8, 9, 10)
                cloud_mask = scl.eq(3).Or(scl.eq(8)).Or(scl.eq(9)).Or(scl.eq(10))

                # Calculate cloud percentage within AOI
                cloud_pixels = cloud_mask.reduceRegion(
                    reducer=ee.Reducer.sum(),
                    geometry=aoi,
                    scale=20,  # SCL is at 20m resolution
                    maxPixels=1e13,
                    bestEffort=True,
                    tileScale=4,
                ).get('SCL')

                total_pixels = scl.mask().reduceRegion(
                    reducer=ee.Reducer.count(),
                    geometry=aoi,
                    scale=20,
                    maxPixels=1e13,
                    bestEffort=True,
                    tileScale=4,
                ).get('SCL')

                # Calculate percentage
                aoi_cloud_pct = ee.Number(cloud_pixels).divide(ee.Number(total_pixels)).multiply(100)

                return ee.Feature(None, {
                    'date': date.format('YYYY-MM-dd'),
                    'aoi_cloud_coverage': aoi_cloud_pct,
                    'tile_cloud_coverage': image.get('CLOUDY_PIXEL_PERCENTAGE'),
                    'timestamp': date.millis(),
                })

            def _gee_get_dates_with_aoi_cloud():
                """Get all dates with AOI-level cloud coverage."""
                collection_list = unfiltered_collection.toList(unfiltered_collection.size())
                num_images = unfiltered_collection.size().getInfo()

                results = []
                for i in range(num_images):
                    try:
                        image = ee.Image(collection_list.get(i))
                        feature = extract_date_with_aoi_cloud(image)
                        info = feature.getInfo()
                        props = info.get('properties', {})
                        results.append([
                            props.get('date'),
                            props.get('aoi_cloud_coverage'),
                            props.get('tile_cloud_coverage'),
                            props.get('timestamp')
                        ])
                    except Exception as e:
                        logger.warning(f"[available-dates][{req_id}] Error processing image {i}: {e}")
                        continue

                return results

            logger.info(
                f"[available-dates][{req_id}] GEE: Calculating AOI-level cloud coverage for {unfiltered_count} images..."
            )
            t_gee = time.monotonic()
            all_date_info = await _to_thread(_gee_get_dates_with_aoi_cloud)
            gee_elapsed = time.monotonic() - t_gee

            logger.info(
                f"[available-dates][{req_id}] GEE: AOI cloud calculation complete, "
                f"processed {len(all_date_info)} images, elapsed={gee_elapsed:.2f}s"
            )

            # Filter by AOI-level cloud coverage and log details
            date_info = []
            for item in all_date_info:
                if item and len(item) >= 4:
                    date_str = item[0]
                    aoi_cloud = item[1]
                    tile_cloud = item[2]
                    timestamp = item[3]

                    # Check if passes AOI cloud filter
                    passes = aoi_cloud <= max_cloud_coverage if aoi_cloud is not None else False

                    logger.debug(
                        f"[available-dates][{req_id}] GEE: {date_str} - "
                        f"AOI cloud: {aoi_cloud:.1f}%, Tile cloud: {tile_cloud:.1f}%, "
                        f"passes={passes}"
                    )

                    if passes:
                        date_info.append([date_str, aoi_cloud, timestamp])

            raw_count = len(date_info)
            logger.info(
                f"[available-dates][{req_id}] GEE: After AOI-level filtering: "
                f"{raw_count} images pass {max_cloud_coverage}% threshold"
            )

            if not date_info:
                # Find minimum AOI cloud coverage for helpful debug message
                min_aoi_cloud = None
                all_cloud_data = []
                for item in all_date_info:
                    if item and len(item) >= 4 and item[1] is not None:
                        all_cloud_data.append({
                            "date": item[0],
                            "aoi_cloud": item[1],
                            "tile_cloud": item[2]
                        })
                        if min_aoi_cloud is None or item[1] < min_aoi_cloud:
                            min_aoi_cloud = item[1]

                # Sort by AOI cloud coverage
                all_cloud_data.sort(key=lambda x: x["aoi_cloud"])

                logger.warning(
                    f"[available-dates][{req_id}] GEE: ALL {unfiltered_count} images rejected by "
                    f"AOI-level cloud filter (threshold={max_cloud_coverage}%). "
                    f"Minimum AOI cloud found: {min_aoi_cloud:.1f}%. "
                    f"Suggestion: Increase cloud_coverage to at least {int(min_aoi_cloud) + 5}%"
                )

                total_elapsed = time.monotonic() - t_start
                logger.info(
                    f"[available-dates][{req_id}] === DONE (empty) === "
                    f"total_elapsed={total_elapsed:.2f}s"
                )
                return {
                    "available_dates": [],
                    "total_images": 0,
                    "date_range": {"start": start_date, "end": end_date},
                    "filters": {"max_cloud_coverage": max_cloud_coverage, "filter_type": "aoi_level"},
                    "debug_info": {
                        "message": f"All {unfiltered_count} images exceed {max_cloud_coverage}% AOI cloud coverage",
                        "min_aoi_cloud_found": round(min_aoi_cloud, 2) if min_aoi_cloud is not None else None,
                        "suggestion": f"Increase cloud_coverage threshold to at least {int(min_aoi_cloud) + 5 if min_aoi_cloud else 20}%",
                        "all_images_cloud_data": all_cloud_data[:10],  # Show top 10 least cloudy
                    },
                    "provider": satellite_provider.provider_name,
                }

            # === DIAGNOSTIC: Log per-date cloud coverage distribution ===
            cloud_values_all = []
            dates_seen = set()
            for item in date_info:
                if item and len(item) >= 3:
                    dates_seen.add(item[0])
                    if item[1] is not None:
                        cloud_values_all.append(float(item[1]))

            if cloud_values_all:
                import numpy as np
                cloud_arr = np.array(cloud_values_all)
                logger.info(
                    f"[available-dates][{req_id}] GEE: Cloud coverage distribution across {raw_count} images: "
                    f"min={cloud_arr.min():.1f}%, max={cloud_arr.max():.1f}%, "
                    f"mean={cloud_arr.mean():.1f}%, median={np.median(cloud_arr):.1f}%, "
                    f"std={cloud_arr.std():.1f}%, "
                    f"<10%={int((cloud_arr < 10).sum())}, "
                    f"<20%={int((cloud_arr < 20).sum())}, "
                    f"<50%={int((cloud_arr < 50).sum())}, "
                    f"unique_dates={len(dates_seen)}, "
                    f"images_per_date_avg={raw_count / max(len(dates_seen), 1):.1f}"
                )

            # Process and deduplicate dates
            dates_dict = {}
            malformed_items = 0
            duplicate_count = 0
            for item in date_info:
                if item and len(item) >= 3:
                    date_str = item[0]
                    cloud_coverage = item[1]
                    timestamp = item[2]

                    # Keep the image with lowest cloud coverage for each date
                    if date_str not in dates_dict:
                        dates_dict[date_str] = {
                            "date": date_str,
                            "cloud_coverage": round(cloud_coverage, 2),
                            "timestamp": timestamp,
                            "available": True,
                        }
                    elif dates_dict[date_str]["cloud_coverage"] > cloud_coverage:
                        logger.debug(
                            f"[available-dates][{req_id}] GEE: Dedup {date_str}: "
                            f"replacing cloud={dates_dict[date_str]['cloud_coverage']}% "
                            f"with better cloud={round(cloud_coverage, 2)}%"
                        )
                        dates_dict[date_str] = {
                            "date": date_str,
                            "cloud_coverage": round(cloud_coverage, 2),
                            "timestamp": timestamp,
                            "available": True,
                        }
                        duplicate_count += 1
                    else:
                        duplicate_count += 1
                else:
                    malformed_items += 1
                    logger.debug(
                        f"[available-dates][{req_id}] GEE: Malformed item: {item}"
                    )

            if malformed_items > 0:
                logger.warning(
                    f"[available-dates][{req_id}] GEE: {malformed_items} malformed items "
                    f"in date_info (expected [date, cloud, timestamp])"
                )

            if duplicate_count > 0:
                logger.info(
                    f"[available-dates][{req_id}] GEE: Deduplicated {duplicate_count} "
                    f"overlapping tile entries (multiple S2 tiles covering same date)"
                )

            # Sort by date and return
            available_dates = sorted(dates_dict.values(), key=lambda x: x["date"])

            # === DIAGNOSTIC: Detect date gaps ===
            if len(available_dates) >= 2:
                sorted_date_strs = [d["date"] for d in available_dates]
                gaps = []
                for i in range(1, len(sorted_date_strs)):
                    prev = datetime.strptime(sorted_date_strs[i - 1], "%Y-%m-%d")
                    curr = datetime.strptime(sorted_date_strs[i], "%Y-%m-%d")
                    gap_days = (curr - prev).days
                    if gap_days > 15:  # S2 revisit is ~5 days, so >15 is notable
                        gaps.append(f"{sorted_date_strs[i-1]}->{sorted_date_strs[i]} ({gap_days}d)")
                if gaps:
                    logger.info(
                        f"[available-dates][{req_id}] GEE: Notable date gaps (>15 days): "
                        f"{gaps[:10]}{'...' if len(gaps) > 10 else ''}"
                    )

            # Log per-date summary at debug level
            if available_dates:
                cloud_summary = ", ".join(
                    f"{d['date']}:{d['cloud_coverage']}%" for d in available_dates[:20]
                )
                logger.debug(
                    f"[available-dates][{req_id}] GEE: Per-date cloud (first 20): [{cloud_summary}]"
                )
                if len(available_dates) > 20:
                    cloud_summary_tail = ", ".join(
                        f"{d['date']}:{d['cloud_coverage']}%" for d in available_dates[-5:]
                    )
                    logger.debug(
                        f"[available-dates][{req_id}] GEE: Per-date cloud (last 5): [{cloud_summary_tail}]"
                    )

            total_elapsed = time.monotonic() - t_start
            logger.info(
                f"[available-dates][{req_id}] === DONE === "
                f"raw_images={raw_count}, "
                f"unique_dates={len(available_dates)}, "
                f"duplicates_merged={duplicate_count}, "
                f"malformed={malformed_items}, "
                f"date_range_result="
                f"{available_dates[0]['date'] if available_dates else 'N/A'} -> "
                f"{available_dates[-1]['date'] if available_dates else 'N/A'}, "
                f"total_elapsed={total_elapsed:.2f}s"
            )

            return {
                "available_dates": available_dates,
                "total_images": len(available_dates),
                "date_range": {"start": start_date, "end": end_date},
                "filters": {"max_cloud_coverage": max_cloud_coverage, "filter_type": "aoi_level"},
                "provider": satellite_provider.provider_name,
            }
        else:
            # Use the provider interface for CDSE and other providers
            logger.info(
                f"[available-dates][{req_id}] CDSE: Calling get_available_dates..."
            )
            t_cdse = time.monotonic()
            result = await _to_thread(
                satellite_provider.get_available_dates,
                geometry=aoi_geometry,
                start_date=start_date,
                end_date=end_date,
                max_cloud_coverage=max_cloud_coverage,
            )
            cdse_elapsed = time.monotonic() - t_cdse

            # Ensure provider info is in the response
            if "provider" not in result:
                result["provider"] = satellite_provider.provider_name

            total_elapsed = time.monotonic() - t_start
            cdse_dates = result.get("available_dates", [])
            logger.info(
                f"[available-dates][{req_id}] === DONE (CDSE) === "
                f"result_keys={list(result.keys())}, "
                f"total_images={result.get('total_images', len(cdse_dates))}, "
                f"cdse_elapsed={cdse_elapsed:.2f}s, "
                f"total_elapsed={total_elapsed:.2f}s"
            )

            return result

    except HTTPException:
        raise
    except Exception as e:
        total_elapsed = time.monotonic() - t_start
        logger.error(
            f"[available-dates][{req_id}] === FAILED === "
            f"error_type={type(e).__name__}, "
            f"error={e}, elapsed={total_elapsed:.2f}s, "
            f"geometry={geo_summary}, "
            f"dates={start_date} -> {end_date}\n"
            f"{traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail="Internal server error")
