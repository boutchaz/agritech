from datetime import date
from importlib import import_module
import math


types_module = import_module("app.services.calibration.types")
step4_module = import_module("app.services.calibration.step4_phenology_detection")

Step1Output = getattr(types_module, "Step1Output")
Step2Output = getattr(types_module, "Step2Output")
detect_phenology = getattr(step4_module, "detect_phenology")


def _build_step1_for_three_years() -> object:
    index_points = {"NIRv": [], "NDVI": []}
    for year in [2023, 2024, 2025]:
        for month in range(1, 13):
            val = 0.45 + 0.18 * math.sin((2 * math.pi * (month - 1)) / 12)
            point = {
                "date": date(year, month, 15).isoformat(),
                "value": round(val, 4),
                "outlier": False,
                "interpolated": False,
            }
            index_points["NIRv"].append(point)
            index_points["NDVI"].append(point)

    return Step1Output.model_validate(
        {
            "index_time_series": index_points,
            "cloud_coverage_mean": 10,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {"NIRv": [], "NDVI": []},
        }
    )


def _build_step2_weather() -> object:
    monthly = []
    cumulative = {}
    running = 0.0
    for year in [2023, 2024, 2025]:
        for month in range(1, 13):
            key = f"{year}-{month:02d}"
            gdd_total = 80 + month * 10
            running += gdd_total
            cumulative[key] = running
            monthly.append(
                {
                    "month": key,
                    "precipitation_total": 20.0,
                    "gdd_total": gdd_total,
                }
            )

    return Step2Output.model_validate(
        {
            "daily_weather": [
                {
                    "date": "2023-01-15",
                    "temp_min": 5,
                    "temp_max": 15,
                    "precip": 2,
                    "et0": 1,
                }
            ],
            "monthly_aggregates": monthly,
            "cumulative_gdd": cumulative,
            "chill_hours": 120,
            "extreme_events": [],
        }
    )


def test_step4_detects_main_phenology_dates() -> None:
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()

    output = detect_phenology(step1, step2)

    assert output.mean_dates.peak is not None
    assert output.mean_dates.dormancy_exit is not None
    assert output.mean_dates.decline_start is not None
    assert output.status == "ok"
    assert len(output.yearly_stages) >= 1


def test_step4_variability_is_reasonable_for_stable_curve() -> None:
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()
    output = detect_phenology(step1, step2)

    assert output.inter_annual_variability_days["peak"] < 30


def test_step4_produces_gdd_correlation_for_each_stage() -> None:
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()
    output = detect_phenology(step1, step2)

    assert set(output.gdd_correlation.keys()) == {
        "dormancy_exit",
        "peak",
        "plateau_start",
        "decline_start",
        "dormancy_entry",
    }


def test_step4_uses_referential_cycle_when_stades_bbch_present() -> None:
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
        "systemes": {"intensif": {"indice_cle": "NDVI"}},
    }
    output = detect_phenology(
        step1,
        step2,
        reference_data=reference_data,
        crop_type="olivier",
        planting_system="intensif",
    )
    assert output.referential_cycle_used is True
    assert output.mean_dates.peak is not None


def test_step4_resolves_index_from_referential() -> None:
    """When referential has systemes[system].indice_cle, step4 uses that index."""
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
        "systemes": {"traditionnel": {"indice_cle": "NDVI"}},
    }
    output = detect_phenology(
        step1,
        step2,
        reference_data=reference_data,
        crop_type="olivier",
        planting_system="traditionnel",
    )
    assert output.referential_cycle_used is True
    assert output.mean_dates.dormancy_exit is not None


def test_step4_referential_cycle_avoids_year_boundary_doy_bias() -> None:
    """Dec/Jan stages should not average to an unrelated mid-year date."""
    points = {
        "NIRv": [
            # Cycle 2024: dormancy exit in Jan
            {"date": "2023-12-15", "value": 0.10, "outlier": False, "interpolated": False},
            {"date": "2024-01-15", "value": 0.30, "outlier": False, "interpolated": False},
            {"date": "2024-03-15", "value": 0.60, "outlier": False, "interpolated": False},
            {"date": "2024-06-15", "value": 0.90, "outlier": False, "interpolated": False},
            {"date": "2024-09-15", "value": 0.40, "outlier": False, "interpolated": False},
            {"date": "2024-11-15", "value": 0.20, "outlier": False, "interpolated": False},
            # Cycle 2025: dormancy exit in Dec
            {"date": "2024-12-15", "value": 0.30, "outlier": False, "interpolated": False},
            {"date": "2025-01-15", "value": 0.25, "outlier": False, "interpolated": False},
            {"date": "2025-03-15", "value": 0.58, "outlier": False, "interpolated": False},
            {"date": "2025-06-15", "value": 0.88, "outlier": False, "interpolated": False},
            {"date": "2025-09-15", "value": 0.42, "outlier": False, "interpolated": False},
            {"date": "2025-11-15", "value": 0.18, "outlier": False, "interpolated": False},
        ],
        "NDVI": [],
    }

    step1 = Step1Output.model_validate(
        {
            "index_time_series": points,
            "cloud_coverage_mean": 10,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {"NIRv": [], "NDVI": []},
        }
    )

    cumulative = {
        "2023-12": 50.0,
        "2024-01": 90.0,
        "2024-03": 170.0,
        "2024-06": 260.0,
        "2024-09": 330.0,
        "2024-11": 380.0,
        "2024-12": 60.0,
        "2025-01": 100.0,
        "2025-03": 180.0,
        "2025-06": 270.0,
        "2025-09": 340.0,
        "2025-11": 390.0,
    }
    step2 = Step2Output.model_validate(
        {
            "daily_weather": [
                {
                    "date": "2024-01-15",
                    "temp_min": 5,
                    "temp_max": 15,
                    "precip": 2,
                    "et0": 1,
                }
            ],
            "monthly_aggregates": [],
            "cumulative_gdd": cumulative,
            "chill_hours": 0,
            "extreme_events": [],
        }
    )

    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ]
    }

    output = detect_phenology(step1, step2, reference_data=reference_data)

    assert output.referential_cycle_used is True
    # Without cycle-relative day averaging, this can drift to late summer/early autumn.
    assert output.mean_dates.dormancy_exit.month in {12, 1}


def test_step4_uses_stage_names_from_referential_when_available() -> None:
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "phase_kc": "Dormancy", "mois": ["Dec", "Jan"]},
            {"code": "53", "phase_kc": "Bud Break", "mois": ["Mar", "Apr"]},
            {"code": "65", "phase_kc": "Flowering", "mois": ["May", "Jun"]},
            {"code": "75", "phase_kc": "Fruit Fill", "mois": ["Jul", "Aug"]},
            {"code": "92", "phase_kc": "Post Harvest", "mois": ["Nov", "Dec"]},
        ]
    }

    output = detect_phenology(
        step1,
        step2,
        reference_data=reference_data,
        crop_type="olivier",
        planting_system="intensif",
    )

    assert set(output.inter_annual_variability_days.keys()) == {
        "dormancy",
        "bud_break",
        "flowering",
        "fruit_fill",
        "post_harvest",
    }
    assert set(output.gdd_correlation.keys()) == {
        "dormancy",
        "bud_break",
        "flowering",
        "fruit_fill",
        "post_harvest",
    }
    assert output.phase_timeline is not None
    first_transitions = output.phase_timeline[0]["transitions"]
    assert {item["phase"] for item in first_transitions} == {
        "dormancy",
        "bud_break",
        "flowering",
        "fruit_fill",
        "post_harvest",
    }


def test_step4_phase_timeline_matches_frontend_contract() -> None:
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "phase_kc": "Dormancy", "mois": ["Dec", "Jan"]},
            {"code": "53", "phase_kc": "Bud Break", "mois": ["Mar", "Apr"]},
            {"code": "65", "phase_kc": "Flowering", "mois": ["May", "Jun"]},
            {"code": "92", "phase_kc": "Post Harvest", "mois": ["Nov", "Dec"]},
        ]
    }

    output = detect_phenology(
        step1,
        step2,
        reference_data=reference_data,
        crop_type="olivier",
        planting_system="intensif",
    )

    assert output.phase_timeline is not None
    assert len(output.phase_timeline) > 0

    first = output.phase_timeline[0]
    assert isinstance(first.get("year"), int)
    assert isinstance(first.get("transitions"), list)
    assert first.get("mode") in {"NORMAL", "AMORCAGE"}

    transitions = first["transitions"]
    assert len(transitions) > 0
    first_transition = transitions[0]
    assert "phase" in first_transition
    assert "start_date" in first_transition
    assert "end_date" in first_transition
    assert "gdd_at_entry" in first_transition
    assert "confidence" in first_transition


def test_step4_referential_timeline_gdd_varies_across_phases() -> None:
    step1 = _build_step1_for_three_years()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "phase_kc": "Dormancy", "mois": ["Dec", "Jan"]},
            {"code": "53", "phase_kc": "Bud Break", "mois": ["Mar", "Apr"]},
            {"code": "65", "phase_kc": "Flowering", "mois": ["May", "Jun"]},
            {"code": "75", "phase_kc": "Fruit Fill", "mois": ["Jul", "Aug"]},
            {"code": "92", "phase_kc": "Post Harvest", "mois": ["Nov", "Dec"]},
        ]
    }

    output = detect_phenology(step1, step2, reference_data=reference_data)

    assert output.phase_timeline is not None
    transitions = output.phase_timeline[0]["transitions"]
    gdd_values = [float(item["gdd_at_entry"]) for item in transitions]
    # Stages mapped to distinct month windows should not all share one entry GDD value.
    assert len(set(gdd_values)) >= 3
