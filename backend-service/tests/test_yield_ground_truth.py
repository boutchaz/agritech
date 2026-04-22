"""Tests for yield potential ground-truth integration.

Task 8: Harvest regularity adjusts yield range (generic, crop-agnostic).
Verifies: alternance detection works for any crop, harvest_regularity adjusts range.
"""

from __future__ import annotations

from importlib import import_module

s6_module = import_module("app.services.calibration.pipeline.s6_yield_potential")
fixtures_module = import_module("tests.fixtures.calibration_fixtures")

calculate_yield_potential = getattr(s6_module, "calculate_yield_potential")
build_crop_reference_fixture = getattr(fixtures_module, "build_crop_reference_fixture")

REFERENCE_DATA = build_crop_reference_fixture()


def test_alternance_with_marked_alternance_widens_range() -> None:
    base = calculate_yield_potential(
        planting_year=2015,
        crop_type="olivier",
        variety=None,
        reference_data=REFERENCE_DATA,
        harvest_records=[],
        harvest_regularity=None,
    )
    alternance = calculate_yield_potential(
        planting_year=2015,
        crop_type="olivier",
        variety=None,
        reference_data=REFERENCE_DATA,
        harvest_records=[],
        harvest_regularity="marked_alternance",
    )
    base_range = base.yield_potential.maximum - base.yield_potential.minimum
    alt_range = alternance.yield_potential.maximum - alternance.yield_potential.minimum
    assert alt_range > base_range


def test_stable_narrows_range() -> None:
    base = calculate_yield_potential(
        planting_year=2015,
        crop_type="olivier",
        variety=None,
        reference_data=REFERENCE_DATA,
        harvest_records=[],
        harvest_regularity=None,
    )
    stable = calculate_yield_potential(
        planting_year=2015,
        crop_type="olivier",
        variety=None,
        reference_data=REFERENCE_DATA,
        harvest_records=[],
        harvest_regularity="stable",
    )
    base_range = base.yield_potential.maximum - base.yield_potential.minimum
    stable_range = stable.yield_potential.maximum - stable.yield_potential.minimum
    assert stable_range < base_range


def test_very_irregular_widens_more_than_alternance() -> None:
    alternance = calculate_yield_potential(
        planting_year=2015,
        crop_type="olivier",
        variety=None,
        reference_data=REFERENCE_DATA,
        harvest_records=[],
        harvest_regularity="marked_alternance",
    )
    irregular = calculate_yield_potential(
        planting_year=2015,
        crop_type="olivier",
        variety=None,
        reference_data=REFERENCE_DATA,
        harvest_records=[],
        harvest_regularity="very_irregular",
    )
    alt_range = alternance.yield_potential.maximum - alternance.yield_potential.minimum
    irr_range = irregular.yield_potential.maximum - irregular.yield_potential.minimum
    assert irr_range >= alt_range


def test_none_regularity_no_adjustment() -> None:
    none_result = calculate_yield_potential(
        planting_year=2015,
        crop_type="olivier",
        variety=None,
        reference_data=REFERENCE_DATA,
        harvest_records=[],
        harvest_regularity=None,
    )
    default_result = calculate_yield_potential(
        planting_year=2015,
        crop_type="olivier",
        variety=None,
        reference_data=REFERENCE_DATA,
        harvest_records=[],
    )
    assert none_result.yield_potential.minimum == default_result.yield_potential.minimum
    assert none_result.yield_potential.maximum == default_result.yield_potential.maximum


def test_alternance_detection_works_for_non_olivier() -> None:
    """Alternance detection should work for any crop, not just olivier."""
    from datetime import date

    types_module = import_module("app.services.calibration.types")
    Step1Output = getattr(types_module, "Step1Output")
    IndexTimePoint = getattr(types_module, "IndexTimePoint")

    points = []
    for year in [2022, 2023, 2024, 2025]:
        value = 0.6 if year % 2 == 0 else 0.4
        points.append(IndexTimePoint(date=date(year, 6, 15), value=value))

    s1 = Step1Output(
        index_time_series={"NDVI": points},
        cloud_coverage_mean=10.0,
        filtered_image_count=4,
        outlier_count=0,
        interpolated_dates=[],
        raster_paths={},
    )
    result = calculate_yield_potential(
        planting_year=2015,
        crop_type="agrumes",
        variety=None,
        reference_data=REFERENCE_DATA,
        harvest_records=[],
        satellite_data=s1,
        current_year=2026,
    )
    assert result.alternance is not None
    assert result.alternance.detected is True
