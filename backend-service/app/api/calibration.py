from datetime import datetime
import logging
import time
from typing import SupportsFloat, TypedDict, cast

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()
logger = logging.getLogger(__name__)


class PhenologyDefinition(TypedDict):
    months: set[int]
    stage: str
    stage_code: str
    description: str


class NdviThresholds(BaseModel):
    optimal: tuple[float, float]
    vigilance: float
    alerte: float


VALID_CROP_TYPES = {
    "olivier",
    "agrumes",
    "avocatier",
    "palmier_dattier",
}
VALID_SYSTEM_TYPES = {
    "traditionnel",
    "intensif",
    "super_intensif",
}

GENERIC_PHENOLOGY: list[PhenologyDefinition] = [
    {
        "months": {1, 2},
        "stage": "repos_hivernal",
        "stage_code": "RH",
        "description": "Periode de repos hivernal.",
    },
    {
        "months": {3, 4},
        "stage": "reprise_vegetative",
        "stage_code": "RV",
        "description": "Reprise vegetative printaniere.",
    },
    {
        "months": {5, 6},
        "stage": "croissance_active",
        "stage_code": "CA",
        "description": "Phase de croissance active.",
    },
    {
        "months": {7, 8},
        "stage": "developpement",
        "stage_code": "DV",
        "description": "Developpement et production estivale.",
    },
    {
        "months": {9, 10},
        "stage": "maturation",
        "stage_code": "MT",
        "description": "Maturation progressive.",
    },
    {
        "months": {11, 12},
        "stage": "fin_cycle",
        "stage_code": "FC",
        "description": "Fin de cycle et preparation hivernale.",
    },
]

PHENOLOGY_CONFIG: dict[str, list[PhenologyDefinition]] = {
    "olivier": [
        {
            "months": {1, 2},
            "stage": "repos_vegetatif",
            "stage_code": "RV",
            "description": "Phase hivernale de repos vegetatif.",
        },
        {
            "months": {3, 4},
            "stage": "debourrement",
            "stage_code": "DB",
            "description": "Reprise vegetative et sortie des bourgeons.",
        },
        {
            "months": {5, 6},
            "stage": "floraison",
            "stage_code": "FL",
            "description": "Floraison active et mise en place de la charge.",
        },
        {
            "months": {7, 8},
            "stage": "nouaison",
            "stage_code": "NW",
            "description": "Nouaison et fixation des jeunes fruits.",
        },
        {
            "months": {9, 10},
            "stage": "grossissement",
            "stage_code": "GR",
            "description": "Grossissement des fruits et accumulation de biomasse.",
        },
        {
            "months": {11, 12},
            "stage": "maturation",
            "stage_code": "MT",
            "description": "Maturation finale avant recolte.",
        },
    ],
    "agrumes": [
        {
            "months": {1, 2},
            "stage": "repos_hivernal",
            "stage_code": "RH",
            "description": "Ralentissement vegetatif hivernal.",
        },
        {
            "months": {3, 4},
            "stage": "floraison",
            "stage_code": "FL",
            "description": "Floraison printaniere des agrumes.",
        },
        {
            "months": {5, 6},
            "stage": "nouaison",
            "stage_code": "NW",
            "description": "Nouaison et premier developpement des fruits.",
        },
        {
            "months": {7, 8},
            "stage": "grossissement",
            "stage_code": "GR",
            "description": "Grossissement estival des fruits.",
        },
        {
            "months": {9, 10},
            "stage": "maturation",
            "stage_code": "MT",
            "description": "Maturation progressive des fruits.",
        },
        {
            "months": {11, 12},
            "stage": "recolte",
            "stage_code": "RC",
            "description": "Periode principale de recolte.",
        },
    ],
    "avocatier": [
        {
            "months": {1, 2},
            "stage": "repos_relief",
            "stage_code": "RR",
            "description": "Activite vegetative reduite en debut d annee.",
        },
        {
            "months": {3, 4},
            "stage": "floraison",
            "stage_code": "FL",
            "description": "Floraison et pollinisation de l avocatier.",
        },
        {
            "months": {5, 6},
            "stage": "nouaison",
            "stage_code": "NW",
            "description": "Nouaison et maintien des fruits.",
        },
        {
            "months": {7, 8},
            "stage": "croissance_fruits",
            "stage_code": "CF",
            "description": "Croissance active des fruits.",
        },
        {
            "months": {9, 10},
            "stage": "grossissement",
            "stage_code": "GR",
            "description": "Accumulation de matiere seche.",
        },
        {
            "months": {11, 12},
            "stage": "maturation",
            "stage_code": "MT",
            "description": "Maturation commerciale du fruit.",
        },
    ],
    "palmier_dattier": [
        {
            "months": {1, 2},
            "stage": "repos_relatif",
            "stage_code": "RR",
            "description": "Repos relatif avant reprise printaniere.",
        },
        {
            "months": {3, 4},
            "stage": "pollinisation",
            "stage_code": "PL",
            "description": "Floraison et pollinisation des palmiers.",
        },
        {
            "months": {5, 6},
            "stage": "nouaison",
            "stage_code": "NW",
            "description": "Nouaison et installation des regimes.",
        },
        {
            "months": {7, 8},
            "stage": "grossissement",
            "stage_code": "GR",
            "description": "Grossissement rapide des dattes.",
        },
        {
            "months": {9, 10},
            "stage": "maturation",
            "stage_code": "MT",
            "description": "Maturation et concentration en sucres.",
        },
        {
            "months": {11, 12},
            "stage": "post_recolte",
            "stage_code": "PR",
            "description": "Phase post-recolte et remise en reserve.",
        },
    ],
}


class SatelliteReading(BaseModel):
    date: str
    ndvi: float
    ndre: float
    ndmi: float
    gci: float
    evi: float
    savi: float


class WeatherReading(BaseModel):
    date: str
    temp_min: float
    temp_max: float
    precip: float
    et0: float


class CalibrationRunRequest(BaseModel):
    parcel_id: str
    crop_type: str
    system: str
    satellite_readings: list[SatelliteReading]
    weather_readings: list[WeatherReading]
    ndvi_thresholds: NdviThresholds


class CalibrationRunResponse(BaseModel):
    baseline_ndvi: float
    baseline_ndre: float
    baseline_ndmi: float
    confidence_score: float
    zone_classification: str
    phenology_stage: str
    anomaly_count: int
    processing_time_ms: int


class PercentilesRequest(BaseModel):
    values: list[float]
    percentiles: list[int]


class PercentilesResponse(BaseModel):
    percentiles: dict[str, float]


class DetectAnomaliesRequest(BaseModel):
    values: list[float]
    threshold_std: float = 2.0


class DetectAnomaliesResponse(BaseModel):
    anomaly_indices: list[int]
    anomaly_count: int
    mean: float
    std: float


class ClassifyZonesRequest(BaseModel):
    ndvi_values: list[float]
    thresholds: NdviThresholds


class ClassifyZonesResponse(BaseModel):
    zones: list[str]
    distribution: dict[str, int]


class PhenologyRequest(BaseModel):
    crop_type: str
    month: int = Field(..., ge=1, le=12)
    ndvi: float
    ndre: float


class PhenologyResponse(BaseModel):
    stage: str
    stage_code: str
    description: str


def _validate_crop_type(crop_type: str) -> None:
    if not crop_type or not crop_type.strip():
        raise HTTPException(status_code=400, detail="crop_type is required")


def _validate_system_type(system: str) -> None:
    if not system or not system.strip():
        raise HTTPException(status_code=400, detail="system is required")


def _parse_thresholds(thresholds: NdviThresholds) -> tuple[float, float, float, float]:
    optimal_min, optimal_max = thresholds.optimal
    return optimal_min, optimal_max, thresholds.vigilance, thresholds.alerte


def _classify_ndvi_value(value: float, thresholds: NdviThresholds) -> str:
    optimal_min, optimal_max, vigilance, alerte = _parse_thresholds(thresholds)

    if value <= alerte or value < vigilance:
        return "stressed"
    if value > optimal_max:
        return "optimal"
    if value < optimal_min:
        return "normal"
    return "normal"


def _detect_anomalies(
    values: list[float], threshold_std: float
) -> DetectAnomaliesResponse:
    values_array = np.array(values, dtype=float)
    mean_value = float(np.mean(values_array))
    std_value = float(np.std(values_array))

    if std_value == 0.0:
        anomaly_indices: list[int] = []
    else:
        z_scores = [abs((value - mean_value) / std_value) for value in values]
        anomaly_indices = [
            int(index) for index, score in enumerate(z_scores) if score > threshold_std
        ]

    return DetectAnomaliesResponse(
        anomaly_indices=anomaly_indices,
        anomaly_count=len(anomaly_indices),
        mean=round(mean_value, 4),
        std=round(std_value, 4),
    )


def _get_phenology_stage(crop_type: str, month: int) -> PhenologyResponse:
    _validate_crop_type(crop_type)

    stages = PHENOLOGY_CONFIG.get(crop_type, GENERIC_PHENOLOGY)

    for stage_config in stages:
        if month in stage_config["months"]:
            return PhenologyResponse(
                stage=stage_config["stage"],
                stage_code=stage_config["stage_code"],
                description=stage_config["description"],
            )

    raise HTTPException(status_code=400, detail="Invalid month")


def _extract_month(date_value: str) -> int:
    try:
        return datetime.fromisoformat(date_value).month
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid reading date") from exc


@router.post("/run", response_model=CalibrationRunResponse)
async def run_calibration(request: CalibrationRunRequest):
    start_time = time.perf_counter()

    _validate_crop_type(request.crop_type)
    _validate_system_type(request.system)

    if not request.satellite_readings or not request.weather_readings:
        raise HTTPException(
            status_code=400, detail="Satellite and weather readings are required"
        )

    ndvi_values = [reading.ndvi for reading in request.satellite_readings]
    ndre_values = [reading.ndre for reading in request.satellite_readings]
    ndmi_values = [reading.ndmi for reading in request.satellite_readings]

    baseline_ndvi = float(np.mean(np.array(ndvi_values, dtype=float)))
    baseline_ndre = float(np.mean(np.array(ndre_values, dtype=float)))
    baseline_ndmi = float(np.mean(np.array(ndmi_values, dtype=float)))

    satellite_dates = {reading.date for reading in request.satellite_readings}
    weather_dates = {reading.date for reading in request.weather_readings}
    satellite_covered = len(satellite_dates & weather_dates)
    coverage_ratio = satellite_covered / max(len(satellite_dates), 1)
    count_ratio = (
        min(len(request.satellite_readings) / 30.0, 1.0) * 0.5
        + min(len(request.weather_readings) / 90.0, 1.0) * 0.5
    )
    completeness_ratio = count_ratio * (0.5 + 0.5 * coverage_ratio)
    ndvi_std = float(np.std(np.array(ndvi_values, dtype=float)))
    coefficient_of_variation = ndvi_std / baseline_ndvi if baseline_ndvi else 1.0
    stability_score = max(0.1, 1.0 - (coefficient_of_variation * 1.5))
    confidence_score = round(min(1.0, completeness_ratio * stability_score), 2)

    zone_classification = _classify_ndvi_value(baseline_ndvi, request.ndvi_thresholds)
    phenology = _get_phenology_stage(
        request.crop_type,
        _extract_month(request.satellite_readings[0].date),
    )
    anomalies = _detect_anomalies(ndvi_values, threshold_std=2.0)
    processing_time_ms = max(int(round((time.perf_counter() - start_time) * 1000)), 1)

    logger.info(
        "Calibration run completed for parcel_id=%s crop_type=%s system=%s",
        request.parcel_id,
        request.crop_type,
        request.system,
    )

    return CalibrationRunResponse(
        baseline_ndvi=round(baseline_ndvi, 2),
        baseline_ndre=round(baseline_ndre, 2),
        baseline_ndmi=round(baseline_ndmi, 2),
        confidence_score=confidence_score,
        zone_classification=zone_classification,
        phenology_stage=phenology.stage,
        anomaly_count=anomalies.anomaly_count,
        processing_time_ms=processing_time_ms,
    )


@router.post("/percentiles", response_model=PercentilesResponse)
async def calculate_percentiles(request: PercentilesRequest):
    if not request.values:
        raise HTTPException(status_code=400, detail="values must not be empty")
    if not request.percentiles:
        raise HTTPException(status_code=400, detail="percentiles must not be empty")

    try:
        values_array = np.array(request.values, dtype=float)
    except Exception as exc:
        raise HTTPException(
            status_code=400, detail="Unable to compute percentiles"
        ) from exc

    return PercentilesResponse(
        percentiles={
            f"p{int(percentile)}": float(
                cast(SupportsFloat, np.percentile(values_array, percentile))
            )
            for percentile in request.percentiles
        }
    )


@router.post("/detect-anomalies", response_model=DetectAnomaliesResponse)
async def detect_anomalies(request: DetectAnomaliesRequest):
    if not request.values:
        raise HTTPException(status_code=400, detail="values must not be empty")
    if request.threshold_std <= 0:
        raise HTTPException(status_code=400, detail="threshold_std must be positive")

    return _detect_anomalies(request.values, request.threshold_std)


@router.post("/classify-zones", response_model=ClassifyZonesResponse)
async def classify_zones(request: ClassifyZonesRequest):
    if not request.ndvi_values:
        raise HTTPException(status_code=400, detail="ndvi_values must not be empty")

    zones = [
        _classify_ndvi_value(value, request.thresholds) for value in request.ndvi_values
    ]
    distribution = {
        "optimal": zones.count("optimal"),
        "normal": zones.count("normal"),
        "stressed": zones.count("stressed"),
    }

    return ClassifyZonesResponse(zones=zones, distribution=distribution)


@router.post("/phenology", response_model=PhenologyResponse)
async def get_phenology(request: PhenologyRequest):
    return _get_phenology_stage(request.crop_type, request.month)
