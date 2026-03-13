from __future__ import annotations

from datetime import UTC, datetime
from importlib import import_module
from typing import Any

import numpy as np

from .age_adjustment import (
    determine_maturity_phase,
    get_threshold_adjustment,
)
from .confidence import (
    ConfidenceInput,
    calculate_confidence_score,
)
from .step1_satellite_extraction import (
    extract_satellite_history,
)
from .step2_weather_extraction import extract_weather_history
from .step3_percentile_calculation import calculate_percentiles
from .step4_phenology_detection import detect_phenology
from .types import (
    CalibrationInput,
    CalibrationMetadata,
    CalibrationOutput,
    ConfidenceComponent,
    ConfidenceScore,
    MaturityPhase,
)


TBASE_BY_CROP = {
    "olivier": 10.0,
    "agrumes": 13.0,
    "avocatier": 10.0,
    "palmier_dattier": 18.0,
}


def _normalize_satellite_images(
    raw_images: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for row in raw_images:
        indices = row.get("indices")
        if isinstance(indices, dict):
            remapped = {
                "NDVI": indices.get("NDVI", indices.get("ndvi")),
                "NIRv": indices.get("NIRv", indices.get("nirv")),
                "NDMI": indices.get("NDMI", indices.get("ndmi")),
                "NDRE": indices.get("NDRE", indices.get("ndre")),
                "EVI": indices.get("EVI", indices.get("evi")),
                "MSAVI": indices.get("MSAVI", indices.get("msavi")),
                "MSI": indices.get("MSI", indices.get("msi")),
                "GCI": indices.get("GCI", indices.get("gci")),
            }
        else:
            remapped = {}

        normalized.append(
            {
                "date": row.get("date"),
                "cloud_coverage": row.get("cloud_coverage", 0),
                "indices": remapped,
            }
        )
    return normalized


def _latest_analysis_fields(
    analyses: list[dict[str, Any]], analysis_type: str
) -> tuple[datetime | None, dict[str, Any]]:
    filtered = [
        row for row in analyses if str(row.get("analysis_type")) == analysis_type
    ]
    if not filtered:
        return None, {}

    filtered_sorted = sorted(
        filtered, key=lambda row: str(row.get("analysis_date", ""))
    )
    latest = filtered_sorted[-1]
    raw_date = str(latest.get("analysis_date"))
    parsed = None
    try:
        parsed = datetime.fromisoformat(raw_date)
    except ValueError:
        parsed = None

    data = latest.get("data")
    return parsed, data if isinstance(data, dict) else {}


def run_calibration_pipeline(
    *,
    calibration_input: CalibrationInput,
    satellite_images: list[dict[str, Any]],
    weather_rows: list[dict[str, Any]],
    storage=None,
) -> CalibrationOutput:
    step5_fn = getattr(
        import_module("app.services.calibration.step5_anomaly_detection"),
        "detect_anomalies",
    )
    step6_fn = getattr(
        import_module("app.services.calibration.step6_yield_potential"),
        "calculate_yield_potential",
    )
    step7_fn = getattr(
        import_module("app.services.calibration.step7_zone_detection"),
        "classify_zones",
    )
    step8_fn = getattr(
        import_module("app.services.calibration.step8_health_score"),
        "calculate_health_score",
    )

    maturity_phase = determine_maturity_phase(
        planting_year=calibration_input.planting_year,
        crop_type=calibration_input.crop_type,
        reference_data=calibration_input.reference_data,
        variety=calibration_input.variety,
    )

    adjustment = get_threshold_adjustment(
        maturity_phase,
        planting_year=calibration_input.planting_year,
    )

    step1 = extract_satellite_history(
        organization_id=calibration_input.organization_id,
        parcel_id=calibration_input.parcel_id,
        images=_normalize_satellite_images(satellite_images),
        storage=storage,
    )

    tbase = TBASE_BY_CROP.get(calibration_input.crop_type, 10.0)
    step2 = extract_weather_history(
        weather_data=weather_rows,
        crop_type=calibration_input.crop_type,
        tbase=tbase,
    )

    step3 = calculate_percentiles(step1, age_adjustment=adjustment)
    step4 = detect_phenology(step1, step2)
    step5 = step5_fn(step1, step2, step4, adjustment)

    step6 = step6_fn(
        planting_year=calibration_input.planting_year,
        crop_type=calibration_input.crop_type,
        variety=calibration_input.variety,
        reference_data=calibration_input.reference_data,
        harvest_records=calibration_input.harvest_records,
        maturity_phase=maturity_phase,
    )

    ndvi_points = step1.index_time_series.get("NDVI", [])
    ndvi_values = [point.value for point in ndvi_points] if ndvi_points else [0.0]
    raster = np.array([ndvi_values], dtype=np.float64)
    ndvi_percentiles = step3.global_percentiles.get("NDVI")
    if ndvi_percentiles is None:
        ndvi_percentiles = next(iter(step3.global_percentiles.values()))
    step7 = step7_fn(raster, ndvi_percentiles)

    step8 = step8_fn(
        step1=step1,
        step3=step3,
        step5=step5,
        step7=step7,
    )

    soil_date, soil_fields = _latest_analysis_fields(calibration_input.analyses, "soil")
    water_date, water_fields = _latest_analysis_fields(
        calibration_input.analyses, "water"
    )

    confidence = calculate_confidence_score(
        ConfidenceInput(
            satellite_months=max(1, len(ndvi_points) // 2),
            soil_analysis_date=None if soil_date is None else soil_date.date(),
            soil_fields=soil_fields,
            water_analysis_date=None if water_date is None else water_date.date(),
            water_fields=water_fields,
            yield_years=len(calibration_input.harvest_records),
            crop_type=calibration_input.crop_type,
            variety=calibration_input.variety,
            planting_year=calibration_input.planting_year,
            planting_system=calibration_input.planting_system,
            has_boundary=True,
            coherence_level="none",
        )
    )

    return CalibrationOutput(
        parcel_id=calibration_input.parcel_id,
        maturity_phase=maturity_phase
        if isinstance(maturity_phase, MaturityPhase)
        else MaturityPhase.UNKNOWN,
        nutrition_option_suggestion=calibration_input.nutrition_option,
        step1=step1,
        step2=step2,
        step3=step3,
        step4=step4,
        step5=step5,
        step6=step6,
        step7=step7,
        step8=step8,
        confidence=ConfidenceScore(
            total_score=confidence.total_score,
            normalized_score=confidence.normalized_score,
            components={
                key: ConfidenceComponent(score=value, max_score=100.0)
                for key, value in confidence.components.items()
            },
        ),
        metadata=CalibrationMetadata(
            version="v2", generated_at=datetime.now(UTC), data_quality_flags=[]
        ),
    )
