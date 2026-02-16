from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date


class WeatherDataRequest(BaseModel):
    latitude: float = Field(..., description="Latitude (WGS84)")
    longitude: float = Field(..., description="Longitude (WGS84)")
    start_date: date
    end_date: date


class DailyWeatherData(BaseModel):
    date: date
    temperature_min: Optional[float] = None
    temperature_max: Optional[float] = None
    temperature_mean: Optional[float] = None
    relative_humidity_mean: Optional[float] = None
    precipitation_sum: Optional[float] = None
    wind_speed_max: Optional[float] = None
    wind_gusts_max: Optional[float] = None
    shortwave_radiation_sum: Optional[float] = None
    et0_fao_evapotranspiration: Optional[float] = None
    soil_temperature_0_7cm: Optional[float] = None
    soil_moisture_0_7cm: Optional[float] = None


class WeatherDataResponse(BaseModel):
    latitude: float
    longitude: float
    elevation: Optional[float] = None
    data: List[DailyWeatherData]
    source: str = "open-meteo-archive"


class ForecastRequest(BaseModel):
    latitude: float
    longitude: float
    days: int = Field(default=7, ge=1, le=16)


class ForecastResponse(BaseModel):
    latitude: float
    longitude: float
    data: List[DailyWeatherData]
    source: str = "open-meteo-forecast"


class DerivedWeatherRequest(BaseModel):
    parcel_id: str
    start_date: date
    end_date: date
    crop_type: Optional[str] = None
    tbase: Optional[float] = None
    kc: Optional[float] = None


class DerivedDailyData(BaseModel):
    date: date
    gdd_daily: Optional[float] = None
    gdd_cumulative: Optional[float] = None
    chill_hours_daily: Optional[float] = None
    chill_hours_cumulative: Optional[float] = None
    frost_risk: bool = False
    heat_stress: bool = False
    water_balance: Optional[float] = None
    et0: Optional[float] = None


class DerivedWeatherResponse(BaseModel):
    parcel_id: str
    crop_type: Optional[str] = None
    tbase: float
    data: List[DerivedDailyData]
