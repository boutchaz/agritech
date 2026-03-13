from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Literal
from typing import Dict

from pydantic import BaseModel, Field, model_validator


class MaturityPhase(str, Enum):
    JUVENILE = "juvenile"
    ENTREE_PRODUCTION = "entree_production"
    PLEINE_PRODUCTION = "pleine_production"
    MATURITE_AVANCEE = "maturite_avancee"
    SENESCENCE = "senescence"
    UNKNOWN = "unknown"

    @classmethod
    def from_planting_year(
        cls,
        planting_year: int | None,
        current_year: int | None = None,
    ) -> "MaturityPhase":
        if planting_year is None:
            return cls.UNKNOWN

        resolved_year = (
            current_year if current_year is not None else datetime.now().year
        )
        age = max(0, resolved_year - planting_year)

        if age < 5:
            return cls.JUVENILE
        if age < 10:
            return cls.ENTREE_PRODUCTION
        if age < 40:
            return cls.PLEINE_PRODUCTION
        if age < 60:
            return cls.MATURITE_AVANCEE
        return cls.SENESCENCE


class NutritionOption(str, Enum):
    A = "A"
    B = "B"
    C = "C"


class IndexTimePoint(BaseModel):
    date: date
    value: float
    outlier: bool = False
    interpolated: bool = False


class PercentileSet(BaseModel):
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float
    mean: float
    std: float = Field(ge=0)


class PhenologyDates(BaseModel):
    dormancy_exit: date
    peak: date
    plateau_start: date
    decline_start: date
    dormancy_entry: date


class ExtremeEvent(BaseModel):
    date: date
    event_type: str
    severity: Literal["low", "medium", "high", "critical"]


class AnomalyRecord(BaseModel):
    date: date
    anomaly_type: str
    severity: Literal["low", "medium", "high", "critical"]
    weather_reference: str | None = None
    excluded_from_reference: bool = False


class YieldPotential(BaseModel):
    minimum: float = Field(ge=0)
    maximum: float = Field(ge=0)
    method: str
    reference_bracket: str
    historical_average: float | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_range(self) -> "YieldPotential":
        if self.maximum < self.minimum:
            raise ValueError("maximum must be greater than or equal to minimum")
        return self


class ZoneSummary(BaseModel):
    class_name: Literal["A", "B", "C", "D", "E"]
    surface_percent: float = Field(ge=0, le=100)


class GeoJsonFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"]
    features: list[Dict[str, object]]


class HealthScore(BaseModel):
    total: float = Field(ge=0, le=100)
    components: dict[str, float]

    @model_validator(mode="after")
    def validate_components(self) -> "HealthScore":
        required = {
            "vigor",
            "homogeneity",
            "stability",
            "hydric",
            "nutritional",
        }
        missing = required.difference(set(self.components.keys()))
        if missing:
            joined_missing = ", ".join(sorted(missing))
            raise ValueError(f"missing health components: {joined_missing}")

        for key, value in self.components.items():
            if value < 0 or value > 100:
                raise ValueError(f"invalid health component score for {key}")
        return self


class ConfidenceComponent(BaseModel):
    score: float = Field(ge=0, le=100)
    max_score: float = Field(ge=0, le=100)


class ConfidenceScore(BaseModel):
    total_score: float = Field(ge=0, le=100)
    normalized_score: float = Field(ge=0, le=1)
    components: dict[str, ConfidenceComponent]


class Step1Output(BaseModel):
    index_time_series: dict[str, list[IndexTimePoint]]
    cloud_coverage_mean: float = Field(ge=0, le=100)
    filtered_image_count: int = Field(ge=0)
    outlier_count: int = Field(ge=0)
    interpolated_dates: list[date]
    raster_paths: dict[str, list[str]]


class WeatherDay(BaseModel):
    date: date
    temp_min: float
    temp_max: float
    precip: float = Field(ge=0)
    et0: float = Field(ge=0)


class MonthlyWeatherAggregate(BaseModel):
    month: str
    precipitation_total: float = Field(ge=0)
    gdd_total: float = Field(ge=0)


class Step2Output(BaseModel):
    daily_weather: list[WeatherDay]
    monthly_aggregates: list[MonthlyWeatherAggregate]
    cumulative_gdd: dict[str, float]
    chill_hours: float = Field(ge=0)
    extreme_events: list[ExtremeEvent]


class Step3Output(BaseModel):
    global_percentiles: dict[str, PercentileSet]
    phenology_period_percentiles: dict[str, dict[str, PercentileSet]] = Field(
        default_factory=dict
    )


class Step4Output(BaseModel):
    mean_dates: PhenologyDates
    inter_annual_variability_days: dict[str, float]
    gdd_correlation: dict[str, float]


class Step5Output(BaseModel):
    anomalies: list[AnomalyRecord]


class Step6Output(BaseModel):
    yield_potential: YieldPotential


class Step7Output(BaseModel):
    zones_geojson: GeoJsonFeatureCollection
    zone_summary: list[ZoneSummary]
    spatial_pattern_type: str


class Step8Output(BaseModel):
    health_score: HealthScore


class CalibrationInput(BaseModel):
    parcel_id: str
    organization_id: str
    crop_type: str
    variety: str | None = None
    planting_year: int | None = None
    planting_system: str | None = None
    maturity_phase: MaturityPhase | None = None
    nutrition_option: NutritionOption | None = None
    satellite_series: dict[str, list[IndexTimePoint]]
    weather_daily: list[WeatherDay]
    analyses: list[Dict[str, object]]
    harvest_records: list[Dict[str, object]]
    reference_data: Dict[str, object]


class CalibrationMetadata(BaseModel):
    version: str = "v2"
    generated_at: datetime
    data_quality_flags: list[str] = Field(default_factory=list)


class CalibrationOutput(BaseModel):
    parcel_id: str
    maturity_phase: MaturityPhase
    nutrition_option_suggestion: NutritionOption | None = None
    step1: Step1Output
    step2: Step2Output
    step3: Step3Output
    step4: Step4Output
    step5: Step5Output
    step6: Step6Output
    step7: Step7Output
    step8: Step8Output
    confidence: ConfidenceScore
    metadata: CalibrationMetadata
