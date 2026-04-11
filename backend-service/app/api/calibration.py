from datetime import datetime
import logging
from typing import Any, SupportsFloat, TypedDict, cast

import numpy as np
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from ..services.calibration.support.gdd_service import precompute_gdd_rows
from ..services.calibration.orchestrator import run_calibration_pipeline
from ..services.calibration.types import CalibrationInput, CalibrationOutput

from app.middleware.auth import get_current_user_or_service

router = APIRouter(dependencies=[Depends(get_current_user_or_service)])
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
DEFAULT_CROP_TYPE = "olivier"


# TODO: Replace fallback with proper crop/system expansion once all types are defined
def _normalize_crop_type(crop_type: str | None) -> str:
    """Accept any crop_type — map unknown ones to default with a log warning."""
    if not crop_type or not crop_type.strip():
        logger.warning(
            "Empty crop_type received, defaulting to '%s'", DEFAULT_CROP_TYPE
        )
        return DEFAULT_CROP_TYPE
    if crop_type in VALID_CROP_TYPES:
        return crop_type
    logger.warning(
        "Unknown crop_type '%s' not in %s — defaulting to '%s'",
        crop_type,
        VALID_CROP_TYPES,
        DEFAULT_CROP_TYPE,
    )
    return DEFAULT_CROP_TYPE


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


class CalibrationRunV2Request(BaseModel):
    calibration_input: CalibrationInput
    satellite_images: list[dict[str, Any]]
    weather_rows: list[dict[str, Any]]
    ndvi_raster_pixels: list[dict[str, Any]] | None = None


class ExtractRasterRequest(BaseModel):
    geometry: list[list[float]]
    start_date: str
    end_date: str
    scale: int = 10


class RasterPixel(BaseModel):
    lon: float
    lat: float
    value: float


class ExtractRasterResponse(BaseModel):
    pixels: list[RasterPixel]
    bounds: dict[str, float]
    scale: int
    count: int
    stats: dict[str, float]


class PrecomputeGddRequest(BaseModel):
    latitude: float
    longitude: float
    crop_type: str
    variety: str | None = None
    chill_threshold: int | None = None
    nirv_series: list[dict[str, Any]] = Field(default_factory=list)
    rows: list[dict[str, Any]] = Field(default_factory=list)
    reference_data: dict[str, Any] | None = None


class PrecomputeGddResponse(BaseModel):
    crop_type: str
    updated_rows: int
    rows: list[dict[str, Any]] = Field(default_factory=list)


def _build_v2_error(step: str, reason: str) -> dict[str, str]:
    return {"step": step, "reason": reason}


def _validate_v2_request(request: CalibrationRunV2Request) -> None:
    request.calibration_input.crop_type = _normalize_crop_type(
        request.calibration_input.crop_type
    )

    if len(request.satellite_images) < 1:
        raise HTTPException(
            status_code=400,
            detail=_build_v2_error(
                "validation",
                "Insufficient satellite data",
            ),
        )

    if len(request.weather_rows) < 1:
        raise HTTPException(
            status_code=400,
            detail=_build_v2_error(
                "validation",
                "Insufficient weather data",
            ),
        )


def _run_v2(request: CalibrationRunV2Request) -> CalibrationOutput:
    _validate_v2_request(request)

    try:
        return run_calibration_pipeline(
            calibration_input=request.calibration_input,
            satellite_images=request.satellite_images,
            weather_rows=request.weather_rows,
            storage=None,
            ndvi_raster_pixels=request.ndvi_raster_pixels,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=_build_v2_error("pipeline", str(exc)),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("V2 calibration pipeline failed")
        raise HTTPException(
            status_code=500,
            detail=_build_v2_error(
                "pipeline",
                "Internal error while running calibration V2",
            ),
        ) from exc


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


def _parse_thresholds(thresholds: NdviThresholds) -> tuple[float, float, float, float]:
    optimal_min, optimal_max = thresholds.optimal
    return optimal_min, optimal_max, thresholds.vigilance, thresholds.alerte


def _classify_ndvi_value(value: float, thresholds: NdviThresholds) -> str:
    optimal_min, optimal_max, vigilance, alerte = _parse_thresholds(thresholds)

    if value <= alerte:
        return "stressed"
    if value < vigilance:
        return "stressed"
    if value >= optimal_min and value <= optimal_max:
        return "optimal"
    if value > optimal_max:
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
    crop_type = _normalize_crop_type(crop_type)

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


@router.post("/v2/run", response_model=CalibrationOutput)
async def run_calibration_v2(request: CalibrationRunV2Request):
    return _run_v2(request)


@router.post("/run-v2", response_model=CalibrationOutput)
async def run_calibration_v2_legacy(request: CalibrationRunV2Request):
    return _run_v2(request)


@router.post("/v2/precompute-gdd", response_model=PrecomputeGddResponse)
async def precompute_gdd_v2(request: PrecomputeGddRequest):
    request.crop_type = _normalize_crop_type(request.crop_type)

    updated_list, count = precompute_gdd_rows(
        list(request.rows),
        request.crop_type,
        variety=request.variety,
        chill_threshold=request.chill_threshold,
        nirv_series=request.nirv_series,
        reference_data=request.reference_data,
    )

    return PrecomputeGddResponse(
        crop_type=request.crop_type,
        updated_rows=count,
        rows=updated_list,
    )


@router.post("/v2/extract-raster", response_model=ExtractRasterResponse)
async def extract_ndvi_raster(request: ExtractRasterRequest):
    from ..services.earth_engine import EarthEngineService

    ee_service = EarthEngineService()
    ee_service.initialize()

    geometry = {"type": "Polygon", "coordinates": [request.geometry]}

    result = ee_service.extract_ndvi_raster(
        geometry=geometry,
        start_date=request.start_date,
        end_date=request.end_date,
        scale=request.scale,
    )
    return ExtractRasterResponse(**result)


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
