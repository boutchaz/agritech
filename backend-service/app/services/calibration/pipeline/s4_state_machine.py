"""Generic crop phenology state machine driven by ``protocole_phenologique``.

Processes daily weather + satellite data chronologically and transitions
between phenological phases based on GDD, temperature, precipitation, and
vegetation index conditions — all sourced from the crop referential JSON.

Architecture
------------
The state machine is designed to be **data-driven and crop-agnostic**:

- ``load_phase_definitions`` reads structured exit conditions from
  ``protocole_phenologique.phases`` and ``condition_evaluator.evaluate``
  drives all transitions, so adding a new crop only requires updating
  its referential JSON (no code changes).
- GDD formula parameters (tbase, tupper) come from ``referential_utils.get_gdd_tbase_tupper``.
- Cycle start/end months come from ``stades_bbch`` cycle months in the referential.
- Chill thresholds are variety-specific, read from ``gdd.seuils_chill_units_par_variete``.

Public API
----------
- ``run_state_machine`` — generic entry point for any crop with
  ``protocole_phenologique``.  Accepts ``crop_type`` explicitly.
- ``run_olive_state_machine`` — backward-compatible alias for ``run_state_machine``.
- ``map_timelines_to_step4output`` — convert ``SeasonTimeline`` list to
  ``Step4Output``, using per-season ``PhaseTransition.gdd_at_entry`` for
  GDD correlation (not the cross-year cumulative from Step2).

GDD correlation note
--------------------
``gdd_correlation`` in ``Step4Output`` uses per-season GDD values read directly
from ``PhaseTransition.gdd_at_entry`` (accumulated and reset each agronomic cycle
by the state machine).  This produces a meaningful metric: "in years where GDD
accumulated faster, did this stage occur earlier?"

The older approach of looking up ``Step2Output.cumulative_gdd`` (a running total
across all dataset years) inflated values for later years and produced spurious
correlations.  ``_nearest_cumulative_gdd`` is retained for legacy callers only.

Phase resolution: 6-state output vs. 8-stage referential
---------------------------------------------------------
The state machine emits 6 ``OlivePhase`` values:
  DORMANCE → DEBOURREMENT → FLORAISON → NOUAISON → STRESS_ESTIVAL → REPRISE_AUTOMNALE

The referential ``stades_bbch`` defines 8 finer ``phase_kc`` stages:
  repos · debourrement · croissance · floraison · nouaison ·
  grossissement · maturation · post_recolte

The coarser 6-phase model is intentional for calibration: it captures the main
agronomic transitions without requiring sub-stage satellite discrimination.
Bridging to ``phase_kc`` granularity (e.g. separating grossissement/maturation
within STRESS_ESTIVAL) would require GDD sub-range thresholds from ``stades_bbch``
and is left as future work.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date
from enum import Enum

from ..support.condition_evaluator import evaluate
from ..support.gdd_service import compute_daily_gdd, estimate_chill_hours

logger = logging.getLogger(__name__)


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
    heat_count_threshold: float = 30.0,
) -> DailySignals:
    """Compute all daily signals needed by the state machine.

    GDD uses the shared ``compute_daily_gdd`` from gdd_service with
    ``tbase`` and ``tupper`` read from the crop's referential.

    ``heat_count_threshold`` sets the Tmax threshold used to count hot days
    for ``tmax_30j_pct``.  Defaults to 30 °C (olive referential stress
    condition threshold).
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
        if float(w.get("temp_max") or w.get("temperature_max") or 0.0) > heat_count_threshold
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

_DEFAULT_CHILL_THRESHOLD = 150


@dataclass
class PhaseConfig:
    """Core configuration extracted from referential protocole_phenologique.

    Phase transition thresholds are no longer stored here -- they live on
    ``PhaseDefinition.exits`` and are evaluated via ``condition_evaluator``.
    PhaseConfig retains only chill parameters and the active-phase filter.
    """

    # Chill
    chill_threshold: int = 150
    # Months during which chill units are accumulated.  Derived from
    # stades_bbch entries with phase_kc == "repos" + one neighbouring month
    # each side.  Empty frozenset = crop has no dormancy/chill requirement.
    chill_months: frozenset = frozenset({11, 12, 1, 2})

    # Active phases for the current maturity stage.  When a transition targets
    # a phase NOT in this set, the machine skips forward to the next allowed
    # phase in cycle order.  None = all phases active (default / full cycle).
    # Populated from referential ``protocole_phenologique.phases_par_maturite``.
    active_phases: frozenset[str] | None = None


@dataclass
class PhaseDefinition:
    """A single phase's referential definition with structured exit conditions."""

    name: str
    exits: list[dict]         # [{target, when, confidence, on_enter?}]
    skip_when: dict | None    # condition to skip this phase entirely
    entry_when: dict | None   # condition for entering this phase


# Mapping from BBCH phase_kc (8 fine-grained) → state machine OlivePhase (6 coarse).
# This bridges the referential's dynamic BBCH stages to the state machine's internal
# representation.  Adding a new crop only requires its stades_bbch in the referential.
_BBCH_TO_STATE_PHASE: dict[str, OlivePhase] = {
    "repos": OlivePhase.DORMANCE,
    "debourrement": OlivePhase.DEBOURREMENT,
    "croissance": OlivePhase.DEBOURREMENT,  # merged with debourrement
    "floraison": OlivePhase.FLORAISON,
    "nouaison": OlivePhase.NOUAISON,
    "grossissement": OlivePhase.STRESS_ESTIVAL,  # merged: fruit fill → summer stress
    "maturation": OlivePhase.STRESS_ESTIVAL,  # merged: ripening → summer stress
    "post_recolte": OlivePhase.REPRISE_AUTOMNALE,
}


# ---------------------------------------------------------------------------
# Default phase definitions (olive) — used when no referential is provided
# ---------------------------------------------------------------------------

_DEFAULT_PHASE_DEFINITIONS: list[PhaseDefinition] = [
    PhaseDefinition(
        name="DORMANCE",
        exits=[{
            "target": "DEBOURREMENT",
            "when": {"and": [
                {"var": "chill_satisfied", "eq": True},
                {"var": "warm_streak", "gte": 10},
            ]},
            "on_enter": {"reset": ["GDD_cumul"]},
            "confidence": "MODEREE",
        }],
        skip_when={"var": "Tmoy_Q25", "gte": 15},
        entry_when={"and": [
            {"var": "Tmoy", "lt_var": "Tmoy_Q25"},
            {"var": "NIRv_norm", "lte": 0.15},
        ]},
    ),
    PhaseDefinition(
        name="DEBOURREMENT",
        exits=[{
            "target": "FLORAISON",
            "when": {"and": [
                {"var": "GDD_cumul", "gte": 350},
                {"var": "Tmoy", "gte": 18},
            ]},
            "confidence": "MODEREE",
        }],
        skip_when=None,
        entry_when=None,
    ),
    PhaseDefinition(
        name="FLORAISON",
        exits=[{
            "target": "NOUAISON",
            "when": {"or": [
                {"var": "GDD_cumul", "gt": 700},
                {"var": "hot_streak", "gte": 5},
            ]},
            "confidence": "MODEREE",
        }],
        skip_when=None,
        entry_when=None,
    ),
    PhaseDefinition(
        name="NOUAISON",
        exits=[{
            "target": "STRESS_ESTIVAL",
            "when": {"var": "hot_dry_streak", "gte": 3},
            "confidence": "ELEVEE",
        }],
        skip_when=None,
        entry_when=None,
    ),
    PhaseDefinition(
        name="STRESS_ESTIVAL",
        exits=[
            {
                "target": "REPRISE_AUTOMNALE",
                "when": {"and": [
                    {"var": "precip_30j", "gt": 20},
                    {"var": "Tmoy", "lt": 25},
                    {"var": "d_nirv_dt", "gt": 0},
                ]},
                "confidence": "MODEREE",
            },
            {
                "target": "DORMANCE",
                "when": {"var": "cold_streak", "gte": 10},
                "confidence": "ELEVEE",
            },
        ],
        skip_when=None,
        entry_when=None,
    ),
    PhaseDefinition(
        name="REPRISE_AUTOMNALE",
        exits=[{
            "target": "DORMANCE",
            "when": {"var": "cold_streak", "gte": 10},
            "on_enter": {"reset": ["GDD_cumul"]},
            "confidence": "ELEVEE",
        }],
        skip_when=None,
        entry_when=None,
    ),
]

# Default streak definitions (olive) — used when signaux.streaks is absent
_DEFAULT_STREAK_DEFINITIONS: dict[str, dict] = {
    "warm_streak": {"var": "Tmoy", "gt_var": "Tmoy_Q25"},
    "cold_streak": {"var": "Tmoy", "lt_var": "Tmoy_Q25"},
    "hot_streak": {"var": "Tmoy", "gt": 25},
    "hot_dry_streak": {"and": [
        {"var": "Tmax", "gt": 30},
        {"var": "precip_30j", "lt": 5},
    ]},
}


def load_phase_definitions(reference_data: dict | None) -> list[PhaseDefinition]:
    """Load phase definitions from referential ``protocole_phenologique.phases``.

    The NEW format uses phase names as keys (DORMANCE, DEBOURREMENT, etc.)
    with structured ``exit`` arrays, ``skip_when``, and ``entry.when``.

    If phases have old PHASE_N keys with string conditions, logs a warning
    and returns empty list — the caller should use ``_DEFAULT_PHASE_DEFINITIONS``.
    """
    if not reference_data:
        return []

    proto = reference_data.get("protocole_phenologique")
    if not isinstance(proto, dict):
        return []

    phases = proto.get("phases")
    if not isinstance(phases, dict):
        return []

    # Detect old format: keys like PHASE_0, PHASE_1, etc.
    has_old_keys = any(k.startswith("PHASE_") for k in phases if k != "_note")
    # Detect new format: keys like DORMANCE, DEBOURREMENT, etc.
    known_phase_names = {p.value for p in OlivePhase}
    has_new_keys = any(k in known_phase_names for k in phases)

    if has_old_keys and not has_new_keys:
        logger.warning(
            "Referential uses legacy PHASE_N keys — falling back to defaults. "
            "Migrate to structured conditions (DORMANCE, DEBOURREMENT, etc.)."
        )
        return []

    if not has_new_keys:
        return []

    definitions: list[PhaseDefinition] = []
    # Iterate in canonical order
    for phase_enum in OlivePhase:
        phase_name = phase_enum.value
        phase_data = phases.get(phase_name)
        if not isinstance(phase_data, dict):
            continue

        exits = phase_data.get("exit", [])
        if not isinstance(exits, list):
            exits = []

        skip_when = phase_data.get("skip_when")
        entry_block = phase_data.get("entry", {})
        entry_when = entry_block.get("when") if isinstance(entry_block, dict) else None

        definitions.append(PhaseDefinition(
            name=phase_name,
            exits=exits,
            skip_when=skip_when,
            entry_when=entry_when,
        ))

    return definitions


def extract_phase_config(
    reference_data: dict | None,
    maturity_phase: str | None = None,
) -> PhaseConfig:
    """Build PhaseConfig from a crop referential JSON.

    Extracts only chill configuration and active_phases.  Phase transition
    thresholds are now on ``PhaseDefinition.exits`` and evaluated via
    ``condition_evaluator``.
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

    # Detect dormancy phase — check both new and old format keys
    has_dormancy = phases.get("DORMANCE") is not None or phases.get("PHASE_0") is not None

    # Chill months: derived from stades_bbch entries with phase_kc == "repos".
    # Expanded by one neighbouring month each side for transitional accumulation.
    # If the crop has no dormancy phase, chill months = empty → never accumulate.
    if has_dormancy:
        from ..referential_utils import french_month_to_num as _fmtn
        repos_months: set[int] = set()
        for stade in (reference_data.get("stades_bbch") or []):
            if str(stade.get("phase_kc", "")).lower() == "repos":
                mois = stade.get("mois")
                if isinstance(mois, list):
                    for m in mois:
                        repos_months.add(_fmtn(str(m)))
                elif isinstance(mois, str):
                    repos_months.add(_fmtn(mois))
        if repos_months:
            expanded: set[int] = set()
            for m in repos_months:
                expanded.add(m)
                expanded.add((m - 2) % 12 + 1)  # month before
                expanded.add(m % 12 + 1)         # month after
            cfg.chill_months = frozenset(expanded)
        # else: keep default {11, 12, 1, 2} (olive without stades_bbch repos data)
    else:
        cfg.chill_months = frozenset()  # no dormancy phase → chill never applies

    # Active phases per maturity stage, driven by BBCH phase_kc names.
    if maturity_phase:
        maturite_map = proto.get("phases_par_maturite")
        if isinstance(maturite_map, dict):
            phase_key = maturity_phase.lower()
            active_bbch = maturite_map.get(phase_key)
            if isinstance(active_bbch, list) and active_bbch:
                active_state_phases: set[str] = set()
                for bbch_name in active_bbch:
                    mapped = _BBCH_TO_STATE_PHASE.get(str(bbch_name).lower())
                    if mapped:
                        active_state_phases.add(mapped.value)
                if active_state_phases:
                    cfg.active_phases = frozenset(active_state_phases)

    return cfg


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


_PHASE_CYCLE_ORDER: list[OlivePhase] = [
    OlivePhase.DORMANCE,
    OlivePhase.DEBOURREMENT,
    OlivePhase.FLORAISON,
    OlivePhase.NOUAISON,
    OlivePhase.STRESS_ESTIVAL,
    OlivePhase.REPRISE_AUTOMNALE,
]


class CropPhaseStateMachine:
    """Generic crop phenology state machine driven by condition evaluator.

    Processes daily signals chronologically and transitions between
    phenological phases by evaluating structured JSON conditions from
    the referential.  All transition logic is data-driven — no crop-specific
    handler functions.

    Phase definitions (``PhaseDefinition``) specify exit conditions as
    JSON condition trees evaluated by ``condition_evaluator.evaluate()``.
    Streaks (warm, cold, hot, hot_dry) are also driven by referential
    conditions from ``signaux.streaks``.
    """

    def __init__(
        self,
        tmoy_q25: float,
        chill_threshold: int = 150,
        skip_dormancy: bool = False,
        config: PhaseConfig | None = None,
        phase_definitions: list[PhaseDefinition] | None = None,
        streak_definitions: dict[str, dict] | None = None,
    ) -> None:
        self.tmoy_q25 = tmoy_q25
        self.cfg = config or PhaseConfig(chill_threshold=chill_threshold)
        self.chill_threshold = self.cfg.chill_threshold

        # Phase definitions — use provided or defaults
        phase_defs = phase_definitions if phase_definitions else _DEFAULT_PHASE_DEFINITIONS
        self.phases_by_name: dict[str, PhaseDefinition] = {
            pd.name: pd for pd in phase_defs
        }

        # Streak definitions and counters
        self.streak_definitions: dict[str, dict] = (
            streak_definitions if streak_definitions is not None
            else dict(_DEFAULT_STREAK_DEFINITIONS)
        )
        self.streak_counters: dict[str, int] = {
            name: 0 for name in self.streak_definitions
        }

        self.gdd_cumul: float = 0.0
        self.chill_cumul: float = 0.0
        self.chill_satisfied: bool = False

        self.transitions: list[PhaseTransition] = []

        # Determine initial phase: skip dormancy if warm climate
        dormance_def = self.phases_by_name.get("DORMANCE")
        should_skip = skip_dormancy
        if not should_skip and dormance_def and dormance_def.skip_when:
            skip_ctx = {"Tmoy_Q25": tmoy_q25}
            should_skip = evaluate(dormance_def.skip_when, skip_ctx)

        if should_skip:
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

        # Accumulate chill only during crop-specific chill months (from referential).
        # Empty chill_months = crop has no chill requirement → skip entirely.
        if signals.current_date.month in self.cfg.chill_months:
            ch = estimate_chill_hours(signals.tmax, signals.tmin)
            self.chill_cumul += ch
            if not self.chill_satisfied and self.chill_cumul >= self.chill_threshold:
                self.chill_satisfied = True

        # GDD accumulation (for all phases except DORMANCE, which resets on exit)
        if self.current_phase != OlivePhase.DORMANCE:
            self.gdd_cumul += signals.gdd_jour

        # Update streaks (referential-driven)
        raw_ctx = {
            "Tmoy": signals.tmoy,
            "Tmax": signals.tmax,
            "Tmin": signals.tmin,
            "precip": signals.precip,
            "precip_30j": signals.precip_30j,
            "Tmoy_Q25": self.tmoy_q25,
        }
        for name, condition in self.streak_definitions.items():
            if evaluate(condition, raw_ctx):
                self.streak_counters[name] = self.streak_counters.get(name, 0) + 1
            else:
                self.streak_counters[name] = 0

        # Build full context for exit evaluation
        context = self._build_context(signals)

        # Evaluate exit conditions for current phase
        phase_def = self.phases_by_name.get(self.current_phase.value)
        if phase_def:
            for exit_rule in phase_def.exits:
                if evaluate(exit_rule["when"], context):
                    target_name = exit_rule["target"]
                    confidence = exit_rule.get("confidence", "MODEREE")
                    target_phase = OlivePhase(target_name)

                    # Handle on_enter actions (e.g., reset GDD)
                    on_enter = exit_rule.get("on_enter", {})
                    if isinstance(on_enter, dict):
                        for var in on_enter.get("reset", []):
                            if var == "GDD_cumul":
                                self.gdd_cumul = 0.0

                    # Reset chill when entering DORMANCE
                    if target_name == "DORMANCE":
                        self.chill_cumul = 0.0
                        self.chill_satisfied = False

                    # Reset all streak counters on transition (each phase
                    # evaluates its own exit conditions from a clean slate).
                    for k in self.streak_counters:
                        self.streak_counters[k] = 0

                    self._transition_to(target_phase, signals, confidence)
                    break

    def _build_context(self, signals: DailySignals) -> dict:
        """Build the full context dict for condition evaluation."""
        ctx: dict = {
            # Weather
            "Tmoy": signals.tmoy,
            "Tmax": signals.tmax,
            "Tmin": signals.tmin,
            "precip": signals.precip,
            "precip_30j": signals.precip_30j,
            "tmax_30j_pct": signals.tmax_30j_pct,
            # Reference
            "Tmoy_Q25": self.tmoy_q25,
            # Accumulations
            "GDD_cumul": self.gdd_cumul,
            "chill_satisfied": self.chill_satisfied,
            "chill_cumul": self.chill_cumul,
        }
        # Satellite derivatives
        if signals.d_nirv_dt is not None:
            ctx["d_nirv_dt"] = signals.d_nirv_dt
        if signals.d_ndvi_dt is not None:
            ctx["d_ndvi_dt"] = signals.d_ndvi_dt
        if signals.nirv is not None:
            ctx["NIRv"] = signals.nirv
        if signals.ndvi is not None:
            ctx["NDVI"] = signals.ndvi

        # Streak counters
        ctx.update(self.streak_counters)

        return ctx

    def _resolve_target_phase(self, requested: OlivePhase) -> tuple[OlivePhase, str]:
        """Resolve the actual target phase, skipping inactive phases.

        When ``active_phases`` is set in the config, any phase not in the set
        is skipped — the machine advances to the next allowed phase in cycle
        order.  Returns (resolved_phase, confidence_adjustment).
        """
        active = self.cfg.active_phases
        if active is None or requested.value in active:
            return requested, ""

        # Find the next active phase after the requested one in cycle order
        try:
            idx = _PHASE_CYCLE_ORDER.index(requested)
        except ValueError:
            return requested, ""

        for i in range(1, len(_PHASE_CYCLE_ORDER)):
            candidate = _PHASE_CYCLE_ORDER[(idx + i) % len(_PHASE_CYCLE_ORDER)]
            if candidate.value in active:
                return candidate, "FAIBLE"
        return requested, ""

    def _transition_to(self, new_phase: OlivePhase, signals: DailySignals,
                       confidence: str = "MODEREE") -> None:
        """Record a phase transition, skipping phases not in active_phases."""
        resolved, conf_override = self._resolve_target_phase(new_phase)
        if conf_override:
            confidence = conf_override

        # Close current phase
        if self.transitions:
            self.transitions[-1].end_date = signals.current_date

        self.transitions.append(PhaseTransition(
            phase=resolved,
            start_date=signals.current_date,
            gdd_at_entry=self.gdd_cumul,
            confidence=confidence,
        ))
        self.current_phase = resolved


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
    """Compute 25th percentile of daily Tmoy for one cycle."""
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


def run_state_machine(
    *,
    weather_days: list[dict],
    nirv_series: list[dict],
    ndvi_series: list[dict],
    crop_type: str = "olivier",
    variety: str | None = None,
    reference_data: dict | None = None,
    maturity_phase: str | None = None,
) -> list[SeasonTimeline]:
    """Run the phenology state machine for any crop with a ``protocole_phenologique``.

    Generic entry point for GDD-driven phenology detection.  All thresholds —
    GDD formula parameters (tbase, tupper), phase transition conditions, chill
    requirements — are sourced from ``reference_data`` (the crop referential JSON).
    The function does **not** contain any crop-specific hardcoding; adding a new
    crop requires only its referential JSON to define ``protocole_phenologique``.

    Process
    -------
    1. Read GDD formula params from referential (``get_gdd_tbase_tupper``).
    2. Extract phase transition thresholds from ``protocole_phenologique.phases``
       (``extract_phase_config``).
    3. Determine agronomic cycle start/end from ``stades_bbch`` cycle months.
    4. Group daily weather by cycle year.
    5. For each cycle year with ≥ 120 days of data, run ``OlivePhaseStateMachine``
       and collect a ``SeasonTimeline``.

    Args:
        weather_days: Daily weather records (temp_max, temp_min, precip required).
        nirv_series: NIRv satellite series as ``[{"date": "YYYY-MM-DD", "value": float}]``.
        ndvi_series: NDVI satellite series (same format as nirv_series).
        crop_type: Canonical crop type key matching ``CROP_TYPE_TO_REFERENTIAL_JSON``.
                   Defaults to "olivier" for backward compatibility.
        variety: Variety name for variety-specific chill thresholds (olive only).
        reference_data: Parsed referential JSON dict.  All thresholds are sourced
                        from here; pass ``None`` to fall back to olive defaults.
        maturity_phase: Tree maturity phase (``JUVENILE``, ``ENTREE_PRODUCTION``, etc.).
                        Juvenile trees skip fruiting phases (NOUAISON, STRESS_ESTIVAL).

    Returns:
        List of ``SeasonTimeline`` objects, one per complete agronomic cycle year.
    """
    if not weather_days:
        return []

    # All thresholds from referential — no crop-specific hardcoding below this line.
    cfg = extract_phase_config(reference_data, maturity_phase=maturity_phase)
    gdd_ref = reference_data.get("gdd") if reference_data else None
    cfg.chill_threshold = resolve_chill_threshold(variety, gdd_ref)

    # Load structured phase definitions from referential (or use defaults)
    phase_defs = load_phase_definitions(reference_data)
    if not phase_defs:
        phase_defs = list(_DEFAULT_PHASE_DEFINITIONS)

    # Load streak definitions from referential signaux.streaks (or use defaults)
    streak_defs: dict[str, dict] | None = None
    if reference_data:
        signaux = reference_data.get("signaux")
        if isinstance(signaux, dict):
            streaks = signaux.get("streaks")
            if isinstance(streaks, dict) and streaks:
                streak_defs = dict(streaks)

    # GDD formula: tbase and tupper read from referential, with per-crop fallbacks.
    ref_tbase, ref_tupper = get_gdd_tbase_tupper(crop_type, reference_data)
    gdd_tbase = ref_tbase if ref_tbase is not None else 7.5
    gdd_tupper = ref_tupper if ref_tupper is not None else 30.0

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

        cycle_tmoy_q25 = _compute_tmoy_q25(year_weather)

        # Create state machine for this year
        machine = CropPhaseStateMachine(
            tmoy_q25=cycle_tmoy_q25,
            config=cfg,
            phase_definitions=phase_defs,
            streak_definitions=streak_defs,
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


# Backward-compatible aliases — kept so existing callers and tests are unaffected.
# All new code should use ``run_state_machine`` / ``CropPhaseStateMachine`` directly.
run_olive_state_machine = run_state_machine
OlivePhaseStateMachine = CropPhaseStateMachine


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


def _find_transition_after(
    transitions: list[PhaseTransition],
    phase: OlivePhase,
    after_date: date,
) -> PhaseTransition | None:
    for t in transitions:
        if t.phase == phase and t.start_date > after_date:
            return t
    return None


def _day_of_year_to_date(year: int, doy: int) -> date:
    base = date(year, 1, 1)
    return base.fromordinal(base.toordinal() + max(0, doy - 1))


def _extract_phenology_dates(
    transitions: list[PhaseTransition],
) -> dict[str, date | None] | None:
    """Map state machine transitions to PhenologyDates fields.

    Mapping (from design.md):
      PHASE_0→1 transition     →  dormancy_exit
      PHASE_1→2 transition     →  plateau_start
      PHASE_2 midpoint/exit    →  peak
      PHASE_2→3 transition     →  decline_start
      PHASE_0 return           →  dormancy_entry
    """
    debourrement = _find_transition(transitions, OlivePhase.DEBOURREMENT)
    floraison = _find_transition(transitions, OlivePhase.FLORAISON)
    nouaison = _find_transition(transitions, OlivePhase.NOUAISON)

    if not debourrement:
        return None

    dormancy_exit = debourrement.start_date
    plateau_start = floraison.start_date if floraison else None

    if floraison and floraison.end_date:
        peak = floraison.start_date + (floraison.end_date - floraison.start_date) // 2
    else:
        peak = None

    decline_start = nouaison.start_date if nouaison else None

    dormance_return = _find_transition_after(
        transitions,
        OlivePhase.DORMANCE,
        dormancy_exit,
    )
    dormancy_entry = dormance_return.start_date if dormance_return else None

    dates: dict[str, date | None] = {
        "dormancy_exit": dormancy_exit,
        "plateau_start": plateau_start,
        "peak": peak,
        "decline_start": decline_start,
        "dormancy_entry": dormancy_entry,
    }
    if all(value is None for value in dates.values()):
        return None

    return dates


def _nearest_cumulative_gdd(stage_date: date, cumulative_gdd: dict[str, float]) -> float:
    """Look up cumulative GDD for the month closest to *stage_date*.

    Note: kept for legacy callers.  When using the state machine pipeline,
    prefer ``_gdd_at_stage_from_transitions`` which reads per-season GDD
    directly from ``PhaseTransition.gdd_at_entry`` and avoids inflated
    cross-year totals.
    """
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


def _gdd_at_stage_from_transitions(
    transitions: list[PhaseTransition],
    stage: str,
) -> float | None:
    """Return per-season cumulative GDD at the transition matching a legacy stage name.

    Reads ``PhaseTransition.gdd_at_entry`` which is the within-season GDD
    accumulated by the state machine when it entered that phase.  This resets
    every agronomic cycle, so values are comparable across years (unlike the
    cross-year running total in ``Step2Output.cumulative_gdd``).

    Mapping — legacy stage → olive phase:
    - dormancy_exit  → DEBOURREMENT entry
    - plateau_start  → FLORAISON entry
    - peak           → FLORAISON entry (midpoint approximated as entry GDD)
    - decline_start  → NOUAISON entry
    - dormancy_entry → second DORMANCE entry (after the active season)
    """
    if stage in ("dormancy_exit", "plateau_start", "peak", "decline_start"):
        phase_map = {
            "dormancy_exit": OlivePhase.DEBOURREMENT,
            "plateau_start": OlivePhase.FLORAISON,
            "peak": OlivePhase.FLORAISON,
            "decline_start": OlivePhase.NOUAISON,
        }
        t = _find_transition(transitions, phase_map[stage])
        return t.gdd_at_entry if t else None

    if stage == "dormancy_entry":
        debourrement = _find_transition(transitions, OlivePhase.DEBOURREMENT)
        if debourrement:
            dormance_return = _find_transition_after(
                transitions, OlivePhase.DORMANCE, debourrement.start_date
            )
            return dormance_return.gdd_at_entry if dormance_return else None
    return None


def map_timelines_to_step4output(
    timelines: list[SeasonTimeline],
    cumulative_gdd: dict[str, float] | None = None,
) -> Step4Output:
    """Convert state machine timelines to backward-compatible ``Step4Output``.

    Builds mean phenological dates, inter-annual variability, and GDD
    correlation from the list of per-season ``SeasonTimeline`` objects
    produced by ``run_state_machine``.

    GDD correlation uses per-season ``PhaseTransition.gdd_at_entry`` values
    (from the state machine's own accumulator, reset each cycle) rather than
    the cross-year global cumulative in ``Step2Output.cumulative_gdd``.  This
    produces meaningful correlations: in years where GDD accumulated faster,
    did the stage occur earlier?

    The ``cumulative_gdd`` parameter is accepted for backward compatibility
    but is no longer used for computation.
    """
    stage_names = ["dormancy_exit", "peak", "plateau_start", "decline_start", "dormancy_entry"]

    # Per-season GDD lookup: year → transitions (for gdd_at_entry per stage).
    year_to_transitions: dict[int, list[PhaseTransition]] = {
        tl.year: tl.transitions for tl in timelines
    }

    yearly_stages: dict[int, dict[str, date | None]] = {}
    for tl in timelines:
        dates = _extract_phenology_dates(tl.transitions)
        if dates and any(value is not None for value in dates.values()):
            yearly_stages[tl.year] = dates

    if not yearly_stages:
        return Step4Output(
            mean_dates=PhenologyDates(),
            yearly_stages={},
            inter_annual_variability_days={s: 0.0 for s in stage_names},
            gdd_correlation={s: 0.0 for s in stage_names},
            referential_cycle_used=True,
            status="insufficient_data",
            missing_stages=list(stage_names),
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

    reference_year = min(yearly_stages.keys())
    mean_dates_dict: dict[str, date | None] = {}
    variability: dict[str, float] = {}
    gdd_correlation: dict[str, float] = {}
    missing_stages: list[str] = []

    for stage in stage_names:
        # Keep (year, date) pairs so we can look up per-season GDD by year.
        available_year_dates = [
            (year, yearly_stages[year][stage])
            for year in sorted(yearly_stages.keys())
            if yearly_stages[year][stage] is not None
        ]
        available_dates = [d for _, d in available_year_dates]

        if not available_dates:
            mean_dates_dict[stage] = None
            variability[stage] = 0.0
            gdd_correlation[stage] = 0.0
            missing_stages.append(stage)
            continue

        if stage == "dormancy_exit":
            if len(available_dates) == 1:
                mean_dates_dict[stage] = available_dates[0]
                variability[stage] = 0.0
            else:
                doy_values = [d.timetuple().tm_yday for d in available_dates]
                avg_doy = int(round(_mean(doy_values)))
                mean_dates_dict[stage] = _day_of_year_to_date(reference_year, avg_doy)
                variability[stage] = float(round(pstdev(doy_values), 3))
        else:
            offsets = []
            for year in sorted(yearly_stages.keys()):
                exit_date = yearly_stages[year]["dormancy_exit"]
                stage_date = yearly_stages[year][stage]
                if exit_date is None or stage_date is None:
                    continue
                offsets.append((stage_date - exit_date).days)
            if not offsets:
                mean_dates_dict[stage] = available_dates[0]
                variability[stage] = 0.0
            else:
                avg_offset = int(round(_mean(offsets)))
                base_exit = mean_dates_dict["dormancy_exit"]
                mean_dates_dict[stage] = (
                    base_exit + timedelta(days=avg_offset)
                    if base_exit is not None
                    else available_dates[0]
                )
                variability[stage] = (
                    float(round(pstdev(offsets), 3)) if len(offsets) > 1 else 0.0
                )

        # Per-season GDD at this stage — reads gdd_at_entry from the state
        # machine transition, not the cross-year global cumulative.
        gdd_values = [
            _gdd_at_stage_from_transitions(
                year_to_transitions.get(year, []), stage
            ) or 0.0
            for year, _ in available_year_dates
        ]
        doy_values = [d.timetuple().tm_yday for d in available_dates]
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
        status="degraded" if missing_stages else "ok",
        missing_stages=missing_stages,
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
