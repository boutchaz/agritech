from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import UTC, datetime
from typing import Any

import numpy as np

from .support.age_adjustment import (
    determine_maturity_phase,
    get_threshold_adjustment,
)
from .support.confidence import (
    ConfidenceInput,
    calculate_confidence_score,
)
from .support.recommendations import generate_recommendations
from .pipeline.s1_satellite_extraction import extract_satellite_history
from .pipeline.s2_weather_extraction import extract_weather_history
from .pipeline.s2a_signal_classification import classify_signal
from .pipeline.s3_percentile_calculation import calculate_percentiles
from .pipeline.s4_phenology_detection import detect_phenology
from .pipeline.s5_anomaly_detection import detect_anomalies
from .pipeline.s6_yield_potential import calculate_yield_potential
from .pipeline.s7_zone_detection import classify_zones
from .pipeline.s8_health_score import calculate_health_score
from .support.gdd_service import precompute_gdd_rows
from .referential_utils import get_calibration_capabilities
from .types import (
    CalibrationInput,
    CalibrationMetadata,
    CalibrationOutput,
    ConfidenceComponent,
    ConfidenceScore,
    MaturityPhase,
)

FROST_THRESHOLD_BY_CROP = {
    "olivier": -2.0,
    "agrumes": 0.0,
    "avocatier": 2.0,
    "palmier_dattier": -4.0,
}

EVERGREEN_CROPS = {"olivier", "agrumes", "avocatier"}

_COMPONENT_MAX_SCORES: dict[str, float] = {
    "satellite": 30.0,
    "soil": 20.0,
    "water": 15.0,
    "yield": 20.0,
    "profile": 10.0,
    "irrigation": 10.0,
    "coherence": 5.0,
}

MIN_SATELLITE_IMAGES = 6

# Lowercase / legacy keys from fixtures or old clients → canonical names (GEE / DB)
_INDEX_KEY_ALIASES: dict[str, str] = {
    "ndvi": "NDVI",
    "nirv": "NIRv",
    "ndmi": "NDMI",
    "ndre": "NDRE",
    "evi": "EVI",
    "msavi": "MSAVI2",
    "msavi2": "MSAVI2",
    "msi": "MSI",
    "gci": "GCI",
    "osavi": "OSAVI",
    "savi": "SAVI",
    "mndwi": "MNDWI",
    "mcari": "MCARI",
    "tcari": "TCARI",
    "tcari_osavi": "TCARI_OSAVI",
}


def _canon_index_key(raw: object) -> str:
    k = str(raw)
    tl = k.lower()
    if tl in _INDEX_KEY_ALIASES:
        return _INDEX_KEY_ALIASES[tl]
    return k


def _normalize_satellite_images(
    raw_images: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Merge all index keys into canonical names; do not drop OSAVI, TCARI, etc.

    Legacy rows may use MSAVI; the pipeline uses MSAVI2 to match GEE output names.
    """
    normalized: list[dict[str, Any]] = []
    for row in raw_images:
        indices = row.get("indices")
        if isinstance(indices, dict):
            remapped = {_canon_index_key(k): v for k, v in indices.items()}
            if "MSAVI" in remapped and "MSAVI2" not in remapped:
                remapped["MSAVI2"] = remapped["MSAVI"]
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


def _observed_points(points: list[Any]) -> list[Any]:
    return [
        point for point in points if not point.interpolated and not point.outlier
    ]


def _observed_month_span(points: list[Any]) -> int:
    if not points:
        return 0
    first = min(point.date for point in points)
    last = max(point.date for point in points)
    return ((last.year - first.year) * 12) + (last.month - first.month) + 1


async def run_calibration_pipeline(
    *,
    calibration_input: CalibrationInput,
    satellite_images: list[dict[str, Any]],
    weather_rows: list[dict[str, Any]],
    storage=None,
    ndvi_raster_pixels: list[dict[str, Any]] | None = None,
    previous_output: CalibrationOutput | None = None,
) -> CalibrationOutput:
    # --- Pre-pipeline: fast synchronous setup ---
    maturity_phase = determine_maturity_phase(
        planting_year=calibration_input.planting_year,
        crop_type=calibration_input.crop_type,
        reference_data=calibration_input.reference_data,
        variety=calibration_input.variety,
    )
    adjustment = get_threshold_adjustment(
        maturity_phase,
        planting_year=calibration_input.planting_year,
        reference_data=calibration_input.reference_data,
    )
    normalized_images = _normalize_satellite_images(satellite_images)

    # --- Phase 1: S1 and S2 are fully independent ---
    step1, step2 = await asyncio.gather(
        asyncio.to_thread(
            extract_satellite_history,
            organization_id=calibration_input.organization_id,
            parcel_id=calibration_input.parcel_id,
            images=normalized_images,
            storage=storage,
            reference_data=calibration_input.reference_data,
        ),
        asyncio.to_thread(
            extract_weather_history,
            weather_data=weather_rows,
            crop_type=calibration_input.crop_type,
            reference_data=calibration_input.reference_data,
        ),
    )

    # Capability & data guard (sequential — depends on step1)
    capabilities = get_calibration_capabilities(
        calibration_input.crop_type,
        calibration_input.reference_data,
    )
    if not capabilities.supported:
        raise ValueError(
            f"Calibration is not supported for crop_type '{calibration_input.crop_type}'"
        )
    observed_ndvi_points = _observed_points(step1.index_time_series.get("NDVI", []))
    if len(observed_ndvi_points) < capabilities.min_observed_images:
        raise ValueError(
            f"Calibration requires at least {capabilities.min_observed_images} "
            "observed NDVI images after filtering"
        )

    nirv_series_raw = [
        {"date": p.date.isoformat(), "value": p.value}
        for p in step1.index_time_series.get("NIRv", [])
    ]

    # --- Phase 2: GDD + S2A + S3 + S4 + S6 all run concurrently ---
    # S4 reads step2.daily_weather / extreme_events only — GDD enrichment writes
    # cumulative_gdd and monthly_aggregates.gdd_total, so no race condition.
    (gdd_rows, _), signal_classification, step3, step4, step6 = await asyncio.gather(
        asyncio.to_thread(
            precompute_gdd_rows,
            weather_rows,
            calibration_input.crop_type,
            variety=calibration_input.variety,
            nirv_series=nirv_series_raw,
            reference_data=calibration_input.reference_data,
        ),
        asyncio.to_thread(
            classify_signal,
            step1, step2, calibration_input.crop_type,
        ),
        asyncio.to_thread(
            calculate_percentiles,
            step1,
            reference_data=calibration_input.reference_data,
            crop_type=calibration_input.crop_type,
            planting_system=calibration_input.planting_system,
        ),
        asyncio.to_thread(
            detect_phenology,
            step1,
            step2,
            crop_type=calibration_input.crop_type,
            variety=calibration_input.variety,
            planting_system=calibration_input.planting_system,
            reference_data=calibration_input.reference_data,
            maturity_phase=maturity_phase.value if isinstance(maturity_phase, MaturityPhase) else None,
        ),
        asyncio.to_thread(
            calculate_yield_potential,
            planting_year=calibration_input.planting_year,
            crop_type=calibration_input.crop_type,
            variety=calibration_input.variety,
            reference_data=calibration_input.reference_data,
            harvest_records=calibration_input.harvest_records,
            maturity_phase=maturity_phase,
            satellite_data=step1,
            plant_count=calibration_input.plant_count,
            area_hectares=calibration_input.area_hectares,
            density_per_hectare=calibration_input.density_per_hectare,
        ),
    )

    # Enrich step2 with crop-aware GDD totals (sequential write — safe post-phase-2)
    gdd_column = f"gdd_{calibration_input.crop_type}"
    crop_aware_cumulative: dict[str, float] = {}
    monthly_gdd_totals: dict[str, float] = defaultdict(float)
    running_gdd = 0.0
    for row in sorted(gdd_rows, key=lambda r: str(r.get("date", ""))):
        daily = float(row.get(gdd_column, 0.0))
        running_gdd += daily
        month_key = str(row.get("date", ""))[:7]
        crop_aware_cumulative[month_key] = round(running_gdd, 3)
        monthly_gdd_totals[month_key] += daily
    if crop_aware_cumulative:
        step2.cumulative_gdd = crop_aware_cumulative
        for agg in step2.monthly_aggregates:
            agg.gdd_total = round(monthly_gdd_totals.get(agg.month, 0.0), 3)

    if not step4.yearly_stages:
        raise ValueError("Unable to detect phenology from observed satellite history")

    # Persist computed GDD to weather_gdd_daily cache (async task, no blocking)
    _w0 = weather_rows[0] if weather_rows else {}
    _cache_lat = _w0.get("latitude")
    _cache_lon = _w0.get("longitude")
    if _cache_lat is not None and _cache_lon is not None and gdd_rows:
        from ..supabase_service import supabase_service as _ss
        asyncio.create_task(
            _ss.upsert_gdd_rows(_cache_lat, _cache_lon, calibration_input.crop_type, list(gdd_rows))
        )

    # Build NDVI raster for zone detection
    ndvi_values = [p.value for p in observed_ndvi_points] if observed_ndvi_points else [0.0]
    median_ndvi = float(np.median(ndvi_values))

    pixel_coords: list[dict[str, float]] | None = None
    if ndvi_raster_pixels and len(ndvi_raster_pixels) > 1:
        valid_pixels = [
            p for p in ndvi_raster_pixels
            if p.get("value") is not None
        ]
        pixel_values = [float(p["value"]) for p in valid_pixels]
        if len(pixel_values) > 1:
            raster = np.array(pixel_values, dtype=np.float64).reshape(-1, 1)
            has_real_zones = True
            # Preserve geographic coordinates for smooth heatmap rendering
            if all(p.get("lon") is not None and p.get("lat") is not None for p in valid_pixels):
                pixel_coords = [
                    {"lon": float(p["lon"]), "lat": float(p["lat"])}
                    for p in valid_pixels
                ]
        else:
            raster = np.array([[median_ndvi]], dtype=np.float64)
            has_real_zones = False
    else:
        raster = np.array([[median_ndvi]], dtype=np.float64)
        has_real_zones = False

    ndvi_percentiles = step3.global_percentiles.get("NDVI")
    if ndvi_percentiles is None:
        raise ValueError(
            "Calibration requires enough observed satellite history to compute NDVI percentiles"
        )

    # --- Phase 3: S5 and S7 are independent (S5 needs step4, S7 needs step3) ---
    step5, step7 = await asyncio.gather(
        asyncio.to_thread(
            detect_anomalies,
            step1, step2, step4, adjustment,
            reference_data=calibration_input.reference_data,
            planting_system=calibration_input.planting_system,
            crop_type=calibration_input.crop_type,
        ),
        asyncio.to_thread(
            classify_zones, raster, ndvi_percentiles,
            pixel_coords=pixel_coords,
        ),
    )

    # --- Phase 4: S8 needs step1 + step3 + step7 ---
    step8 = await asyncio.to_thread(
        calculate_health_score,
        step1=step1,
        step3=step3,
        step7=step7,
    )

    # Recommendations — was wired to empty list, now active
    recommendations = generate_recommendations(
        step8=step8,
        step5=step5,
        step2=step2,
        crop_type=calibration_input.crop_type,
        maturity_phase=maturity_phase,
    )

    # Confidence scoring
    soil_date, soil_fields = _latest_analysis_fields(calibration_input.analyses, "soil")
    water_date, water_fields = _latest_analysis_fields(calibration_input.analyses, "water")
    ndvi_points = observed_ndvi_points

    confidence = calculate_confidence_score(
        ConfidenceInput(
            satellite_months=max(1, _observed_month_span(ndvi_points)),
            soil_analysis_date=None if soil_date is None else soil_date.date(),
            soil_fields=soil_fields,
            water_analysis_date=None if water_date is None else water_date.date(),
            water_fields=water_fields,
            yield_years=len(calibration_input.harvest_records),
            crop_type=calibration_input.crop_type,
            variety=calibration_input.variety,
            planting_year=calibration_input.planting_year,
            planting_system=calibration_input.planting_system,
            irrigation_frequency=calibration_input.irrigation_frequency,
            volume_per_tree_liters=calibration_input.volume_per_tree_liters,
            water_source=calibration_input.water_source,
            has_boundary=True,
            coherence_level="none",
        )
    )

    data_quality_flags: list[str] = []
    if len(ndvi_points) < MIN_SATELLITE_IMAGES:
        data_quality_flags.append("insufficient_satellite_data")
    if not has_real_zones:
        data_quality_flags.append("single_pixel_zones")
    if calibration_input.crop_type in EVERGREEN_CROPS and not step4.referential_cycle_used:
        data_quality_flags.append("evergreen_phenology_approximate")
    if step4.status != "ok":
        data_quality_flags.append(f"phenology_{step4.status}")

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
        signal_classification=signal_classification,
        recommendations=recommendations,
        confidence=ConfidenceScore(
            total_score=confidence.total_score,
            normalized_score=confidence.normalized_score,
            components={
                key: ConfidenceComponent(
                    score=value,
                    max_score=_COMPONENT_MAX_SCORES.get(key, 100.0),
                )
                for key, value in confidence.components.items()
            },
        ),
        metadata=CalibrationMetadata(
            version="v2",
            generated_at=datetime.now(UTC),
            data_quality_flags=data_quality_flags,
        ),
    )
