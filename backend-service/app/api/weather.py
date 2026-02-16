from fastapi import APIRouter, HTTPException, Query
from datetime import date
from typing import Optional
from app.models.weather_schemas import (
    WeatherDataResponse,
    DailyWeatherData,
    ForecastResponse,
    DerivedWeatherRequest,
    DerivedWeatherResponse,
    DerivedDailyData,
)
from app.services.weather_service import weather_service
from app.services.supabase_service import supabase_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/historical", response_model=WeatherDataResponse)
async def get_historical_weather(
    latitude: float = Query(..., description="Latitude (WGS84)"),
    longitude: float = Query(..., description="Longitude (WGS84)"),
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
):
    if start_date > end_date:
        raise HTTPException(
            status_code=400, detail="start_date must be before end_date"
        )
    if (end_date - start_date).days > 365 * 3:
        raise HTTPException(status_code=400, detail="Maximum date range is 3 years")

    try:
        raw_data = await weather_service.fetch_historical(
            latitude, longitude, str(start_date), str(end_date)
        )
        records = weather_service.parse_open_meteo_response(raw_data)
        daily_data = [DailyWeatherData(**r) for r in records]

        return WeatherDataResponse(
            latitude=round(latitude, 2),
            longitude=round(longitude, 2),
            elevation=raw_data.get("elevation"),
            data=daily_data,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch historical weather: {e}")
        raise HTTPException(
            status_code=502, detail=f"Weather data fetch failed: {str(e)}"
        )


@router.get("/forecast", response_model=ForecastResponse)
async def get_weather_forecast(
    latitude: float = Query(..., description="Latitude (WGS84)"),
    longitude: float = Query(..., description="Longitude (WGS84)"),
    days: int = Query(default=7, ge=1, le=16, description="Forecast days (1-16)"),
):
    try:
        raw_data = await weather_service.fetch_forecast(latitude, longitude, days)
        records = weather_service.parse_open_meteo_response(raw_data)
        daily_data = [DailyWeatherData(**r) for r in records]

        return ForecastResponse(
            latitude=round(latitude, 2),
            longitude=round(longitude, 2),
            data=daily_data,
        )
    except Exception as e:
        logger.error(f"Failed to fetch weather forecast: {e}")
        raise HTTPException(status_code=502, detail=f"Forecast fetch failed: {str(e)}")


@router.post("/derived", response_model=DerivedWeatherResponse)
async def calculate_derived_variables(request: DerivedWeatherRequest):
    try:
        parcel = await supabase_service.get_parcel_details(request.parcel_id)

        if not parcel:
            raise HTTPException(status_code=404, detail="Parcel not found")

        crop_type = request.crop_type or parcel.get("crop_type") or "olive"

        boundary = parcel.get("boundary")
        if not boundary:
            raise HTTPException(
                status_code=400, detail="Parcel has no boundary geometry"
            )

        lat, lon = _extract_centroid_from_boundary(boundary)

        raw_data = await weather_service.fetch_historical(
            lat, lon, str(request.start_date), str(request.end_date)
        )
        records = weather_service.parse_open_meteo_response(raw_data)

        thresholds = weather_service.get_crop_thresholds(crop_type)
        tbase = request.tbase if request.tbase is not None else thresholds["tbase"]
        kc = request.kc if request.kc is not None else 1.0

        derived = weather_service.compute_derived_data(records, crop_type, tbase, kc)
        derived_data = [DerivedDailyData(**d) for d in derived]

        return DerivedWeatherResponse(
            parcel_id=request.parcel_id,
            crop_type=crop_type,
            tbase=tbase,
            data=derived_data,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to calculate derived weather: {e}")
        raise HTTPException(
            status_code=500, detail=f"Derived calculation failed: {str(e)}"
        )


@router.get("/parcel/{parcel_id}", response_model=WeatherDataResponse)
async def get_parcel_weather(
    parcel_id: str,
    start_date: date = Query(...),
    end_date: date = Query(...),
):
    try:
        parcel = await supabase_service.get_parcel_details(parcel_id)

        if not parcel:
            raise HTTPException(status_code=404, detail="Parcel not found")

        boundary = parcel.get("boundary")
        if not boundary:
            raise HTTPException(
                status_code=400, detail="Parcel has no boundary geometry"
            )

        lat, lon = _extract_centroid_from_boundary(boundary)

        raw_data = await weather_service.fetch_historical(
            lat, lon, str(start_date), str(end_date)
        )
        records = weather_service.parse_open_meteo_response(raw_data)
        daily_data = [DailyWeatherData(**r) for r in records]

        return WeatherDataResponse(
            latitude=round(lat, 2),
            longitude=round(lon, 2),
            elevation=raw_data.get("elevation"),
            data=daily_data,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch parcel weather: {e}")
        raise HTTPException(
            status_code=500, detail=f"Parcel weather fetch failed: {str(e)}"
        )


def _extract_centroid_from_boundary(boundary) -> tuple:
    points = []

    if isinstance(boundary, dict):
        geo_type = boundary.get("type", "")
        coordinates = boundary.get("coordinates", [])
        if geo_type == "Polygon" and coordinates:
            points = coordinates[0]
        elif geo_type == "MultiPolygon" and coordinates and coordinates[0]:
            points = coordinates[0][0]
        elif (
            geo_type == "Point"
            and isinstance(coordinates, list)
            and len(coordinates) == 2
        ):
            points = [coordinates]
    elif isinstance(boundary, list) and len(boundary) >= 3:
        if isinstance(boundary[0], (list, tuple)) and len(boundary[0]) == 2:
            points = boundary

    if not points:
        raise ValueError("Cannot extract centroid from boundary")

    lons = [p[0] for p in points]
    lats = [p[1] for p in points]
    return (sum(lats) / len(lats), sum(lons) / len(lons))
