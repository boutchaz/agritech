"""REGLE_2_X — Signal classification (Section 2, Niveau 2 du protocole).

Determines the spectral signal state at the latest acquisition date.
In olive orchards the satellite signal mixes tree canopy with inter-row
vegetation (weeds, cover crops).  The classification tells downstream
diagnostics whether spectral indices are directly interpretable:

* **SIGNAL_PUR** — dry season, weeds dead.  Absolute thresholds apply.
* **MIXTE_MODERE** — spring/autumn, weed + tree mix.  Use derivatives only.
* **DOMINE_ADVENTICES** — heavy weed cover.  Thermal diagnostics only.

Protocol reference: ``protocole_agent_ia_1.json`` → section_2_niveau_2_classification
"""

from __future__ import annotations

from datetime import timedelta
from statistics import mean, median

from ..types import (
    SignalClassificationOutput,
    Step1Output,
    Step2Output,
)

# Summer months used for baseline NIRv/NDVI ratio computation (REGLE_2_1)
_SUMMER_MONTHS = {7, 8, 9}
# Spring months for peak NDVI baseline
_SPRING_MONTHS = {4, 5, 6}


def _count_cycles(satellite: Step1Output) -> int:
    """Count distinct calendar years with data (proxy for complete cycles)."""
    years: set[int] = set()
    for points in satellite.index_time_series.values():
        for p in points:
            years.add(p.date.year)
    return len(years)


def _compute_baselines(
    satellite: Step1Output,
) -> tuple[float | None, float | None]:
    """REGLE_2_1 — Compute historical baselines from multi-year data.

    Returns (ratio_nirv_ndvi_baseline, ndvi_peak_baseline).
    """
    nirv_points = satellite.index_time_series.get("NIRv", [])
    ndvi_points = satellite.index_time_series.get("NDVI", [])

    if not nirv_points or not ndvi_points:
        return None, None

    # Build date→value lookups (non-outlier only)
    nirv_by_date = {
        p.date: p.value for p in nirv_points if not p.outlier
    }
    ndvi_by_date = {
        p.date: p.value for p in ndvi_points if not p.outlier
    }

    # Ratio NIRv/NDVI for July-September (REGLE_2_1.Ratio_NIRv_NDVI_ete)
    summer_ratios: list[float] = []
    for d, nirv_val in nirv_by_date.items():
        if d.month not in _SUMMER_MONTHS:
            continue
        ndvi_val = ndvi_by_date.get(d)
        if ndvi_val is not None and ndvi_val > 0.01:
            summer_ratios.append(nirv_val / ndvi_val)

    ratio_baseline = median(summer_ratios) if len(summer_ratios) >= 3 else None

    # NDVI peak per year in spring (REGLE_2_1.NDVI_pic_habituel)
    yearly_peaks: dict[int, float] = {}
    for d, val in ndvi_by_date.items():
        if d.month not in _SPRING_MONTHS:
            continue
        if d.year not in yearly_peaks or val > yearly_peaks[d.year]:
            yearly_peaks[d.year] = val

    ndvi_peak = median(list(yearly_peaks.values())) if len(yearly_peaks) >= 2 else None

    return ratio_baseline, ndvi_peak


def _latest_value(satellite: Step1Output, index: str) -> float | None:
    """Get the most recent non-outlier value for an index."""
    points = satellite.index_time_series.get(index, [])
    for p in reversed(sorted(points, key=lambda x: x.date)):
        if not p.outlier:
            return p.value
    return None


def _ndvi_declining(satellite: Step1Output) -> bool:
    """REGLE_2_5 — Check if NDVI trend is negative (dNDVI/dt ≤ 0)."""
    ndvi_points = [
        p for p in satellite.index_time_series.get("NDVI", [])
        if not p.outlier
    ]
    if len(ndvi_points) < 2:
        return False
    ordered = sorted(ndvi_points, key=lambda p: p.date)
    return ordered[-1].value <= ordered[-2].value


def classify_signal(
    satellite: Step1Output,
    weather: Step2Output,
    crop_type: str,
) -> SignalClassificationOutput:
    """Classify the spectral signal state at the latest acquisition date.

    Implements REGLE_2_0 (mode), REGLE_2_1 (baselines), REGLE_2_2
    (decision tree), and REGLE_2_5 (clarification point).
    """
    # --- REGLE_2_0: mode detection ---
    cycles = _count_cycles(satellite)
    mode = "AMORCAGE" if cycles < 3 else "NORMAL"

    # --- 30-day weather window ---
    daily = weather.daily_weather
    if not daily:
        return SignalClassificationOutput(
            signal_state="MIXTE_MODERE",
            mode=mode,
            cycles_available=cycles,
            precip_30j=0.0,
            tmax_30j_pct=0.0,
            tmoy_30j=0.0,
            note="Pas de données météo disponibles",
        )

    target_date = max(d.date for d in daily)
    window = [d for d in daily if (target_date - d.date).days <= 30]

    precip_30j = round(sum(d.precip for d in window), 2)
    tmax_30j_pct = round(
        (sum(1 for d in window if d.temp_max > 30) / len(window) * 100)
        if window
        else 0.0,
        1,
    )
    tmoy_30j = round(
        mean((d.temp_max + d.temp_min) / 2 for d in window) if window else 0.0,
        1,
    )

    # --- REGLE_2_1: baselines ---
    ratio_baseline, ndvi_peak_baseline = _compute_baselines(satellite)

    # --- Current NIRv/NDVI ratio ---
    nirv_latest = _latest_value(satellite, "NIRv")
    ndvi_latest = _latest_value(satellite, "NDVI")
    ratio_current = (
        round(nirv_latest / max(ndvi_latest, 0.01), 4)
        if nirv_latest is not None and ndvi_latest is not None
        else None
    )

    # --- REGLE_2_2: decision tree ---
    signal_state: str
    note: str | None = None

    if tmax_30j_pct > 70 and precip_30j < 5:
        signal_state = "SIGNAL_PUR"
        note = "Saison sèche — adventices mortes, signal spectral fiable"
    elif (
        ratio_baseline is not None
        and ratio_current is not None
        and ndvi_peak_baseline is not None
        and ndvi_latest is not None
        and ratio_current > ratio_baseline * 1.10
        and ndvi_latest > ndvi_peak_baseline
    ):
        signal_state = "DOMINE_ADVENTICES"
        note = "Signal dominé par les adventices — diagnostic thermique uniquement"
    elif precip_30j > 20 and tmoy_30j > 10:
        signal_state = "MIXTE_MODERE"
        note = "Signal mixte (culture + adventices) — utiliser dérivées et ratios"
    else:
        signal_state = "MIXTE_MODERE"
        note = "Signal mixte par défaut"

    # --- REGLE_2_5: clarification ---
    clarification = False
    if signal_state in ("MIXTE_MODERE", "DOMINE_ADVENTICES"):
        if _ndvi_declining(satellite) and tmax_30j_pct > 70 and precip_30j < 5:
            signal_state = "SIGNAL_PUR"
            clarification = True
            note = "Clarification atteinte — adventices séchées, signal redevient pur"

    return SignalClassificationOutput(
        signal_state=signal_state,
        mode=mode,
        cycles_available=cycles,
        precip_30j=precip_30j,
        tmax_30j_pct=tmax_30j_pct,
        tmoy_30j=tmoy_30j,
        ratio_nirv_ndvi_current=ratio_current,
        ratio_nirv_ndvi_baseline=round(ratio_baseline, 4) if ratio_baseline else None,
        ndvi_peak_baseline=round(ndvi_peak_baseline, 4) if ndvi_peak_baseline else None,
        clarification_reached=clarification,
        note=note,
    )
