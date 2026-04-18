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
from .referential_utils import get_calibration_capabilities, get_gdd_tbase_tupper
from .support.gdd_service import compute_daily_gdd
from .types import (
    CalibrationInput,
    CalibrationMetadata,
    CalibrationOutput,
    ConfidenceComponent,
    ConfidenceScore,
    MaturityPhase,
    WeatherRowAccessor,
)


def _get_frost_threshold(reference_data: dict[str, Any] | None) -> float:
    """Read frost threshold from referentiel seuils_meteo.gel.threshold_c."""
    if reference_data:
        gel = (reference_data.get("seuils_meteo") or {}).get("gel") or {}
        val = gel.get("threshold_c")
        if isinstance(val, (int, float)):
            return float(val)
    return -2.0  # safe default


def _is_evergreen(
    crop_type: str,
    reference_data: dict[str, Any] | None,
    planting_system: str | None = None,
) -> bool:
    """Determine if crop is evergreen from referentiel capacites_calibrage."""
    if reference_data:
        cap = reference_data.get("capacites_calibrage") or {}
        # Explicit flag if present
        if "evergreen" in cap:
            return bool(cap["evergreen"])
    capabilities = get_calibration_capabilities(
        crop_type,
        reference_data,
        subtype=planting_system,
    )
    if capabilities.phenology_mode == "state_machine":
        return True
    return False

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
        point for point in points if point.is_observed
    ]


def _observed_month_span(points: list[Any]) -> int:
    if not points:
        return 0
    first = min(point.date for point in points)
    last = max(point.date for point in points)
    return ((last.year - first.year) * 12) + (last.month - first.month) + 1


def _extract_location_from_weather_rows(
    weather_rows: list[dict[str, Any]],
) -> tuple[float, float] | None:
    """Return (lat, lon) from the first row that has both fields, or None."""
    for r in weather_rows:
        lat = r.get("latitude")
        lon = r.get("longitude")
        if lat is not None and lon is not None:
            return float(lat), float(lon)
    return None


def _compute_gdd_from_weather_rows(
    weather_rows: list[dict[str, Any]],
    crop_type: str,
    reference_data: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    """Compute daily GDD from raw weather rows using referential tbase/tupper.

    Used as a fallback when ``weather_gdd_daily`` has no data yet.
    Delegates to ``compute_daily_gdd`` — single source of truth for the formula.
    Returns rows with ``date``, ``gdd_daily``, ``chill_hours``.
    """
    tbase, tupper = get_gdd_tbase_tupper(crop_type, reference_data)
    if tbase is None:
        return []
    tupper = tupper if tupper is not None else 40.0

    result: list[dict[str, Any]] = []
    for r in sorted(weather_rows, key=lambda x: str(x.get("date", ""))):
        w = WeatherRowAccessor(r)
        if not w.date_str:
            continue
        gdd = compute_daily_gdd(w.temp_max, w.temp_min, tbase, tupper)
        result.append({
            "date": w.date_str,
            "gdd_daily": round(gdd, 4),
            "chill_hours": 1.0 if w.temp_min < 7.2 else 0.0,
        })
    return result


async def _enrich_step2_with_gdd(
    step2,
    *,
    lat: float,
    lon: float,
    crop_type: str,
    start_date: str,
    end_date: str,
    supabase_svc,
    weather_rows: list[dict[str, Any]] | None = None,
    reference_data: dict[str, Any] | None = None,
) -> None:
    """Populate step2 monthly GDD totals and cumulative from ``weather_gdd_daily``.

    Strategy:
    - Try to read from ``weather_gdd_daily`` (pre-computed, fast).
    - If empty (first calibration for this location/crop), compute GDD from
      ``weather_rows`` in memory using the referential formula, then persist
      to ``weather_gdd_daily`` asynchronously (fire-and-forget sync).
    - Skipped gracefully when Supabase is unavailable (tests, offline).
    """
    rows = await supabase_svc.get_gdd_timeseries(
        lat, lon, crop_type, start_date, end_date
    )

    if not rows:
        # Cache miss — compute from weather_rows already in memory
        if not weather_rows:
            return
        rows = _compute_gdd_from_weather_rows(weather_rows, crop_type, reference_data)
        if not rows:
            return
        # Fire-and-forget: persist to weather_gdd_daily for future calibrations
        asyncio.ensure_future(
            supabase_svc.upsert_gdd_rows(lat, lon, crop_type, rows)
        )

    monthly_totals: dict[str, float] = defaultdict(float)
    cumulative = 0.0
    cumulative_by_month: dict[str, float] = {}
    for row in rows:
        daily = float(row.get("gdd_daily") or 0.0)
        cumulative += daily
        month_key = str(row["date"])[:7]
        monthly_totals[month_key] += daily
        cumulative_by_month[month_key] = round(cumulative, 3)

    step2.cumulative_gdd = cumulative_by_month
    for agg in step2.monthly_aggregates:
        agg.gdd_total = round(monthly_totals.get(agg.month, 0.0), 3)


async def run_calibration_pipeline(
    *,
    calibration_input: CalibrationInput,
    satellite_images: list[dict[str, Any]],
    weather_rows: list[dict[str, Any]],
    storage=None,
    ndvi_raster_pixels: list[dict[str, Any]] | None = None,
    previous_output: CalibrationOutput | None = None,
    supabase_svc=None,
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
    observed_ndvi_points: list[Any] = []  # populated after step1 completes

    # --- Phase 1: S1(satellite_extraction) + S2(weather_extraction) — independent ---
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
        subtype=calibration_input.planting_system,
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

    for required_index in capabilities.required_indices:
        key = _canon_index_key(required_index)
        observed_points = _observed_points(step1.index_time_series.get(key, []))
        if not observed_points:
            raise ValueError(
                f"Calibration requires observed {key} series for planting_system "
                f"'{calibration_input.planting_system or 'default'}'"
            )

    nirv_series_raw = [
        {"date": p.date.isoformat(), "value": p.value}
        for p in step1.index_time_series.get("NIRv", [])
    ]

    # --- Phase 2: S2A(signal_classification) + S3(percentile_calculation) + S4(phenology_detection) + S6(yield_potential) ---
    signal_classification, step3, step4, step6 = await asyncio.gather(
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

    # Enrich step2 GDD from weather_gdd_daily (cache-first, compute-on-miss).
    if supabase_svc is not None:
        location = _extract_location_from_weather_rows(weather_rows)
        if location:
            dates = [str(r.get("date", "")) for r in weather_rows if r.get("date")]
            if dates:
                await _enrich_step2_with_gdd(
                    step2,
                    lat=location[0],
                    lon=location[1],
                    crop_type=calibration_input.crop_type,
                    start_date=min(dates),
                    end_date=max(dates),
                    supabase_svc=supabase_svc,
                    weather_rows=weather_rows,
                    reference_data=calibration_input.reference_data,
                )

    if not step4.yearly_stages:
        raise ValueError("Unable to detect phenology from observed satellite history")

    ndvi_percentiles = step3.global_percentiles.get("NDVI")
    if ndvi_percentiles is None:
        raise ValueError(
            "Calibration requires enough observed satellite history to compute NDVI percentiles"
        )

    # --- Phase 3: S5(anomaly_detection) + S7(zone_classification) — independent ---
    step5, step7 = await asyncio.gather(
        asyncio.to_thread(
            detect_anomalies,
            step1, step2, step4, adjustment,
            reference_data=calibration_input.reference_data,
            planting_system=calibration_input.planting_system,
            crop_type=calibration_input.crop_type,
        ),
        asyncio.to_thread(
            classify_zones,
            ndvi_percentiles,
            ndvi_raster_pixels=ndvi_raster_pixels,
            observed_ndvi_points=observed_ndvi_points,
            gci_percentiles=step3.global_percentiles.get("GCI"),
            observed_gci_points=_observed_points(step1.index_time_series.get("GCI", [])),
        ),
    )

    # --- Phase 4: S8(health_score) — needs S1 + S3 + S7 ---
    step8 = await asyncio.to_thread(
        calculate_health_score,
        step1=step1,
        step3=step3,
        step7=step7,
    )

    # Analysis fields for confidence scoring and recommendations
    soil_date, soil_fields = _latest_analysis_fields(calibration_input.analyses, "soil")
    water_date, water_fields = _latest_analysis_fields(calibration_input.analyses, "water")

    # Recommendations
    recommendations = generate_recommendations(
        step8=step8,
        step5=step5,
        step2=step2,
        crop_type=calibration_input.crop_type,
        maturity_phase=maturity_phase if isinstance(maturity_phase, MaturityPhase) else MaturityPhase.UNKNOWN,
    )

    confidence = calculate_confidence_score(
        ConfidenceInput(
            satellite_months=max(1, _observed_month_span(observed_ndvi_points)),
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

    has_real_zones = step7.zone_summary is not None and len(step7.zone_summary) > 1

    data_quality_flags: list[str] = []
    if len(observed_ndvi_points) < MIN_SATELLITE_IMAGES:
        data_quality_flags.append("insufficient_satellite_data")
    if not has_real_zones:
        data_quality_flags.append("single_pixel_zones")
    if _is_evergreen(
        calibration_input.crop_type,
        calibration_input.reference_data,
        calibration_input.planting_system,
    ) and not step4.referential_cycle_used:
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
