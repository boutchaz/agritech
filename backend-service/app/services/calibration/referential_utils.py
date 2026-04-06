"""Shared helpers for parsing crop referential data (stades_bbch, systemes, seuils_satellite)."""

from __future__ import annotations

from typing import Any

# Default phenology period months when no referential stades_bbch is available.
# Used by both step3 (percentile calculation) and step4 (phenology detection).
DEFAULT_PERIODS: dict[str, set[int]] = {
    "dormancy": {12, 1, 2},
    "growth": {3, 4, 5},
    "flowering": {6, 7},
    "maturation": {8, 9, 10, 11},
}

# French month codes in referential (Dec, Jan, Fev, ...) -> month number 1-12
FRENCH_MONTH_TO_NUM: dict[str, int] = {
    "jan": 1,
    "fev": 2,
    "mars": 3,
    "mar": 3,
    "avr": 4,
    "mai": 5,
    "juin": 6,
    "juil": 7,
    "aout": 8,
    "sept": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def french_month_to_num(code: str) -> int:
    """Convert referential French month code to 1-12. Case-insensitive."""
    normalized = code.strip().lower() if isinstance(code, str) else ""
    return FRENCH_MONTH_TO_NUM.get(normalized, 1)


def get_cycle_months_from_stades_bbch(
    reference_data: dict[str, Any],
) -> tuple[int, int] | None:
    """
    Derive biological cycle (start_month, end_month) from stades_bbch.
    Olive: dormancy (00) Dec-Jan, post-récolte (92) Nov-Dec -> cycle Dec-Dec.
    Convention: start_month=12 (Dec), end_month=11 (Nov) so "cycle year Y" = Dec(Y-1)..Nov(Y).
    Returns (start_month, end_month) inclusive, or None if stades_bbch missing/invalid.
    """
    stades = reference_data.get("stades_bbch")
    if not isinstance(stades, list) or len(stades) < 2:
        return None

    all_months: list[int] = []
    for stage in stades:
        if not isinstance(stage, dict):
            continue
        mois = stage.get("mois")
        if isinstance(mois, list):
            for m in mois:
                all_months.append(french_month_to_num(str(m)))
        elif isinstance(mois, str):
            all_months.append(french_month_to_num(mois))

    if not all_months:
        return None

    # Biological cycle: first stage typically dormancy (Dec), last stage post-récolte (Nov/Dec).
    # Use first and last stage's first/last month to get span.
    if not all_months:
        return None

    first_stage = stades[0]
    last_stage = stades[-1]
    if not isinstance(first_stage, dict) or not isinstance(last_stage, dict):
        return None

    first_mois = first_stage.get("mois")
    last_mois = last_stage.get("mois")

    if isinstance(first_mois, list) and first_mois:
        start_month = french_month_to_num(str(first_mois[0]))
    elif isinstance(first_mois, str):
        start_month = french_month_to_num(first_mois)
    else:
        start_month = min(all_months)

    # End of cycle: use first month of last stage so cycle ends before next dormancy (e.g. Nov not Dec)
    if isinstance(last_mois, list) and last_mois:
        end_month = french_month_to_num(str(last_mois[0]))
    elif isinstance(last_mois, str):
        end_month = french_month_to_num(last_mois)
    else:
        end_month = max(all_months)

    return (start_month, end_month)


def get_index_key_from_referential(
    reference_data: dict[str, Any],
    planting_system: str | None,
) -> str | None:
    """
    Resolve systemes[planting_system].indice_cle (e.g. NIRv, NDVI, MSAVI).
    Returns None if not found; caller should use default (e.g. NIRv).
    """
    if not planting_system or not reference_data:
        return None
    systemes = reference_data.get("systemes")
    if not isinstance(systemes, dict):
        return None
    system = systemes.get(planting_system.strip().lower())
    if not isinstance(system, dict):
        return None
    indice = system.get("indice_cle")
    if isinstance(indice, str) and indice.strip():
        return indice.strip()
    return None


def get_satellite_thresholds_from_referential(
    reference_data: dict[str, Any],
    planting_system: str | None,
    index_key: str,
) -> dict[str, Any] | None:
    """
    Get seuils_satellite[system][index] -> optimal, vigilance, alerte.
    Returns dict with keys optimal (list or tuple), vigilance (float), alerte (float), or None.
    """
    if not planting_system or not reference_data:
        return None
    seuils = reference_data.get("seuils_satellite")
    if not isinstance(seuils, dict):
        return None
    system_seuils = seuils.get(planting_system.strip().lower())
    if not isinstance(system_seuils, dict):
        return None
    index_seuils = system_seuils.get(index_key)
    if not isinstance(index_seuils, dict):
        return None
    optimal = index_seuils.get("optimal")
    vigilance = index_seuils.get("vigilance")
    alerte = index_seuils.get("alerte")
    result: dict[str, Any] = {}
    if optimal is not None:
        result["optimal"] = (
            list(optimal) if isinstance(optimal, (list, tuple)) else optimal
        )
    if vigilance is not None and isinstance(vigilance, (int, float)):
        result["vigilance"] = float(vigilance)
    if alerte is not None and isinstance(alerte, (int, float)):
        result["alerte"] = float(alerte)
    return result if result else None


def cycle_year_for_date(d: Any, start_month: int, end_month: int) -> int:
    """
    Assign a date to a cycle year. Cycle Y = start_month (Y-1) .. end_month (Y).
    E.g. start_month=12, end_month=11: Jan 2024 -> 2024, Dec 2024 -> 2025.
    """
    try:
        month = d.month
        year = d.year
    except AttributeError:
        return getattr(d, "year", 0)
    if start_month > end_month:
        if month >= start_month:
            return year + 1
        if month <= end_month:
            return year
        return year
    if month >= start_month and month <= end_month:
        return year
    if month >= start_month:
        return year + 1
    return year


def filter_points_to_cycle(
    points: list[tuple[Any, float]],
    start_month: int,
    end_month: int,
    date_accessor: Any = None,
) -> list[tuple[Any, float]]:
    """
    Filter (date, value) points to those inside the cycle window.
    Cycle: start_month through end_month (inclusive). If start_month > end_month (e.g. 12 and 11),
    the cycle spans two calendar years (Dec to Nov).
    date_accessor: if provided, call on first element to get date; else assume element[0] is the date.
    """
    filtered: list[tuple[Any, float]] = []
    for item in points:
        dt = item[0] if date_accessor is None else date_accessor(item[0])
        try:
            month = dt.month
        except AttributeError:
            continue
        if start_month > end_month:
            if month >= start_month or month <= end_month:
                filtered.append(item)
        else:
            if start_month <= month <= end_month:
                filtered.append(item)
    return filtered


def get_phenology_periods_from_stades_bbch(
    reference_data: dict[str, Any],
) -> dict[str, set[int]] | None:
    """
    Derive phenology_periods (period_name -> set of month numbers) from stades_bbch.
    Groups stages into dormancy, growth, flowering, maturation by BBCH code ranges:
    - dormancy: 00-09 (Dec, Jan, Fev)
    - growth: 10-59 (Mar, Avr, Mai early)
    - flowering: 60-69 (Mai, Juin)
    - maturation: 70-92 (Juil to Dec)
    Returns None if stades_bbch missing.
    """
    stades = reference_data.get("stades_bbch")
    if not isinstance(stades, list):
        return None

    dormancy_months: set[int] = set()
    growth_months: set[int] = set()
    flowering_months: set[int] = set()
    maturation_months: set[int] = set()

    for stage in stades:
        if not isinstance(stage, dict):
            continue
        code_str = stage.get("code")
        if not isinstance(code_str, str):
            continue
        try:
            code = int(code_str)
        except ValueError:
            continue
        mois = stage.get("mois")
        months: list[int] = []
        if isinstance(mois, list):
            months = [french_month_to_num(str(m)) for m in mois]
        elif isinstance(mois, str):
            months = [french_month_to_num(mois)]
        if not months:
            continue
        if code == 0:
            dormancy_months.update(months)
        elif code <= 59:
            growth_months.update(months)
        elif code <= 69:
            flowering_months.update(months)
        else:
            maturation_months.update(months)

    if (
        not dormancy_months
        and not growth_months
        and not flowering_months
        and not maturation_months
    ):
        return None

    result: dict[str, set[int]] = {}
    if dormancy_months:
        result["dormancy"] = dormancy_months
    if growth_months:
        result["growth"] = growth_months
    if flowering_months:
        result["flowering"] = flowering_months
    if maturation_months:
        result["maturation"] = maturation_months
    return result if result else None


def group_points_by_cycle_year(
    points: list[tuple[Any, float]],
    start_month: int,
    end_month: int,
) -> dict[int, list[tuple[Any, float]]]:
    """
    Group (date, value) points by cycle year. Each point is assigned to the cycle year
    that contains it (cycle Y = start_month (Y-1) .. end_month (Y)).
    """
    from collections import defaultdict

    grouped: dict[int, list[tuple[Any, float]]] = defaultdict(list)
    for item in points:
        dt = item[0]
        try:
            cy = cycle_year_for_date(dt, start_month, end_month)
        except Exception:
            continue
        grouped[cy].append(item)
    return dict(grouped)


def get_stages_gdd_ranges_from_stades_bbch(
    reference_data: dict[str, Any],
) -> dict[str, tuple[float, float]]:
    """Extract GDD ranges from stades_bbch[].gdd_cumul per BBCH stage code.

    Returns { "00": (0, 30), "65": (900, 1000), ... } mapping stage code
    to (gdd_min, gdd_max).  Missing or unparseable entries are skipped.
    """
    stades = reference_data.get("stades_bbch")
    if not isinstance(stades, list):
        return {}

    ranges: dict[str, tuple[float, float]] = {}
    for stage in stades:
        if not isinstance(stage, dict):
            continue
        code = stage.get("code")
        if not isinstance(code, str):
            continue
        gdd_cumul = stage.get("gdd_cumul")
        if gdd_cumul is None:
            continue
        if isinstance(gdd_cumul, (int, float)):
            ranges[code] = (float(gdd_cumul), float(gdd_cumul))
        elif (
            isinstance(gdd_cumul, list)
            and len(gdd_cumul) == 2
            and all(isinstance(v, (int, float)) for v in gdd_cumul)
        ):
            ranges[code] = (float(gdd_cumul[0]), float(gdd_cumul[1]))
    return ranges
