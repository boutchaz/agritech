from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Literal

import math

from pydantic import BaseModel, Field, model_validator


class WeatherRowAccessor:
    """Single source of truth for reading weather row dicts.

    Weather rows come from different sources (Open-Meteo, DB, NestJS) with
    inconsistent field names.  This class normalizes the access pattern so
    every consumer reads fields the same way.
    """

    __slots__ = ("_row",)

    def __init__(self, row: dict[str, Any]) -> None:
        self._row = row

    # --- temperatures ---
    @property
    def temp_min(self) -> float:
        v = self._row.get("temp_min") or self._row.get("temperature_min")
        return float(v) if v is not None else 0.0

    @property
    def temp_max(self) -> float:
        v = self._row.get("temp_max") or self._row.get("temperature_max")
        return float(v) if v is not None else 0.0

    @property
    def temp_mean(self) -> float:
        v = self._row.get("temperature_mean") or self._row.get("temp_mean")
        if v is not None:
            return float(v)
        return (self.temp_min + self.temp_max) / 2.0

    # --- other fields ---
    @property
    def precipitation(self) -> float:
        v = self._row.get("precip") or self._row.get("precipitation_sum")
        return float(v) if v is not None else 0.0

    @property
    def et0(self) -> float | None:
        v = self._row.get("et0") or self._row.get("et0_fao_evapotranspiration")
        return float(v) if v is not None else None

    @property
    def wind_speed_max(self) -> float | None:
        v = self._row.get("wind_speed_max")
        return float(v) if v is not None else None

    @property
    def date_str(self) -> str:
        return str(self._row.get("date", ""))

    @property
    def parsed_date(self) -> date:
        return date.fromisoformat(self.date_str)

    @property
    def raw(self) -> dict[str, Any]:
        return self._row

    @staticmethod
    def to_float(value: Any, default: float = 0.0) -> float:
        """Safe float conversion — handles None, NaN, non-numeric."""
        if value is None:
            return default
        try:
            f = float(value)
            return f if math.isfinite(f) else default
        except (ValueError, TypeError):
            return default


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

    @property
    def is_observed(self) -> bool:
        """True if this point is real data (not interpolated, not an outlier)."""
        return not self.interpolated and not self.outlier


class PercentileSet(BaseModel):
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float
    mean: float
    std: float = Field(ge=0)


class PhenologyDates(BaseModel):
    dormancy_exit: date | None = None
    peak: date | None = None
    plateau_start: date | None = None
    decline_start: date | None = None
    dormancy_entry: date | None = None


class ExtremeEvent(BaseModel):
    date: date
    event_type: str
    severity: Literal["low", "medium", "high", "critical"]


class AnomalyRecord(BaseModel):
    date: date
    anomaly_type: str
    severity: Literal["low", "medium", "high", "critical"]
    index_name: str = "NDVI"
    value: float | None = None
    previous_value: float | None = None
    deviation: float | None = None
    weather_reference: str | None = None
    excluded_from_reference: bool = False


class Recommendation(BaseModel):
    type: str
    severity: Literal["low", "medium", "high"]
    message: str
    component: str | None = None


class YieldPotential(BaseModel):
    minimum: float = Field(ge=0)
    maximum: float = Field(ge=0)
    method: str
    reference_bracket: str
    historical_average: float | None = Field(default=None, ge=0)
    unit: str = "kg/tree"

    @model_validator(mode="after")
    def validate_range(self) -> "YieldPotential":
        if self.maximum < self.minimum:
            raise ValueError("maximum must be greater than or equal to minimum")
        return self


class AlternanceInfo(BaseModel):
    detected: bool
    current_year_type: Literal["on", "off"] | None = None
    confidence: float = Field(ge=0, le=1)
    yearly_means: dict[int, float] = Field(default_factory=dict)


class ZoneSummary(BaseModel):
    class_name: Literal["A", "B", "C", "D", "E"]
    surface_percent: float = Field(ge=0, le=100)


class GeoJsonFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"]
    features: list[dict[str, object]]


class HealthScore(BaseModel):
    total: float = Field(ge=0, le=100)
    components: dict[str, float]

    @model_validator(mode="after")
    def validate_components(self) -> "HealthScore":
        # Spec §3.8: 5 components
        required = {
            "vigor",
            "spatial_homogeneity",
            "temporal_stability",
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
    total_score: float = Field(ge=0, le=110)
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
    yearly_stages: dict[str, PhenologyDates] = Field(
        default_factory=dict,
        description='Per cycle-year phenology dates (keys = cycle year, e.g. "2024").',
    )
    inter_annual_variability_days: dict[str, float]
    gdd_correlation: dict[str, float]
    referential_cycle_used: bool | None = None
    status: Literal["ok", "degraded", "insufficient_data"] = "ok"
    missing_stages: list[str] = Field(default_factory=list)
    phase_timeline: list[dict[str, Any]] | None = Field(
        default=None,
        description="Per-season state machine output (olive protocole_phenologique).",
    )


class Step5Output(BaseModel):
    anomalies: list[AnomalyRecord]


class Step6Output(BaseModel):
    yield_potential: YieldPotential
    alternance: AlternanceInfo | None = None


class NutritionalZones(BaseModel):
    """GCI-based nutritional zoning — chlorophyll/nitrogen status map."""
    zones_geojson: GeoJsonFeatureCollection
    zone_summary: list[ZoneSummary]
    spatial_pattern_type: str
    index_used: str = "GCI"


class Step7Output(BaseModel):
    zones_geojson: GeoJsonFeatureCollection
    zone_summary: list[ZoneSummary]
    spatial_pattern_type: str
    nutritional_zones: NutritionalZones | None = None


class Step8Output(BaseModel):
    health_score: HealthScore


class SignalClassificationOutput(BaseModel):
    """Output of REGLE_2_X signal classification (Section 2 of protocol)."""

    signal_state: str  # SIGNAL_PUR | MIXTE_MODERE | DOMINE_ADVENTICES
    mode: str  # NORMAL | AMORCAGE
    cycles_available: int
    precip_30j: float
    tmax_30j_pct: float
    tmoy_30j: float
    ratio_nirv_ndvi_current: float | None = None
    ratio_nirv_ndvi_baseline: float | None = None
    ndvi_peak_baseline: float | None = None
    clarification_reached: bool = False
    note: str | None = None


class CalibrationInput(BaseModel):
    parcel_id: str
    organization_id: str
    crop_type: str
    mode_calibrage: str = "full"
    affected_components: list[str] = Field(default_factory=list)
    variety: str | None = None
    planting_year: int | None = None
    planting_system: str | None = None
    irrigation_frequency: str | None = None
    volume_per_tree_liters: float | None = None
    water_source: str | None = None
    plant_count: int | None = None
    area_hectares: float | None = None
    density_per_hectare: int | None = None
    harvest_regularity: str | None = None
    cultural_history: dict[str, object] = Field(default_factory=dict)
    maturity_phase: MaturityPhase | None = None
    nutrition_option: NutritionOption | None = None
    satellite_series: dict[str, list[IndexTimePoint]] = Field(default_factory=dict)
    weather_daily: list[WeatherDay] = Field(default_factory=list)
    analyses: list[dict[str, object]] = Field(default_factory=list)
    harvest_records: list[dict[str, object]] = Field(default_factory=list)
    reference_data: dict[str, object] = Field(default_factory=dict)


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
    signal_classification: SignalClassificationOutput | None = None
    recommendations: list[Recommendation] = Field(default_factory=list)
    confidence: ConfidenceScore
    metadata: CalibrationMetadata
