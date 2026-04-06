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


def _build_moroccan_olive_bimodal_curve() -> object:
    """Realistic Moroccan olive NIRv curve with summer stress dip.

    In Morocco, olive NDVI/NIRv peaks in spring (May), dips in summer
    (Aug) due to heat/water stress, then partially recovers in autumn
    before entering winter dormancy.  The summer minimum can be LOWER
    than the winter dormancy baseline.
    """
    index_points = {"NIRv": [], "NDVI": []}
    monthly_values = {
        1: 0.25,
        2: 0.28,
        3: 0.35,
        4: 0.48,
        5: 0.55,
        6: 0.52,
        7: 0.42,
        8: 0.33,
        9: 0.38,
        10: 0.34,
        11: 0.28,
        12: 0.24,
    }
    for year in [2023, 2024]:
        for month in range(1, 13):
            val = monthly_values[month]
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


def test_step4_bimodal_curve_dormancy_exit_before_peak() -> None:
    step1 = _build_moroccan_olive_bimodal_curve()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "09", "nom": "Feuilles emergentes", "mois": ["Feb", "Mar"]},
            {"code": "60", "nom": "Floraison", "mois": ["May"]},
            {"code": "79", "nom": "Fruit taille finale", "mois": ["Aug", "Sep"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
    }
    output = detect_phenology(
        step1, step2, reference_data=reference_data, crop_type="olivier"
    )

    assert output.mean_dates.dormancy_exit < output.mean_dates.peak
    assert output.mean_dates.plateau_start <= output.mean_dates.peak
    assert output.mean_dates.peak < output.mean_dates.decline_start
    assert output.mean_dates.decline_start < output.mean_dates.dormancy_entry


def test_step4_bimodal_curve_dormancy_exit_in_early_spring() -> None:
    step1 = _build_moroccan_olive_bimodal_curve()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
    }
    output = detect_phenology(
        step1, step2, reference_data=reference_data, crop_type="olivier"
    )

    assert output.mean_dates.dormancy_exit.month in (2, 3, 4)


def test_step4_bimodal_curve_peak_in_spring() -> None:
    step1 = _build_moroccan_olive_bimodal_curve()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
    }
    output = detect_phenology(
        step1, step2, reference_data=reference_data, crop_type="olivier"
    )

    assert output.mean_dates.peak.month in (4, 5, 6)


def test_step4_bimodal_curve_dormancy_entry_in_autumn() -> None:
    step1 = _build_moroccan_olive_bimodal_curve()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
    }
    output = detect_phenology(
        step1, step2, reference_data=reference_data, crop_type="olivier"
    )

    assert output.mean_dates.dormancy_entry.month in (10, 11, 12)


def test_step4_bimodal_curve_plateau_before_peak() -> None:
    step1 = _build_moroccan_olive_bimodal_curve()
    step2 = _build_step2_weather()
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ],
    }
    output = detect_phenology(
        step1, step2, reference_data=reference_data, crop_type="olivier"
    )

    assert output.mean_dates.plateau_start <= output.mean_dates.peak


def test_step4_sparse_data_skips_year() -> None:
    index_points = {"NIRv": []}
    for month in [1, 6, 12]:
        index_points["NIRv"].append(
            {
                "date": date(2024, month, 15).isoformat(),
                "value": 0.4,
                "outlier": False,
                "interpolated": False,
            }
        )

    step1 = Step1Output.model_validate(
        {
            "index_time_series": index_points,
            "cloud_coverage_mean": 10,
            "filtered_image_count": 0,
            "outlier_count": 0,
            "interpolated_dates": [],
            "raster_paths": {"NIRv": []},
        }
    )
    step2 = _build_step2_weather()

    output = detect_phenology(step1, step2)
    today = date.today()
    assert output.mean_dates.dormancy_exit == today
    assert output.mean_dates.peak == today
