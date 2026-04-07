"""Tests for referential_utils (French months, cycle, index key, thresholds, phenology periods)."""

from datetime import date

import pytest

from app.services.calibration.referential_utils import (
    clear_gdd_referential_cache,
    cycle_year_for_date,
    filter_points_to_cycle,
    french_month_to_num,
    get_cycle_months_from_stades_bbch,
    get_gdd_tbase_tupper,
    get_index_key_from_referential,
    get_phase_boundaries_from_reference,
    get_phenology_periods_from_stades_bbch,
    get_satellite_thresholds_from_referential,
    group_points_by_cycle_year,
    parse_legacy_rendement_key_to_half_open,
    parse_olive_stades_bbch_gdd_context,
    span_for_rendement_key,
)
from app.services.calibration.types import MaturityPhase


def test_french_month_to_num() -> None:
    assert french_month_to_num("Dec") == 12
    assert french_month_to_num("Jan") == 1
    assert french_month_to_num("Feb") == 2
    assert french_month_to_num("Jun") == 6
    assert french_month_to_num("Fev") == 2
    assert french_month_to_num("Mar") == 3
    assert french_month_to_num("Avr") == 4
    assert french_month_to_num("Mai") == 5
    assert french_month_to_num("Juin") == 6
    assert french_month_to_num("Juil") == 7
    assert french_month_to_num("Aout") == 8
    assert french_month_to_num("Sept") == 9
    assert french_month_to_num("Oct") == 10
    assert french_month_to_num("Nov") == 11
    assert french_month_to_num("dec") == 12
    assert french_month_to_num("  Mai  ") == 5
    assert french_month_to_num("unknown") == 1


def test_get_cycle_months_from_stades_bbch_olive() -> None:
    reference_data = {
        "stades_bbch": [
            {"code": "00", "nom": "Dormance", "mois": ["Dec", "Jan"]},
            {"code": "92", "nom": "Post-récolte", "mois": ["Nov", "Dec"]},
        ]
    }
    result = get_cycle_months_from_stades_bbch(reference_data)
    assert result is not None
    start, end = result
    assert start == 12
    assert end == 11


def test_get_cycle_months_from_stades_bbch_missing_returns_none() -> None:
    assert get_cycle_months_from_stades_bbch({}) is None
    assert get_cycle_months_from_stades_bbch({"stades_bbch": []}) is None
    # Single stage with no mois yields no all_months -> None
    assert get_cycle_months_from_stades_bbch({"stades_bbch": [{"code": "00"}]}) is None


def test_get_index_key_from_referential() -> None:
    reference_data = {
        "systemes": {
            "intensif": {"indice_cle": "NIRv"},
            "traditionnel": {"indice_cle": "NDVI"},
        }
    }
    assert get_index_key_from_referential(reference_data, "intensif") == "NIRv"
    assert get_index_key_from_referential(reference_data, "traditionnel") == "NDVI"
    assert get_index_key_from_referential(reference_data, "super_intensif") is None
    assert get_index_key_from_referential({}, "intensif") is None
    assert get_index_key_from_referential(reference_data, None) is None


def test_get_satellite_thresholds_from_referential() -> None:
    reference_data = {
        "seuils_satellite": {
            "intensif": {
                "NIRv": {"optimal": [0.08, 0.22], "vigilance": 0.07, "alerte": 0.06},
            }
        }
    }
    result = get_satellite_thresholds_from_referential(
        reference_data, "intensif", "NIRv"
    )
    assert result is not None
    assert result["vigilance"] == 0.07
    assert result["alerte"] == 0.06
    assert result["optimal"] == [0.08, 0.22]
    assert get_satellite_thresholds_from_referential(reference_data, "intensif", "NDVI") is None


def test_get_phenology_periods_from_stades_bbch() -> None:
    reference_data = {
        "stades_bbch": [
            {"code": "00", "mois": ["Dec", "Jan"]},
            {"code": "09", "mois": ["Fev", "Mar"]},
            {"code": "60", "mois": ["Mai"]},
            {"code": "75", "mois": ["Juil"]},
            {"code": "92", "mois": ["Nov", "Dec"]},
        ]
    }
    result = get_phenology_periods_from_stades_bbch(reference_data)
    assert result is not None
    assert "dormancy" in result
    assert "growth" in result
    assert "flowering" in result
    assert "maturation" in result
    assert result["dormancy"] == {12, 1}
    assert 2 in result["growth"] and 3 in result["growth"]
    assert 5 in result["flowering"]
    assert 7 in result["maturation"] and 11 in result["maturation"] and 12 in result["maturation"]


def test_cycle_year_for_date() -> None:
    # start_month=12, end_month=11 -> cycle Y = Dec(Y-1)..Nov(Y)
    assert cycle_year_for_date(date(2024, 1, 15), 12, 11) == 2024
    assert cycle_year_for_date(date(2024, 6, 1), 12, 11) == 2024
    assert cycle_year_for_date(date(2024, 12, 1), 12, 11) == 2025
    assert cycle_year_for_date(date(2023, 12, 15), 12, 11) == 2024


def test_filter_points_to_cycle() -> None:
    points = [
        (date(2024, 1, 10), 0.5),
        (date(2024, 6, 10), 0.8),
        (date(2024, 12, 10), 0.4),
    ]
    # Cycle Dec-Nov: all months 1..12 are in cycle (span)
    filtered = filter_points_to_cycle(points, 12, 11)
    assert len(filtered) == 3
    # Cycle Mar-Oct only
    filtered2 = filter_points_to_cycle(points, 3, 10)
    assert len(filtered2) == 1
    assert filtered2[0][0].month == 6


def test_group_points_by_cycle_year() -> None:
    points = [
        (date(2023, 12, 1), 0.3),
        (date(2024, 1, 1), 0.4),
        (date(2024, 6, 1), 0.9),
        (date(2024, 11, 30), 0.5),
        (date(2024, 12, 1), 0.35),
    ]
    grouped = group_points_by_cycle_year(points, 12, 11)
    assert 2024 in grouped
    assert 2025 in grouped
    assert len(grouped[2024]) == 4  # Dec23, Jan24, Jun24, Nov24
    assert len(grouped[2025]) == 1  # Dec24


def test_get_gdd_tbase_tupper_from_disk_agrumes() -> None:
    clear_gdd_referential_cache()
    tb, tu = get_gdd_tbase_tupper("agrumes", None)
    assert tb == 13.0
    assert tu == 36.0


def test_get_gdd_tbase_tupper_embedded_reference_overrides_file() -> None:
    ref = {"gdd": {"tbase_c": 11.0, "plafond_c": 34.0}}
    tb, tu = get_gdd_tbase_tupper("agrumes", ref)
    assert tb == 11.0
    assert tu == 34.0


def test_get_gdd_tbase_tupper_unknown_crop() -> None:
    assert get_gdd_tbase_tupper("ble", None) == (None, None)


def test_parse_olive_stades_bbch_gdd_context_baseline_and_caps() -> None:
    ref = {
        "stades_bbch": [
            {
                "code": "00",
                "nom": "Dormance",
                "mois": ["Dec", "Jan"],
                "gdd_cumul": [0, 30],
            },
            {
                "code": "09",
                "nom": "Feuilles",
                "mois": ["Mar"],
                "gdd_cumul": [0, 15],
            },
        ],
    }
    ctx = parse_olive_stades_bbch_gdd_context(ref)
    assert ctx is not None
    assert ctx.baseline_months == frozenset({12, 1})
    assert 3 in ctx.allowed_gdd_months
    assert ctx.month_max_gdd[3] == 15


def test_parse_olive_stades_bbch_gdd_context_missing_returns_none() -> None:
    assert parse_olive_stades_bbch_gdd_context({}) is None
    assert parse_olive_stades_bbch_gdd_context({"stades_bbch": []}) is None


def test_get_phase_boundaries_from_reference_defaults() -> None:
    b = get_phase_boundaries_from_reference({})
    assert b[MaturityPhase.JUVENILE] == (0, 5)
    assert b[MaturityPhase.SENESCENCE] == (60, 200)


def test_get_phase_boundaries_from_reference_partial_override() -> None:
    b = get_phase_boundaries_from_reference(
        {
            "phases_maturite_ans": {
                "juvenile": [0, 7],
                "entree_production": [7, 12],
            }
        }
    )
    assert b[MaturityPhase.JUVENILE] == (0, 7)
    assert b[MaturityPhase.ENTREE_PRODUCTION] == (7, 12)
    assert b[MaturityPhase.PLEINE_PRODUCTION] == (10, 40)


def test_parse_legacy_rendement_key_and_phase_span() -> None:
    assert parse_legacy_rendement_key_to_half_open("6-10_ans") == (6, 11)
    assert parse_legacy_rendement_key_to_half_open("ans_3_5") == (3, 6)
    boundaries = get_phase_boundaries_from_reference({})
    assert span_for_rendement_key("pleine_production", boundaries) == (10, 40)
    assert span_for_rendement_key("21-40_ans", boundaries) == (21, 41)
