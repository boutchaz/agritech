"""Shared helpers for parsing crop referential data (stades_bbch, systemes, seuils_satellite)."""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any

from .types import MaturityPhase

# Crop type (API / calibration_input) → referentials/DATA_*.json
CROP_TYPE_TO_REFERENTIAL_JSON: dict[str, str] = {
    "olivier": "DATA_OLIVIER.json",
    "agrumes": "DATA_AGRUMES.json",
    "avocatier": "DATA_AVOCATIER.json",
    "palmier_dattier": "DATA_PALMIER_DATTIER.json",
}

# Used when referential file is missing or gdd block incomplete (e.g. minimal deploy).
FALLBACK_GDD_TBASE: dict[str, float] = {
    "olivier": 7.5,
    "agrumes": 13.0,
    "avocatier": 10.0,
    "palmier_dattier": 18.0,
}

FALLBACK_GDD_TUPPER: dict[str, float] = {
    "olivier": 30.0,
    "agrumes": 36.0,
    "avocatier": 33.0,
    "palmier_dattier": 45.0,
}

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

# English abbreviations used in some referential JSON (e.g. Feb, Jun).
_EXTRA_MONTH_CODES: dict[str, int] = {
    "feb": 2,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
}


def french_month_to_num(code: str) -> int:
    """Convert referential month code (FR or EN) to 1-12. Case-insensitive."""
    normalized = code.strip().lower() if isinstance(code, str) else ""
    if normalized in FRENCH_MONTH_TO_NUM:
        return FRENCH_MONTH_TO_NUM[normalized]
    if normalized in _EXTRA_MONTH_CODES:
        return _EXTRA_MONTH_CODES[normalized]
    return 1


def _months_from_stade_mois(mois: Any) -> set[int]:
    if isinstance(mois, list):
        return {french_month_to_num(str(m)) for m in mois if m is not None}
    if isinstance(mois, str):
        return {french_month_to_num(mois)}
    return set()


def _normalize_bbch_code(code: Any) -> str | None:
    if isinstance(code, int):
        return f"{code:02d}"
    if isinstance(code, str):
        s = code.strip()
        if s.isdigit():
            return f"{int(s):02d}"
        return s
    return None


def _parse_stage_gdd_interval(stage: dict[str, Any]) -> tuple[float, float] | None:
    raw = stage.get("gdd_cumul")
    if isinstance(raw, (int, float)):
        x = float(raw)
        return (x, x)
    if (
        isinstance(raw, list)
        and len(raw) == 2
        and all(isinstance(v, (int, float)) for v in raw)
    ):
        return (float(raw[0]), float(raw[1]))
    return None


@dataclass(frozen=True)
class OliveStadesBbchGddContext:
    """Olive GDD precompute driven by ``stades_bbch`` (see :func:`parse_olive_stades_bbch_gdd_context`)."""

    baseline_months: frozenset[int]
    allowed_gdd_months: frozenset[int]
    month_max_gdd: dict[int, float]


@dataclass(frozen=True)
class WeatherThresholdConfig:
    frost_threshold_c: float
    heatwave_threshold_c: float
    drought_days_dry_season: int
    drought_days_transition: int
    drought_days_rainy_season: int
    hot_wind_kmh: float


def parse_olive_stades_bbch_gdd_context(
    reference_data: dict[str, Any] | None,
) -> OliveStadesBbchGddContext | None:
    """Build BBCH-driven rules from ``reference_data['stades_bbch']`` (list order preserved).

    - **baseline_months**: months of stage code ``00`` (dormancy) for NIRv baseline (+20 % gate).
    - **allowed_gdd_months**: union of all stage ``mois`` — thermal GDD only accrues on these months.
    - **month_max_gdd**: per calendar month, maximum ``gdd_cumul`` upper bound among stages that
      include that month — accrual is blocked if season cumulative would exceed that cap (soft
      alignment with referential BBCH ceilings; no lower bound so early-season carry-over works).

    Returns ``None`` if ``stades_bbch`` is missing or empty (legacy behaviour).
    """
    if not reference_data:
        return None
    stades = reference_data.get("stades_bbch")
    if not isinstance(stades, list) or len(stades) == 0:
        return None

    baseline_months: set[int] = set()
    allowed: set[int] = set()
    bands_by_month: dict[int, list[tuple[float, float]]] = {}

    for stage in stades:
        if not isinstance(stage, dict):
            continue
        code = _normalize_bbch_code(stage.get("code"))
        months = _months_from_stade_mois(stage.get("mois"))
        if not months:
            continue
        allowed |= months
        if code == "00":
            baseline_months |= months
        interval = _parse_stage_gdd_interval(stage)
        if interval is None:
            continue
        lo, hi = interval
        for m in months:
            bands_by_month.setdefault(m, []).append((lo, hi))

    if not allowed:
        return None

    if not baseline_months:
        baseline_months = {12, 1}

    month_max_gdd: dict[int, float] = {}
    for m, bands in bands_by_month.items():
        if bands:
            month_max_gdd[m] = max(b[1] for b in bands)

    return OliveStadesBbchGddContext(
        baseline_months=frozenset(baseline_months),
        allowed_gdd_months=frozenset(allowed),
        month_max_gdd=month_max_gdd,
    )


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


def _referentials_dir() -> Path | None:
    """Directory containing DATA_*.json. Override with AGRITECH_REFERENTIALS_DIR."""
    env = os.environ.get("AGRITECH_REFERENTIALS_DIR", "").strip()
    if env:
        p = Path(env).expanduser()
        return p if p.is_dir() else None
    # agritech-api/referentials/ from backend-service/app/services/calibration/
    here = Path(__file__).resolve()
    candidate = here.parents[4] / "agritech-api" / "referentials"
    return candidate if candidate.is_dir() else None


@lru_cache(maxsize=8)
def _load_referential_data_from_file(crop_type: str) -> dict[str, Any] | None:
    filename = CROP_TYPE_TO_REFERENTIAL_JSON.get(crop_type)
    if not filename:
        return None
    root = _referentials_dir()
    if root is None:
        return None
    path = root / filename
    if not path.is_file():
        return None
    try:
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _parse_gdd_block(gdd: Any) -> tuple[float | None, float | None]:
    """Read tbase_c and plafond_c from referential ``gdd`` object."""
    if not isinstance(gdd, dict):
        return None, None
    tbase: float | None = None
    tupper: float | None = None
    raw_base = gdd.get("tbase_c")
    raw_cap = gdd.get("plafond_c")
    if isinstance(raw_base, (int, float)):
        tbase = float(raw_base)
    if isinstance(raw_cap, (int, float)):
        tupper = float(raw_cap)
    return tbase, tupper


@lru_cache(maxsize=8)
def _load_gdd_from_referential_file(crop_type: str) -> tuple[float | None, float | None]:
    """Load ``gdd.tbase_c`` / ``gdd.plafond_c`` from referentials JSON on disk."""
    data = _load_referential_data_from_file(crop_type)
    if not data:
        return None, None
    return _parse_gdd_block(data.get("gdd"))


def get_gdd_tbase_tupper(
    crop_type: str,
    reference_data: dict[str, Any] | None = None,
) -> tuple[float | None, float | None]:
    """Resolve GDD base and upper temperature caps for a supported crop.

    Priority: embedded ``reference_data["gdd"]`` → referential JSON on disk →
    :data:`FALLBACK_GDD_TBASE` / :data:`FALLBACK_GDD_TUPPER`.

    Returns ``(None, None)`` when *crop_type* is not one of the four referential
    crops (caller should use generic defaults, e.g. tbase 10°C).
    """
    if crop_type not in CROP_TYPE_TO_REFERENTIAL_JSON:
        return None, None

    tbase: float | None = None
    tupper: float | None = None

    if reference_data is not None:
        tb, tu = _parse_gdd_block(reference_data.get("gdd"))
        if tb is not None:
            tbase = tb
            tupper = tu if tu is not None else FALLBACK_GDD_TUPPER.get(crop_type)

    if tbase is None:
        tb, tu = _load_gdd_from_referential_file(crop_type)
        if tb is not None:
            tbase = tb
            if tu is not None:
                tupper = tu
            elif tupper is None:
                tupper = FALLBACK_GDD_TUPPER.get(crop_type)
        else:
            tbase = FALLBACK_GDD_TBASE.get(crop_type)
            tupper = FALLBACK_GDD_TUPPER.get(crop_type)
    elif tupper is None:
        tupper = FALLBACK_GDD_TUPPER.get(crop_type)

    return tbase, tupper


def clear_gdd_referential_cache() -> None:
    """Clear LRU cache (for tests that swap referential files)."""
    _load_referential_data_from_file.cache_clear()
    _load_gdd_from_referential_file.cache_clear()


_DEFAULT_WEATHER_THRESHOLDS: dict[str, WeatherThresholdConfig] = {
    "olivier": WeatherThresholdConfig(
        frost_threshold_c=-2.0,
        heatwave_threshold_c=38.0,
        drought_days_dry_season=60,
        drought_days_transition=30,
        drought_days_rainy_season=20,
        hot_wind_kmh=60.0,
    ),
    "agrumes": WeatherThresholdConfig(
        frost_threshold_c=0.0,
        heatwave_threshold_c=40.0,
        drought_days_dry_season=60,
        drought_days_transition=30,
        drought_days_rainy_season=20,
        hot_wind_kmh=30.0,
    ),
    "avocatier": WeatherThresholdConfig(
        frost_threshold_c=0.0,
        heatwave_threshold_c=35.0,
        drought_days_dry_season=60,
        drought_days_transition=30,
        drought_days_rainy_season=20,
        hot_wind_kmh=25.0,
    ),
    "palmier_dattier": WeatherThresholdConfig(
        frost_threshold_c=-5.0,
        heatwave_threshold_c=45.0,
        drought_days_dry_season=90,
        drought_days_transition=45,
        drought_days_rainy_season=45,
        hot_wind_kmh=60.0,
    ),
}


def _as_float(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _upper_bound(value: Any) -> float | None:
    if isinstance(value, (list, tuple)) and value:
        numeric = [float(v) for v in value if isinstance(v, (int, float))]
        if numeric:
            return max(numeric)
    return _as_float(value)


def _extract_heat_from_alerts(alerts: Any) -> float | None:
    if not isinstance(alerts, list):
        return None
    candidates: list[float] = []
    for alert in alerts:
        if not isinstance(alert, dict):
            continue
        seuil = str(alert.get("seuil", ""))
        if "Tmax" not in seuil:
            continue
        matches = re.findall(r"Tmax\s*>\s*(-?\d+(?:\.\d+)?)", seuil)
        for raw in matches:
            try:
                candidates.append(float(raw))
            except ValueError:
                continue
    return min(candidates) if candidates else None


def _extract_frost_from_alerts(alerts: Any) -> float | None:
    if not isinstance(alerts, list):
        return None
    candidates: list[float] = []
    for alert in alerts:
        if not isinstance(alert, dict):
            continue
        seuil = str(alert.get("seuil", ""))
        if "Tmin" not in seuil:
            continue
        matches = re.findall(r"Tmin(?:\s*(?:prévue|mesurée))?\s*<\s*(-?\d+(?:\.\d+)?)", seuil)
        for raw in matches:
            try:
                candidates.append(float(raw))
            except ValueError:
                continue
    return max(candidates) if candidates else None


def _extract_hot_wind_from_alerts(alerts: Any) -> float | None:
    if not isinstance(alerts, list):
        return None
    candidates: list[float] = []
    for alert in alerts:
        if not isinstance(alert, dict):
            continue
        seuil = str(alert.get("seuil", ""))
        matches = re.findall(r"vent\s*>\s*(-?\d+(?:\.\d+)?)", seuil, flags=re.IGNORECASE)
        for raw in matches:
            try:
                candidates.append(float(raw))
            except ValueError:
                continue
    return min(candidates) if candidates else None


def get_weather_thresholds(
    crop_type: str,
    reference_data: dict[str, Any] | None = None,
) -> WeatherThresholdConfig:
    data = (
        reference_data
        if isinstance(reference_data, dict) and reference_data
        else _load_referential_data_from_file(crop_type)
    )
    defaults = _DEFAULT_WEATHER_THRESHOLDS.get(
        crop_type,
        WeatherThresholdConfig(
            frost_threshold_c=0.0,
            heatwave_threshold_c=38.0,
            drought_days_dry_season=60,
            drought_days_transition=30,
            drought_days_rainy_season=20,
            hot_wind_kmh=60.0,
        ),
    )
    if not isinstance(data, dict):
        return defaults

    climate = data.get("exigences_climatiques")
    frost_threshold = defaults.frost_threshold_c
    heat_threshold = defaults.heatwave_threshold_c
    hot_wind_kmh = defaults.hot_wind_kmh

    if isinstance(climate, dict):
        explicit_heat = (
            _as_float(climate.get("temperature_stress_chaleur_C"))
            or _as_float(climate.get("temperature_max_toleree_C"))
        )
        if explicit_heat is not None:
            heat_threshold = explicit_heat

        explicit_frost = (
            _upper_bound(climate.get("gel_feuilles_hass_C"))
            or _upper_bound(climate.get("gel_palmes_C"))
            or _as_float(climate.get("temperature_stress_froid_C"))
        )
        if explicit_frost is not None and explicit_frost <= 2.0:
            frost_threshold = explicit_frost

    alerts = data.get("alertes")
    alert_frost = _extract_frost_from_alerts(alerts)
    if alert_frost is not None:
        frost_threshold = alert_frost

    alert_heat = _extract_heat_from_alerts(alerts)
    if alert_heat is not None:
        heat_threshold = alert_heat

    alert_hot_wind = _extract_hot_wind_from_alerts(alerts)
    if alert_hot_wind is not None:
        hot_wind_kmh = alert_hot_wind

    return WeatherThresholdConfig(
        frost_threshold_c=frost_threshold,
        heatwave_threshold_c=heat_threshold,
        drought_days_dry_season=defaults.drought_days_dry_season,
        drought_days_transition=defaults.drought_days_transition,
        drought_days_rainy_season=defaults.drought_days_rainy_season,
        hot_wind_kmh=hot_wind_kmh,
    )


# --- Maturity phase age spans (half-open: age in [start, end) years) -----------------

DEFAULT_MATURITY_PHASE_BOUNDARIES: dict[MaturityPhase, tuple[int, int]] = {
    MaturityPhase.JUVENILE: (0, 5),
    MaturityPhase.ENTREE_PRODUCTION: (5, 10),
    MaturityPhase.PLEINE_PRODUCTION: (10, 40),
    MaturityPhase.MATURITE_AVANCEE: (40, 60),
    MaturityPhase.SENESCENCE: (60, 200),
}

_MATURITY_PHASE_BY_YIELD_KEY: dict[str, MaturityPhase] = {
    MaturityPhase.JUVENILE.value: MaturityPhase.JUVENILE,
    MaturityPhase.ENTREE_PRODUCTION.value: MaturityPhase.ENTREE_PRODUCTION,
    MaturityPhase.PLEINE_PRODUCTION.value: MaturityPhase.PLEINE_PRODUCTION,
    MaturityPhase.MATURITE_AVANCEE.value: MaturityPhase.MATURITE_AVANCEE,
    MaturityPhase.SENESCENCE.value: MaturityPhase.SENESCENCE,
}


def get_phase_boundaries_from_reference(
    reference_data: dict[str, Any],
) -> dict[MaturityPhase, tuple[int, int]]:
    """Load ``phases_maturite_ans`` from referential; merge with defaults for missing phases."""
    out: dict[MaturityPhase, tuple[int, int]] = dict(DEFAULT_MATURITY_PHASE_BOUNDARIES)
    raw = reference_data.get("phases_maturite_ans")
    if not isinstance(raw, dict):
        return out
    for key, val in raw.items():
        phase = _MATURITY_PHASE_BY_YIELD_KEY.get(str(key).strip())
        if phase is None:
            continue
        if isinstance(val, (list, tuple)) and len(val) >= 2:
            start = int(val[0])
            end = int(val[1])
            out[phase] = (start, end)
    return out


def parse_legacy_rendement_key_to_half_open(key: str) -> tuple[int, int] | None:
    """Map legacy ``rendement_kg_arbre`` keys to half-open age span [lo, hi)."""

    range_match = re.match(r"^(\d+)-(\d+)_ans$", key)
    if range_match:
        lo, hi_inclusive = int(range_match.group(1)), int(range_match.group(2))
        return lo, hi_inclusive + 1

    ans_match = re.match(r"^ans_(\d+)_(\d+)$", key)
    if ans_match:
        lo, hi_inclusive = int(ans_match.group(1)), int(ans_match.group(2))
        return lo, hi_inclusive + 1

    plus_match = re.match(r"^plus_(\d+)_ans$", key)
    if plus_match:
        return int(plus_match.group(1)), 200

    ans_plus_match = re.match(r"^ans_(\d+)_plus$", key)
    if ans_plus_match:
        return int(ans_plus_match.group(1)), 200

    return None


def span_for_rendement_key(
    key: str,
    boundaries: dict[MaturityPhase, tuple[int, int]],
) -> tuple[int, int] | None:
    """Age span for a ``rendement_kg_arbre`` key (phase name or legacy pattern)."""
    stripped = key.strip()
    phase = _MATURITY_PHASE_BY_YIELD_KEY.get(stripped)
    if phase is not None:
        return boundaries.get(phase)
    return parse_legacy_rendement_key_to_half_open(stripped)


def iter_yield_curve_age_brackets(
    yield_by_age: dict[str, Any],
    boundaries: dict[MaturityPhase, tuple[int, int]],
) -> list[tuple[int, int, Any]]:
    """(start, end, value) per yield key, sorted by start (half-open spans)."""
    rows: list[tuple[int, int, Any]] = []
    for key, value in yield_by_age.items():
        span = span_for_rendement_key(str(key), boundaries)
        if span is None:
            continue
        lo, hi = span
        rows.append((lo, hi, value))
    return sorted(rows, key=lambda item: (item[0], item[1]))
