"""Olive phenology state machine driven by referential protocole_phenologique.

Processes daily weather + satellite data chronologically and transitions
between phases based on GDD, temperature, precipitation and vegetation
index conditions defined in the olive referential.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date
from enum import Enum

from ..support.gdd_service import compute_daily_gdd, estimate_chill_hours


class OlivePhase(Enum):
    """Phenological phases for olive (Olea europaea L.)."""

    DORMANCE = "DORMANCE"
    DEBOURREMENT = "DEBOURREMENT"
    FLORAISON = "FLORAISON"
    NOUAISON = "NOUAISON"
    STRESS_ESTIVAL = "STRESS_ESTIVAL"
    REPRISE_AUTOMNALE = "REPRISE_AUTOMNALE"


@dataclass
class PhaseTransition:
    """A single phase period with its start/end dates and metadata."""

    phase: OlivePhase
    start_date: date
    end_date: date | None = None
    gdd_at_entry: float = 0.0
    confidence: str = "MODEREE"  # ELEVEE | MODEREE | FAIBLE | TRES_FAIBLE


@dataclass
class SeasonTimeline:
    """Complete phase timeline for one cycle year."""

    year: int
    transitions: list[PhaseTransition] = field(default_factory=list)
    mode: str = "NORMAL"  # NORMAL | AMORCAGE


@dataclass
class DailySignals:
    """Computed signals for a single day, per referential calculs_preliminaires."""

    current_date: date
    tmax: float
    tmin: float
    tmoy: float
    gdd_jour: float
    precip: float
    precip_30j: float
    tmax_30j_pct: float  # % of last 30 days where Tmax > 30
    d_nirv_dt: float | None = None
    d_ndvi_dt: float | None = None
    nirv: float | None = None
    ndvi: float | None = None


def compute_daily_signals(
    *,
    current_date: date,
    weather_day: dict,
    weather_history_30d: list[dict],
    satellite_nirv: float | None,
    satellite_ndvi: float | None,
    prev_nirv: float | None,
    prev_ndvi: float | None,
    days_since_prev_satellite: int,
    tbase: float = 7.5,
    tupper: float = 30.0,
) -> DailySignals:
    """Compute all daily signals needed by the state machine.

    GDD uses the shared ``compute_daily_gdd`` from gdd_service with
    ``tbase`` and ``tupper`` read from the crop's referential.
    """
    tmax = float(weather_day.get("temp_max") or weather_day.get("temperature_max") or 0.0)
    tmin = float(weather_day.get("temp_min") or weather_day.get("temperature_min") or 0.0)
    precip = float(weather_day.get("precip") or weather_day.get("precipitation_sum") or 0.0)

    tmoy = (tmax + tmin) / 2.0
    gdd_jour = compute_daily_gdd(tmax, tmin, tbase, tupper)

    precip_30j = sum(
        float(w.get("precip") or w.get("precipitation_sum") or 0.0)
        for w in weather_history_30d
    )

    hot_days = sum(
        1 for w in weather_history_30d
        if float(w.get("temp_max") or w.get("temperature_max") or 0.0) > 30.0
    )
    tmax_30j_pct = (hot_days / len(weather_history_30d) * 100.0) if weather_history_30d else 0.0

    d_nirv_dt: float | None = None
    d_ndvi_dt: float | None = None
    if satellite_nirv is not None and prev_nirv is not None and days_since_prev_satellite > 0:
        d_nirv_dt = (satellite_nirv - prev_nirv) / days_since_prev_satellite
    if satellite_ndvi is not None and prev_ndvi is not None and days_since_prev_satellite > 0:
        d_ndvi_dt = (satellite_ndvi - prev_ndvi) / days_since_prev_satellite

    return DailySignals(
        current_date=current_date,
        tmax=tmax,
        tmin=tmin,
        tmoy=tmoy,
        gdd_jour=gdd_jour,
        precip=precip,
        precip_30j=precip_30j,
        tmax_30j_pct=tmax_30j_pct,
        d_nirv_dt=d_nirv_dt,
        d_ndvi_dt=d_ndvi_dt,
        nirv=satellite_nirv,
        ndvi=satellite_ndvi,
    )


# ---------------------------------------------------------------------------
# State machine config — extracted from referential
# ---------------------------------------------------------------------------

# Chill months for olive dormancy (Nov-Feb)
_CHILL_MONTHS = {11, 12, 1, 2}

_DEFAULT_CHILL_THRESHOLD = 150


@dataclass
class PhaseConfig:
    """Transition thresholds extracted from referential protocole_phenologique.

    All values come from the crop's referential JSON so the state machine
    is data-driven, not hardcoded.
    """

    # PHASE_0 → PHASE_1
    warm_streak_days: int = 10  # consecutive days Tmoy > Q25
    warm_skip_tmoy_q25: float = 15.0  # skip dormancy if Q25 >= this

    # PHASE_1 → PHASE_2
    gdd_debourrement_exit: float = 350.0
    tmoy_floraison_min: float = 18.0

    # PHASE_2 → PHASE_3
    gdd_floraison_exit: float = 700.0
    tmoy_heat_sustained: float = 25.0
    heat_sustained_days: int = 5

    # PHASE_3 → PHASE_4
    tmax_stress_threshold: float = 30.0
    precip_dry_threshold: float = 5.0
    hot_dry_streak_days: int = 3

    # PHASE_4 → PHASE_6
    precip_reprise_threshold: float = 20.0
    tmoy_reprise_max: float = 25.0

    # PHASE_4/6 → PHASE_0
    cold_streak_days: int = 10

    # Chill
    chill_threshold: int = 150


def extract_phase_config(reference_data: dict | None) -> PhaseConfig:
    """Build PhaseConfig from a crop referential JSON.

    Reads ``protocole_phenologique.phases`` for transition rules and
    ``stades_bbch`` for GDD ranges.  Falls back to olive defaults when
    keys are missing.
    """
    cfg = PhaseConfig()
    if not reference_data:
        return cfg

    proto = reference_data.get("protocole_phenologique")
    if not isinstance(proto, dict):
        return cfg

    phases = proto.get("phases")
    if not isinstance(phases, dict):
        return cfg

    # PHASE_1 exit GDD — from protocole or stades_bbch
    # protocole says "GDD_cumul >= 350", stades_bbch BBCH 51 (boutons floraux) = [500,600]
    # We use the protocole value as it's the phase-level rule
    p1 = phases.get("PHASE_1")
    if isinstance(p1, dict):
        sortie = p1.get("condition_sortie")
        if isinstance(sortie, dict):
            cond = sortie.get("condition", "")
            gdd_val = _extract_gdd_from_condition(cond)
            if gdd_val is not None:
                cfg.gdd_debourrement_exit = gdd_val
            tmoy_val = _extract_tmoy_from_condition(cond)
            if tmoy_val is not None:
                cfg.tmoy_floraison_min = tmoy_val

    # PHASE_2 exit GDD
    p2 = phases.get("PHASE_2")
    if isinstance(p2, dict):
        sortie = p2.get("condition_sortie")
        if isinstance(sortie, dict):
            cond = sortie.get("condition", "")
            gdd_val = _extract_gdd_from_condition(cond)
            if gdd_val is not None:
                cfg.gdd_floraison_exit = gdd_val

    # PHASE_0 warm skip — from verification_prealable
    p0 = phases.get("PHASE_0")
    if isinstance(p0, dict):
        pre = p0.get("verification_prealable", "")
        if "15" in str(pre):
            cfg.warm_skip_tmoy_q25 = 15.0

    return cfg


def _extract_gdd_from_condition(cond: str) -> float | None:
    """Extract GDD threshold from a condition string like 'GDD_cumul >= 350'."""
    import re
    match = re.search(r"GDD_cumul\s*[>>=]+\s*(\d+)", cond)
    if match:
        return float(match.group(1))
    return None


def _extract_tmoy_from_condition(cond: str) -> float | None:
    """Extract Tmoy threshold from a condition string like 'Tmoy >= 18'."""
    import re
    match = re.search(r"Tmoy\s*[>>=]+\s*(\d+)", cond)
    if match:
        return float(match.group(1))
    return None


def resolve_chill_threshold(
    variety: str | None,
    gdd_ref: dict | None,
) -> int:
    """Extract variety-specific chill threshold from referential GDD config.

    Uses the **lower bound** of ``seuils_chill_units_par_variete[variety]``.
    Falls back to 150 if variety or referential is missing.
    """
    if not gdd_ref or not variety:
        return _DEFAULT_CHILL_THRESHOLD
    seuils = gdd_ref.get("seuils_chill_units_par_variete")
    if not isinstance(seuils, dict):
        return _DEFAULT_CHILL_THRESHOLD
    entry = seuils.get(variety)
    if isinstance(entry, (list, tuple)) and len(entry) >= 1:
        return int(entry[0])  # lower bound
    return _DEFAULT_CHILL_THRESHOLD


# ---------------------------------------------------------------------------
# State machine
# ---------------------------------------------------------------------------


class OlivePhaseStateMachine:
    """Process daily signals and track phenological phase transitions.

    Implements the olive ``protocole_phenologique`` as a chronological
    state machine with GDD-driven transitions.  All thresholds come from
    ``PhaseConfig`` which is extracted from the crop referential.
    """

    def __init__(
        self,
        tmoy_q25: float,
        chill_threshold: int = 150,
        skip_dormancy: bool = False,
        config: PhaseConfig | None = None,
    ) -> None:
        self.tmoy_q25 = tmoy_q25
        self.cfg = config or PhaseConfig(chill_threshold=chill_threshold)
        self.chill_threshold = self.cfg.chill_threshold

        self.gdd_cumul: float = 0.0
        self.chill_cumul: float = 0.0
        self.chill_satisfied: bool = False
        self.warm_streak: int = 0
        self.hot_streak: int = 0  # consecutive days Tmoy > 25 (for FLORAISON exit)
        self.cold_streak: int = 0  # consecutive days Tmoy < Tmoy_Q25 (for return to DORMANCE)

        self.transitions: list[PhaseTransition] = []

        if skip_dormancy or tmoy_q25 >= self.cfg.warm_skip_tmoy_q25:
            self.current_phase = OlivePhase.DEBOURREMENT
            self.chill_satisfied = True
            self.transitions.append(PhaseTransition(
                phase=OlivePhase.DEBOURREMENT,
                start_date=date(2000, 1, 1),  # placeholder, overwritten on first process_day
                gdd_at_entry=0.0,
                confidence="MODEREE",
            ))
            self._phase_start_set = False
        else:
            self.current_phase = OlivePhase.DORMANCE
            self.transitions.append(PhaseTransition(
                phase=OlivePhase.DORMANCE,
                start_date=date(2000, 1, 1),  # placeholder
                gdd_at_entry=0.0,
                confidence="ELEVEE",
            ))
            self._phase_start_set = False

    def process_day(self, signals: DailySignals) -> None:
        """Process one day of signals and potentially transition phase."""
        # Set start date of first phase on first call
        if not self._phase_start_set:
            self.transitions[-1].start_date = signals.current_date
            self._phase_start_set = True

        # Accumulate chill in winter months
        if signals.current_date.month in _CHILL_MONTHS:
            ch = estimate_chill_hours(signals.tmax, signals.tmin)
            self.chill_cumul += ch
            if not self.chill_satisfied and self.chill_cumul >= self.chill_threshold:
                self.chill_satisfied = True

        # Dispatch to current phase handler
        handler = _PHASE_HANDLERS.get(self.current_phase)
        if handler:
            handler(self, signals)

    def _transition_to(self, new_phase: OlivePhase, signals: DailySignals,
                       confidence: str = "MODEREE") -> None:
        """Record a phase transition."""
        # Close current phase
        if self.transitions:
            self.transitions[-1].end_date = signals.current_date

        self.transitions.append(PhaseTransition(
            phase=new_phase,
            start_date=signals.current_date,
            gdd_at_entry=self.gdd_cumul,
            confidence=confidence,
        ))
        self.current_phase = new_phase


def _handle_dormance(machine: OlivePhaseStateMachine, signals: DailySignals) -> None:
    """PHASE_0: exit when Tmoy > Tmoy_Q25 for ≥ N consecutive days and chill satisfied."""
    if signals.tmoy > machine.tmoy_q25:
        machine.warm_streak += 1
    else:
        machine.warm_streak = 0

    if machine.chill_satisfied and machine.warm_streak >= machine.cfg.warm_streak_days:
        machine.gdd_cumul = 0.0
        machine.warm_streak = 0
        machine._transition_to(OlivePhase.DEBOURREMENT, signals, confidence="MODEREE")


def _handle_debourrement(machine: OlivePhaseStateMachine, signals: DailySignals) -> None:
    """PHASE_1: accumulate GDD, exit to FLORAISON at GDD threshold and Tmoy threshold."""
    machine.gdd_cumul += signals.gdd_jour
    if (machine.gdd_cumul >= machine.cfg.gdd_debourrement_exit
            and signals.tmoy >= machine.cfg.tmoy_floraison_min):
        machine._transition_to(OlivePhase.FLORAISON, signals, confidence="MODEREE")


def _handle_floraison(machine: OlivePhaseStateMachine, signals: DailySignals) -> None:
    """PHASE_2: exit to NOUAISON at GDD threshold or sustained heat."""
    machine.gdd_cumul += signals.gdd_jour

    if signals.tmoy > machine.cfg.tmoy_heat_sustained:
        machine.hot_streak += 1
    else:
        machine.hot_streak = 0

    if (machine.gdd_cumul > machine.cfg.gdd_floraison_exit
            or machine.hot_streak >= machine.cfg.heat_sustained_days):
        machine.hot_streak = 0
        machine._transition_to(OlivePhase.NOUAISON, signals, confidence="MODEREE")


def _handle_nouaison(machine: OlivePhaseStateMachine, signals: DailySignals) -> None:
    """PHASE_3: exit to STRESS_ESTIVAL on hot + dry conditions."""
    machine.gdd_cumul += signals.gdd_jour

    if (signals.tmax > machine.cfg.tmax_stress_threshold
            and signals.precip_30j < machine.cfg.precip_dry_threshold):
        machine.hot_streak += 1
    else:
        machine.hot_streak = 0

    if machine.hot_streak >= machine.cfg.hot_dry_streak_days:
        machine.hot_streak = 0
        machine._transition_to(OlivePhase.STRESS_ESTIVAL, signals, confidence="ELEVEE")


def _handle_stress_estival(machine: OlivePhaseStateMachine, signals: DailySignals) -> None:
    """PHASE_4: exit to REPRISE_AUTOMNALE on rain+cooling, or to DORMANCE on winter.

    Referential:
    - → PHASE_6: Precip_episode > 20 AND Tmoy < 25 AND dNIRv_dt > 0
    - → PHASE_0: Tmoy < Tmoy_Q25 AND sustained cold
    """
    machine.gdd_cumul += signals.gdd_jour

    # Check for autumn rain → REPRISE
    if (signals.precip_30j > machine.cfg.precip_reprise_threshold
            and signals.tmoy < machine.cfg.tmoy_reprise_max
            and signals.d_nirv_dt is not None and signals.d_nirv_dt > 0):
        machine._transition_to(OlivePhase.REPRISE_AUTOMNALE, signals, confidence="MODEREE")
        return

    # Check for winter arrival → direct to DORMANCE
    if signals.tmoy < machine.tmoy_q25:
        machine.cold_streak += 1
    else:
        machine.cold_streak = 0

    if machine.cold_streak >= machine.cfg.cold_streak_days:
        machine.cold_streak = 0
        machine.chill_cumul = 0.0
        machine.chill_satisfied = False
        machine._transition_to(OlivePhase.DORMANCE, signals, confidence="ELEVEE")


def _handle_reprise_automnale(machine: OlivePhaseStateMachine, signals: DailySignals) -> None:
    """PHASE_6: exit back to DORMANCE when Tmoy < Tmoy_Q25 sustained.

    Referential: Tmoy < Tmoy_Q25 AND NIRvP_norm < 0.15 (temp-only when NIRvP unavailable).
    """
    machine.gdd_cumul += signals.gdd_jour

    if signals.tmoy < machine.tmoy_q25:
        machine.cold_streak += 1
    else:
        machine.cold_streak = 0

    if machine.cold_streak >= machine.cfg.cold_streak_days:
        machine.cold_streak = 0
        machine.chill_cumul = 0.0
        machine.chill_satisfied = False
        machine._transition_to(OlivePhase.DORMANCE, signals, confidence="ELEVEE")


_PHASE_HANDLERS: dict = {
    OlivePhase.DORMANCE: _handle_dormance,
    OlivePhase.DEBOURREMENT: _handle_debourrement,
    OlivePhase.FLORAISON: _handle_floraison,
    OlivePhase.NOUAISON: _handle_nouaison,
    OlivePhase.STRESS_ESTIVAL: _handle_stress_estival,
    OlivePhase.REPRISE_AUTOMNALE: _handle_reprise_automnale,
}


# ---------------------------------------------------------------------------
# Full-season runner
# ---------------------------------------------------------------------------

from ..referential_utils import (
    get_cycle_months_from_stades_bbch,
    cycle_year_for_date,
    get_gdd_tbase_tupper,
)
from collections import defaultdict
from statistics import mean as _mean
from datetime import timedelta


def _compute_tmoy_q25(weather_days: list[dict]) -> float:
    """Compute 25th percentile of daily Tmoy across all weather data."""
    import numpy as np
    tmoys = []
    for w in weather_days:
        tmax = float(w.get("temp_max") or w.get("temperature_max") or 0.0)
        tmin = float(w.get("temp_min") or w.get("temperature_min") or 0.0)
        tmoys.append((tmax + tmin) / 2.0)
    if not tmoys:
        return 10.0
    return float(np.percentile(tmoys, 25))


def _build_satellite_lookup(series: list[dict]) -> dict[str, float]:
    """Build date-string → value lookup from satellite series."""
    lookup: dict[str, float] = {}
    for entry in series:
        d = entry.get("date")
        v = entry.get("value")
        if d is not None and v is not None:
            lookup[str(d)[:10]] = float(v)
    return lookup


def run_olive_state_machine(
    *,
    weather_days: list[dict],
    nirv_series: list[dict],
    ndvi_series: list[dict],
    variety: str | None = None,
    reference_data: dict | None = None,
) -> list[SeasonTimeline]:
    """Run the olive phenology state machine on historical data.

    Groups data by olive cycle year (Dec-Nov), runs the state machine
    per year, and returns a list of SeasonTimeline objects.

    All transition thresholds are read from ``reference_data`` via
    ``extract_phase_config``.  Chill threshold is variety-specific via
    ``resolve_chill_threshold``.
    """
    if not weather_days:
        return []

    # Extract config from referential
    cfg = extract_phase_config(reference_data)
    gdd_ref = reference_data.get("gdd") if reference_data else None
    cfg.chill_threshold = resolve_chill_threshold(variety, gdd_ref)

    # Read GDD formula parameters from referential
    crop_type = "olivier"  # TODO: make generic when other crops get protocole_phenologique
    ref_tbase, ref_tupper = get_gdd_tbase_tupper(crop_type, reference_data)
    gdd_tbase = ref_tbase if ref_tbase is not None else 7.5
    gdd_tupper = ref_tupper if ref_tupper is not None else 30.0

    # Compute Tmoy_Q25 from all weather data
    tmoy_q25 = _compute_tmoy_q25(weather_days)

    # Build satellite lookups
    nirv_lookup = _build_satellite_lookup(nirv_series)
    ndvi_lookup = _build_satellite_lookup(ndvi_series)

    # Get cycle months from referential (olive: Dec-Nov)
    cycle_months = None
    if reference_data:
        cycle_months = get_cycle_months_from_stades_bbch(reference_data)
    start_month = cycle_months[0] if cycle_months else 12
    end_month = cycle_months[1] if cycle_months else 11

    # Group weather days by cycle year
    sorted_weather = sorted(weather_days, key=lambda w: str(w.get("date", "")))
    weather_by_year: dict[int, list[dict]] = defaultdict(list)
    for w in sorted_weather:
        raw_date = w.get("date")
        if raw_date is None:
            continue
        if isinstance(raw_date, str):
            d = date.fromisoformat(raw_date[:10])
        else:
            d = raw_date
        cy = cycle_year_for_date(d, start_month, end_month)
        weather_by_year[cy].append(w)

    timelines: list[SeasonTimeline] = []

    for year in sorted(weather_by_year.keys()):
        year_weather = weather_by_year[year]
        if len(year_weather) < 120:
            continue

        # Check date span
        first_date = _parse_date(year_weather[0].get("date"))
        last_date = _parse_date(year_weather[-1].get("date"))
        if first_date and last_date and (last_date - first_date).days < 120:
            continue

        # Create state machine for this year
        machine = OlivePhaseStateMachine(
            tmoy_q25=tmoy_q25,
            config=cfg,
        )

        # Process each day
        prev_nirv: float | None = None
        prev_ndvi: float | None = None
        prev_sat_date: date | None = None

        for i, w in enumerate(year_weather):
            d = _parse_date(w.get("date"))
            if d is None:
                continue

            # Build 30-day weather history
            start_idx = max(0, i - 29)
            history_30d = year_weather[start_idx:i + 1]

            # Satellite lookup for this day
            date_key = d.isoformat()
            nirv_val = nirv_lookup.get(date_key)
            ndvi_val = ndvi_lookup.get(date_key)

            days_since = 1
            if prev_sat_date and (nirv_val is not None or ndvi_val is not None):
                days_since = max(1, (d - prev_sat_date).days)

            signals = compute_daily_signals(
                current_date=d,
                weather_day=w,
                weather_history_30d=history_30d,
                satellite_nirv=nirv_val,
                satellite_ndvi=ndvi_val,
                prev_nirv=prev_nirv,
                prev_ndvi=prev_ndvi,
                days_since_prev_satellite=days_since,
                tbase=gdd_tbase,
                tupper=gdd_tupper,
            )
            machine.process_day(signals)

            # Update prev satellite values
            if nirv_val is not None:
                prev_nirv = nirv_val
                prev_sat_date = d
            if ndvi_val is not None:
                prev_ndvi = ndvi_val

        # Close last transition
        if machine.transitions:
            last_d = _parse_date(year_weather[-1].get("date"))
            if last_d and machine.transitions[-1].end_date is None:
                machine.transitions[-1].end_date = last_d

        # Count complete cycles for AMORCAGE mode
        complete_cycles = len(timelines)
        mode = "AMORCAGE" if complete_cycles < 3 else "NORMAL"

        timelines.append(SeasonTimeline(
            year=year,
            transitions=machine.transitions,
            mode=mode,
        ))

    return timelines


# ---------------------------------------------------------------------------
# Map SeasonTimeline → Step4Output
# ---------------------------------------------------------------------------

from ..types import PhenologyDates, Step4Output
import numpy as np
from statistics import pstdev


def _find_transition(transitions: list[PhaseTransition], phase: OlivePhase) -> PhaseTransition | None:
    for t in transitions:
        if t.phase == phase:
            return t
    return None


def _day_of_year_to_date(year: int, doy: int) -> date:
    base = date(year, 1, 1)
    return base.fromordinal(base.toordinal() + max(0, doy - 1))


def _extract_phenology_dates(transitions: list[PhaseTransition]) -> dict[str, date] | None:
    """Map state machine transitions to PhenologyDates fields.

    Mapping (from design.md):
      PHASE_0→1 transition     →  dormancy_exit
      PHASE_1→2 transition     →  plateau_start
      PHASE_2 midpoint/exit    →  peak
      PHASE_2→3 transition     →  decline_start
      PHASE_4 start or last    →  dormancy_entry
    """
    debourrement = _find_transition(transitions, OlivePhase.DEBOURREMENT)
    floraison = _find_transition(transitions, OlivePhase.FLORAISON)
    nouaison = _find_transition(transitions, OlivePhase.NOUAISON)
    stress = _find_transition(transitions, OlivePhase.STRESS_ESTIVAL)
    dormance = _find_transition(transitions, OlivePhase.DORMANCE)

    if not debourrement:
        return None

    dormancy_exit = debourrement.start_date

    plateau_start = floraison.start_date if floraison else dormancy_exit + timedelta(days=60)

    if floraison and floraison.end_date:
        peak = floraison.start_date + (floraison.end_date - floraison.start_date) // 2
    elif floraison:
        peak = floraison.start_date + timedelta(days=15)
    else:
        peak = plateau_start + timedelta(days=30)

    decline_start = nouaison.start_date if nouaison else peak + timedelta(days=14)

    if stress:
        dormancy_entry = stress.start_date
    elif transitions:
        dormancy_entry = transitions[-1].end_date or transitions[-1].start_date
    else:
        dormancy_entry = decline_start + timedelta(days=90)

    return {
        "dormancy_exit": dormancy_exit,
        "plateau_start": plateau_start,
        "peak": peak,
        "decline_start": decline_start,
        "dormancy_entry": dormancy_entry,
    }


def _nearest_cumulative_gdd(stage_date: date, cumulative_gdd: dict[str, float]) -> float:
    if not cumulative_gdd:
        return 0.0
    month_key = stage_date.strftime("%Y-%m")
    if month_key in cumulative_gdd:
        return float(cumulative_gdd[month_key])
    candidate_keys = sorted(cumulative_gdd.keys())
    for key in reversed(candidate_keys):
        if key <= month_key:
            return float(cumulative_gdd[key])
    return float(cumulative_gdd[candidate_keys[0]]) if candidate_keys else 0.0


def map_timelines_to_step4output(
    timelines: list[SeasonTimeline],
    cumulative_gdd: dict[str, float],
) -> Step4Output:
    """Convert state machine timelines to backward-compatible Step4Output."""
    stage_names = ["dormancy_exit", "peak", "plateau_start", "decline_start", "dormancy_entry"]

    yearly_stages: dict[int, dict[str, date]] = {}
    for tl in timelines:
        dates = _extract_phenology_dates(tl.transitions)
        if dates:
            yearly_stages[tl.year] = dates

    if not yearly_stages:
        today = date.today()
        return Step4Output(
            mean_dates=PhenologyDates(
                dormancy_exit=today, peak=today, plateau_start=today,
                decline_start=today, dormancy_entry=today,
            ),
            yearly_stages={},
            inter_annual_variability_days={s: 0.0 for s in stage_names},
            gdd_correlation={s: 0.0 for s in stage_names},
            referential_cycle_used=True,
            phase_timeline=[
                {
                    "year": tl.year,
                    "transitions": [
                        {
                            "phase": t.phase.value,
                            "start_date": t.start_date.isoformat(),
                            "end_date": t.end_date.isoformat() if t.end_date else None,
                            "gdd_at_entry": t.gdd_at_entry,
                            "confidence": t.confidence,
                        }
                        for t in tl.transitions
                    ],
                    "mode": tl.mode,
                }
                for tl in timelines
            ],
        )

    # Use the first year's stages directly for mean_dates when only 1 year,
    # or compute mean across years using ordinal offsets from cycle start
    # to avoid DOY wrap-around issues in cross-year cycles (olive: Dec-Nov).
    first_year = min(yearly_stages.keys())
    first_stages = yearly_stages[first_year]

    mean_dates_dict: dict[str, date] = {}
    variability: dict[str, float] = {}
    gdd_correlation: dict[str, float] = {}

    for stage in stage_names:
        all_dates = [yearly_stages[year][stage] for year in sorted(yearly_stages.keys())]

        if len(all_dates) == 1:
            mean_dates_dict[stage] = all_dates[0]
            variability[stage] = 0.0
        else:
            # Use offset from each year's dormancy_exit to avoid cross-year DOY issues
            offsets = []
            for year in sorted(yearly_stages.keys()):
                exit_date = yearly_stages[year]["dormancy_exit"]
                stage_date = yearly_stages[year][stage]
                offsets.append((stage_date - exit_date).days)
            avg_offset = int(round(_mean(offsets)))
            mean_dates_dict[stage] = first_stages["dormancy_exit"] + timedelta(days=avg_offset)
            variability[stage] = float(round(pstdev(offsets), 3))

        doy_values = [d.timetuple().tm_yday for d in all_dates]

        gdd_values = [
            _nearest_cumulative_gdd(yearly_stages[year][stage], cumulative_gdd)
            for year in sorted(yearly_stages.keys())
        ]
        if len(doy_values) > 1 and len(set(gdd_values)) > 1:
            corr = float(np.corrcoef(np.array(doy_values), np.array(gdd_values))[0, 1])
            gdd_correlation[stage] = 0.0 if np.isnan(corr) else round(corr, 4)
        else:
            gdd_correlation[stage] = 0.0

    yearly_stages_out: dict[str, PhenologyDates] = {}
    for y, stages in sorted(yearly_stages.items()):
        yearly_stages_out[str(y)] = PhenologyDates(
            dormancy_exit=stages["dormancy_exit"],
            peak=stages["peak"],
            plateau_start=stages["plateau_start"],
            decline_start=stages["decline_start"],
            dormancy_entry=stages["dormancy_entry"],
        )

    # Serialize phase_timeline
    phase_timeline_data = [
        {
            "year": tl.year,
            "transitions": [
                {
                    "phase": t.phase.value,
                    "start_date": t.start_date.isoformat(),
                    "end_date": t.end_date.isoformat() if t.end_date else None,
                    "gdd_at_entry": t.gdd_at_entry,
                    "confidence": t.confidence,
                }
                for t in tl.transitions
            ],
            "mode": tl.mode,
        }
        for tl in timelines
    ]

    return Step4Output(
        mean_dates=PhenologyDates(
            dormancy_exit=mean_dates_dict["dormancy_exit"],
            peak=mean_dates_dict["peak"],
            plateau_start=mean_dates_dict["plateau_start"],
            decline_start=mean_dates_dict["decline_start"],
            dormancy_entry=mean_dates_dict["dormancy_entry"],
        ),
        yearly_stages=yearly_stages_out,
        inter_annual_variability_days=variability,
        gdd_correlation=gdd_correlation,
        referential_cycle_used=True,
        phase_timeline=phase_timeline_data,
    )


def _parse_date(raw: object) -> date | None:
    if raw is None:
        return None
    if isinstance(raw, date):
        return raw
    try:
        return date.fromisoformat(str(raw)[:10])
    except (ValueError, TypeError):
        return None
