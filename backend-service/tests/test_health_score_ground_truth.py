"""Tests for ground-truth data integration into health score (s8).

Verifies that soil/water/foliar analysis data adjusts health score components
within bounded ±20% range, and that no data produces identical scores.
"""

from __future__ import annotations

from importlib import import_module

s8_module = import_module("app.services.calibration.pipeline.s8_health_score")
types_module = import_module("app.services.calibration.types")

calculate_health_score = getattr(s8_module, "calculate_health_score")
Step1Output = getattr(types_module, "Step1Output")
Step3Output = getattr(types_module, "Step3Output")
Step7Output = getattr(types_module, "Step7Output")
Step8Output = getattr(types_module, "Step8Output")
IndexTimePoint = getattr(types_module, "IndexTimePoint")
PercentileSet = getattr(types_module, "PercentileSet")
ZoneSummary = getattr(types_module, "ZoneSummary")
GeoJsonFeatureCollection = getattr(types_module, "GeoJsonFeatureCollection")

from datetime import date


def _baseline_inputs():
    """Build minimal valid s1/s3/s7 that produce a known satellite-only health score."""
    base_date = date(2025, 6, 1)
    ndvi_points = [
        IndexTimePoint(date=date(2025, m, 15), value=0.5) for m in range(1, 13)
    ]
    nirv_points = [
        IndexTimePoint(date=date(2025, m, 15), value=0.35) for m in range(1, 13)
    ]
    ndmi_points = [
        IndexTimePoint(date=date(2025, m, 15), value=0.2) for m in range(1, 13)
    ]
    ndre_points = [
        IndexTimePoint(date=date(2025, m, 15), value=0.15) for m in range(1, 13)
    ]

    s1 = Step1Output(
        index_time_series={
            "NDVI": ndvi_points,
            "NIRv": nirv_points,
            "NDMI": ndmi_points,
            "NDRE": ndre_points,
        },
        cloud_coverage_mean=10.0,
        filtered_image_count=12,
        outlier_count=0,
        interpolated_dates=[],
        raster_paths={},
    )
    s3 = Step3Output(
        global_percentiles={
            "NDVI": PercentileSet(
                p10=0.3, p25=0.4, p50=0.5, p75=0.6, p90=0.7, mean=0.5, std=0.1
            ),
            "NIRv": PercentileSet(
                p10=0.2, p25=0.25, p50=0.35, p75=0.45, p90=0.5, mean=0.35, std=0.08
            ),
            "NDMI": PercentileSet(
                p10=0.1, p25=0.15, p50=0.2, p75=0.25, p90=0.3, mean=0.2, std=0.05
            ),
            "NDRE": PercentileSet(
                p10=0.1, p25=0.12, p50=0.15, p75=0.18, p90=0.2, mean=0.15, std=0.03
            ),
        },
    )
    s7 = Step7Output(
        zones_geojson=GeoJsonFeatureCollection(type="FeatureCollection", features=[]),
        zone_summary=[
            ZoneSummary(class_name="B", surface_percent=80.0),
            ZoneSummary(class_name="C", surface_percent=20.0),
        ],
        spatial_pattern_type="homogeneous",
    )
    return s1, s3, s7


def test_good_soil_adjusts_nutritional_upward() -> None:
    s1, s3, s7 = _baseline_inputs()
    baseline = calculate_health_score(step1=s1, step3=s3, step7=s7)
    baseline_nutritional = baseline.health_score.components["nutritional"]

    good_soil = {
        "ph_level": 6.8,
        "organic_matter_percentage": 3.2,
        "phosphorus_ppm": 40,
        "potassium_ppm": 300,
    }
    adjusted = calculate_health_score(
        step1=s1, step3=s3, step7=s7, soil_analysis=good_soil
    )
    adjusted_nutritional = adjusted.health_score.components["nutritional"]

    assert adjusted_nutritional >= baseline_nutritional
    assert adjusted_nutritional <= baseline_nutritional * 1.2


def test_poor_soil_adjusts_nutritional_downward() -> None:
    s1, s3, s7 = _baseline_inputs()
    baseline = calculate_health_score(step1=s1, step3=s3, step7=s7)
    baseline_nutritional = baseline.health_score.components["nutritional"]

    poor_soil = {
        "ph_level": 8.8,
        "electrical_conductivity": 5.2,
        "organic_matter_percentage": 0.5,
    }
    adjusted = calculate_health_score(
        step1=s1, step3=s3, step7=s7, soil_analysis=poor_soil
    )
    adjusted_nutritional = adjusted.health_score.components["nutritional"]

    assert adjusted_nutritional <= baseline_nutritional
    assert adjusted_nutritional >= baseline_nutritional * 0.8


def test_high_sar_water_adjusts_hydric_downward() -> None:
    s1, s3, s7 = _baseline_inputs()
    baseline = calculate_health_score(step1=s1, step3=s3, step7=s7)
    baseline_hydric = baseline.health_score.components["hydric"]

    poor_water = {"sar": 8.5, "chloride_ppm": 15.0}
    adjusted = calculate_health_score(
        step1=s1, step3=s3, step7=s7, water_analysis=poor_water
    )
    adjusted_hydric = adjusted.health_score.components["hydric"]

    assert adjusted_hydric <= baseline_hydric
    assert adjusted_hydric >= baseline_hydric * 0.8


def test_no_analysis_data_produces_identical_scores() -> None:
    s1, s3, s7 = _baseline_inputs()
    baseline = calculate_health_score(step1=s1, step3=s3, step7=s7)
    no_data = calculate_health_score(step1=s1, step3=s3, step7=s7)

    assert baseline.health_score.total == no_data.health_score.total
    assert baseline.health_score.components == no_data.health_score.components
