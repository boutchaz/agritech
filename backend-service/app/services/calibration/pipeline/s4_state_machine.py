"""Generic crop phenology state machine driven by ``stades_bbch`` + ``phases_config``.

Processes daily weather + satellite data chronologically and transitions
between phenological phases based on GDD, temperature, precipitation, and
vegetation index conditions — all sourced from the crop referential JSON.

Architecture
------------
The state machine is designed to be **data-driven and crop-agnostic**:

- ``load_phase_definitions`` reads structured exit conditions from
  ``stades_bbch`` GDD ranges + ``phases_config`` exit conditions, evaluated via ``condition_evaluator.evaluate``
  drives all transitions, so adding a new crop only requires updating
  its referential JSON (no code changes).
- GDD formula parameters (tbase, tupper) come from ``referential_utils.get_gdd_tbase_tupper``.
- Cycle start/end months come from ``stades_bbch`` cycle months in the referential.
- Chill thresholds are variety-specific, read from ``gdd.seuils_chill_units_par_variete``.

Public API
----------
- ``run_state_machine`` — generic entry point for any crop with
  ``stades_bbch`` + ``phases_config``.  Accepts ``crop_type`` explicitly.
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
from ..support.formula_evaluator import compute_preliminary_signals
from ..types import WeatherRowAccessor

logger = logging.getLogger(__name__)


class OlivePhase(Enum):
    """Legacy enum — kept for backward compatibility only.

    The state machine now uses plain strings from the referential.
    New code should use phase name strings directly.
    """

    DORMANCE = "DORMANCE"
    DEBOURREMENT = "DEBOURREMENT"
    FLORAISON = "FLORAISON"
    NOUAISON = "NOUAISON"
    STRESS_ESTIVAL = "STRESS_ESTIVAL"
    REPRISE_AUTOMNALE = "REPRISE_AUTOMNALE"


@dataclass
class PhaseTransition:
    """A single phase period with its start/end dates and metadata."""

    phase: str  # Phase name from referential (e.g. "DORMANCE", "FLORAISON")
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
    wd = WeatherRowAccessor(weather_day)
    tmax = wd.temp_max
    tmin = wd.temp_min
    precip = wd.precipitation

    tmoy = (tmax + tmin) / 2.0
    gdd_jour = compute_daily_gdd(tmax, tmin, tbase, tupper)

    precip_30j = sum(WeatherRowAccessor(w).precipitation for w in weather_history_30d)

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


def _phase_cycle_order_from_defs(phase_defs: list[PhaseDefinition]) -> list[str]:
    """Derive phase cycle order from the definitions list — referential is the source of truth."""
    return [pd.name for pd in phase_defs]


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
    """Build phase definitions from ``stades_bbch`` + ``phases_config``.

    Single source of truth:
    - ``stades_bbch``: phase order (``phase_kc``), GDD thresholds (``gdd_cumul``),
      cycle months (``mois``).
    - ``phases_config``: non-GDD exit conditions (satellite, streaks, weather),
      skip logic, reset actions.

    GDD transition threshold = upper bound of current phase's ``gdd_cumul`` range
    from ``stades_bbch``.  Non-GDD conditions from ``phases_config.exit_conditions``
    are ANDed with the GDD threshold to form the full exit rule.

    Falls back to ``_DEFAULT_PHASE_DEFINITIONS`` if ``stades_bbch`` is absent.
    """
    if not reference_data:
        return []

    stades = reference_data.get("stades_bbch")
    if not isinstance(stades, list) or not stades:
        return []

    phases_config = reference_data.get("phases_config")
    if not isinstance(phases_config, dict):
        phases_config = {}

    # 1. Extract phase order + max GDD per phase from stades_bbch
    phase_order: list[str] = []
    phase_gdd_upper: dict[str, float] = {}
    for stade in stades:
        pk = str(stade.get("phase_kc", "")).lower()
        if not pk:
            continue
        if pk not in phase_gdd_upper:
            phase_order.append(pk)
        gdd_range = stade.get("gdd_cumul")
        if isinstance(gdd_range, list) and len(gdd_range) >= 2:
            phase_gdd_upper[pk] = float(gdd_range[1])

    if not phase_order:
        return []

    # 2. Build PhaseDefinition for each phase
    definitions: list[PhaseDefinition] = []
    for i, pk in enumerate(phase_order):
        cfg = phases_config.get(pk, {})
        if not isinstance(cfg, dict):
            cfg = {}

        state_key = cfg.get("state_key", pk.upper())
        next_pk = phase_order[(i + 1) % len(phase_order)]
        next_cfg = phases_config.get(next_pk, {})
        next_state_key = next_cfg.get("state_key", next_pk.upper()) if isinstance(next_cfg, dict) else next_pk.upper()

        # Build exit condition: GDD threshold AND any extra conditions
        gdd_upper = phase_gdd_upper.get(pk)
        extra_conditions = cfg.get("exit_conditions", [])
        on_exit = cfg.get("on_exit")

        # First phase (dormancy): no GDD threshold, use only exit_conditions
        if i == 0:
            if extra_conditions:
                when_clause: dict = {"and": list(extra_conditions)} if len(extra_conditions) > 1 else extra_conditions[0]
            else:
                when_clause = {"var": "chill_satisfied", "eq": True}
        else:
            # GDD threshold from stades_bbch + extra conditions
            conditions: list[dict] = []
            if gdd_upper is not None:
                conditions.append({"var": "GDD_cumul", "gte": gdd_upper})
            conditions.extend(extra_conditions)

            if len(conditions) == 1:
                when_clause = conditions[0]
            elif conditions:
                when_clause = {"and": conditions}
            else:
                when_clause = {"var": "GDD_cumul", "gte": gdd_upper or 9999}

        exit_rule: dict = {
            "target": next_state_key,
            "when": when_clause,
            "confidence": "MODEREE",
        }
        if on_exit:
            exit_rule["on_enter"] = on_exit  # on_enter = actions when entering next phase

        definitions.append(PhaseDefinition(
            name=state_key,
            exits=[exit_rule],
            skip_when=cfg.get("skip_when"),
            entry_when=None,
        ))

    logger.info(
        "Built %d phase definitions from stades_bbch: %s",
        len(definitions),
        " → ".join(d.name for d in definitions),
    )
    return definitions


def extract_phase_config(
    reference_data: dict | None,
    maturity_phase: str | None = None,
) -> PhaseConfig:
    """Build PhaseConfig from ``stades_bbch`` + ``phases_config``.

    Extracts chill months (from stades_bbch repos phase) and active_phases
    (from protocole_phenologique.phases_par_maturite).
    """
    cfg = PhaseConfig()
    if not reference_data:
        return cfg

    phases_config = reference_data.get("phases_config", {})
    has_dormancy = isinstance(phases_config, dict) and "repos" in phases_config

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

    # Active phases per maturity stage — phase names come from referential directly.
    proto = reference_data.get("protocole_phenologique", {})
    if maturity_phase and isinstance(proto, dict):
        maturite_map = proto.get("phases_par_maturite")
        if isinstance(maturite_map, dict):
            phase_key = maturity_phase.lower()
            active_bbch = maturite_map.get(phase_key)
            if isinstance(active_bbch, list) and active_bbch:
                # Phase names in the referential are the state machine phase names
                active_state_phases = frozenset(
                    str(name).upper() for name in active_bbch
                )
                if active_state_phases:
                    cfg.active_phases = active_state_phases

    return cfg


def _resolve_variety_code(variety: str, reference_data: dict | None) -> str | None:
    """Resolve a variety display name to its referential code.

    Handles: exact code match, exact name match, case-insensitive name match.
    """
    if not reference_data:
        return None
    varietes = reference_data.get("varietes")
    if not isinstance(varietes, list):
        return None
    variety_lower = variety.strip().lower()
    for v in varietes:
        if not isinstance(v, dict):
            continue
        code = v.get("code", "")
        nom = v.get("nom", "")
        # Exact match on code
        if variety == code or variety_lower == code.lower():
            return code
        # Exact match on nom
        if variety_lower == nom.strip().lower():
            return code
        # Fuzzy match: strip last char for French/Spanish suffix differences
        # (Arbequine/Arbequina, Koroneïki/Koroneiki)
        nom_lower = nom.strip().lower()
        if len(variety_lower) >= 4 and len(nom_lower) >= 4:
            if variety_lower[:-1] == nom_lower[:-1]:
                return code
            # Prefix match (Picholine → Picholine Marocaine)
            if nom_lower.startswith(variety_lower) or variety_lower.startswith(nom_lower):
                return code
    return None


def resolve_chill_threshold(
    variety: str | None,
    gdd_ref: dict | None,
    reference_data: dict | None = None,
) -> int:
    """Extract variety-specific chill threshold from referential GDD config.

    Looks up by variety code (from ``seuils_chill_units_par_variete``).
    Resolves variety display name → code via ``varietes`` array.
    Falls back to 150 if variety or referential is missing.
    """
    if not gdd_ref or not variety:
        return _DEFAULT_CHILL_THRESHOLD
    seuils = gdd_ref.get("seuils_chill_units_par_variete")
    if not isinstance(seuils, dict):
        return _DEFAULT_CHILL_THRESHOLD

    # Try direct lookup (variety is already a code)
    entry = seuils.get(variety)
    if isinstance(entry, (list, tuple)) and len(entry) >= 1:
        return int(entry[0])

    # Resolve name → code
    code = _resolve_variety_code(variety, reference_data)
    if code:
        entry = seuils.get(code)
        if isinstance(entry, (list, tuple)) and len(entry) >= 1:
            return int(entry[0])

    return _DEFAULT_CHILL_THRESHOLD


# ---------------------------------------------------------------------------
# State machine
# ---------------------------------------------------------------------------


_DEFAULT_PHASE_CYCLE_ORDER: list[str] = [
    "DORMANCE", "DEBOURREMENT", "FLORAISON", "NOUAISON",
    "STRESS_ESTIVAL", "REPRISE_AUTOMNALE",
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
        preliminary_formulas: dict[str, str] | None = None,
    ) -> None:
        self.tmoy_q25 = tmoy_q25
        self.cfg = config or PhaseConfig(chill_threshold=chill_threshold)
        self.chill_threshold = self.cfg.chill_threshold

        # Phase definitions — use provided or defaults
        phase_defs = phase_definitions if phase_definitions else _DEFAULT_PHASE_DEFINITIONS
        self.phases_by_name: dict[str, PhaseDefinition] = {
            pd.name: pd for pd in phase_defs
        }
        self.phase_order: list[str] = _phase_cycle_order_from_defs(phase_defs)

        # Referential formulas (calculs_preliminaires)
        self.preliminary_formulas: dict[str, str] = preliminary_formulas or {}

        # Peak/min tracking for derived signals (reset each cycle)
        self.ndvi_peak: float = 0.0
        self.nirv_peak: float = 0.0
        self.nirv_min_hist: float = float("inf")
        self.nirv_max_hist: float = float("-inf")

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

        # First and second phase names from definitions
        first_phase = self.phase_order[0] if self.phase_order else "DORMANCE"
        second_phase = self.phase_order[1] if len(self.phase_order) > 1 else first_phase

        # Determine initial phase: skip first phase if warm climate
        first_def = self.phases_by_name.get(first_phase)
        should_skip = skip_dormancy
        if not should_skip and first_def and first_def.skip_when:
            skip_ctx = {"Tmoy_Q25": tmoy_q25}
            should_skip = evaluate(first_def.skip_when, skip_ctx)

        if should_skip:
            self.current_phase = second_phase
            self.chill_satisfied = True
            self.transitions.append(PhaseTransition(
                phase=second_phase,
                start_date=date(2000, 1, 1),
                gdd_at_entry=0.0,
                confidence="MODEREE",
            ))
            self._phase_start_set = False
        else:
            self.current_phase = first_phase
            self.transitions.append(PhaseTransition(
                phase=first_phase,
                start_date=date(2000, 1, 1),
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

        # GDD accumulation (for all phases except the first/dormancy phase)
        if self.current_phase != self.phase_order[0]:
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
        phase_def = self.phases_by_name.get(self.current_phase)
        if phase_def:
            for exit_rule in phase_def.exits:
                matched = evaluate(exit_rule["when"], context)
                # Debug: log exit condition evaluation
                if signals.current_date.day == 1:  # log once per month to avoid spam
                    logger.debug(
                        "[%s] phase=%s → %s | match=%s | GDD=%.1f chill=%.0f Tmoy=%.1f NDVI=%s streaks=%s",
                        signals.current_date, self.current_phase,
                        exit_rule["target"], matched,
                        self.gdd_cumul, self.chill_cumul, signals.tmoy,
                        f"{signals.ndvi:.3f}" if signals.ndvi is not None else "—",
                        {k: v for k, v in self.streak_counters.items() if v > 0},
                    )
                if matched:
                    target_phase = exit_rule["target"]
                    confidence = exit_rule.get("confidence", "MODEREE")

                    # Handle on_enter actions (e.g., reset GDD)
                    on_enter = exit_rule.get("on_enter", {})
                    if isinstance(on_enter, dict):
                        for var in on_enter.get("reset", []):
                            if var == "GDD_cumul":
                                self.gdd_cumul = 0.0

                    # Reset chill and peaks when entering first phase (dormancy)
                    if target_phase == self.phase_order[0]:
                        self.chill_cumul = 0.0
                        self.chill_satisfied = False
                        self.ndvi_peak = 0.0
                        self.nirv_peak = 0.0

                    # Reset all streak counters on transition (each phase
                    # evaluates its own exit conditions from a clean slate).
                    for k in self.streak_counters:
                        self.streak_counters[k] = 0

                    self._transition_to(target_phase, signals, confidence)
                    break

    def _build_context(self, signals: DailySignals) -> dict:
        """Build the full context dict for condition evaluation.

        Includes raw weather, satellite derivatives, accumulations, streaks,
        and computed preliminary signals from the referential.
        """
        # Update peak/min tracking
        if signals.ndvi is not None:
            self.ndvi_peak = max(self.ndvi_peak, signals.ndvi)
        if signals.nirv is not None:
            self.nirv_peak = max(self.nirv_peak, signals.nirv)
            self.nirv_min_hist = min(self.nirv_min_hist, signals.nirv)
            self.nirv_max_hist = max(self.nirv_max_hist, signals.nirv)

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
            # Peak/cycle tracking (for calculs_preliminaires)
            "NDVI_pic_cycle": self.ndvi_peak,
            "NIRv_pic_cycle": self.nirv_peak,
            "NIRvP_min_hist": self.nirv_min_hist if self.nirv_min_hist != float("inf") else 0.0,
            "NIRvP_max_hist": self.nirv_max_hist if self.nirv_max_hist != float("-inf") else 1.0,
        }
        # Satellite derivatives
        if signals.d_nirv_dt is not None:
            ctx["d_nirv_dt"] = signals.d_nirv_dt
        if signals.d_ndvi_dt is not None:
            ctx["d_ndvi_dt"] = signals.d_ndvi_dt
        if signals.nirv is not None:
            ctx["NIRv"] = signals.nirv
            ctx["NIRvP"] = signals.nirv  # alias for formulas
            ctx["NIRv_actuel"] = signals.nirv
        if signals.ndvi is not None:
            ctx["NDVI"] = signals.ndvi
            ctx["NDVI_actuel"] = signals.ndvi

        # GDD formula params (used by calculs_preliminaires GDD_jour formula)
        ctx["Tbase"] = getattr(self, '_gdd_tbase', 7.5)
        ctx["Tplafond"] = getattr(self, '_gdd_tupper', 30.0)

        # Streak counters
        ctx.update(self.streak_counters)

        # Compute referential calculs_preliminaires formulas
        if self.preliminary_formulas:
            derived = compute_preliminary_signals(self.preliminary_formulas, ctx)
            ctx.update(derived)

        return ctx

    def _resolve_target_phase(self, requested: str) -> tuple[str, str]:
        """Resolve the actual target phase, skipping inactive phases.

        When ``active_phases`` is set in the config, any phase not in the set
        is skipped — the machine advances to the next allowed phase in cycle
        order.  Returns (resolved_phase, confidence_adjustment).
        """
        active = self.cfg.active_phases
        if active is None or requested in active:
            return requested, ""

        # Find the next active phase after the requested one in cycle order
        try:
            idx = self.phase_order.index(requested)
        except ValueError:
            return requested, ""

        for i in range(1, len(self.phase_order)):
            candidate = self.phase_order[(idx + i) % len(self.phase_order)]
            if candidate in active:
                return candidate, "FAIBLE"
        return requested, ""

    def _transition_to(self, new_phase: str, signals: DailySignals,
                       confidence: str = "MODEREE") -> None:
        """Record a phase transition, skipping phases not in active_phases."""
        resolved, conf_override = self._resolve_target_phase(new_phase)
        if conf_override:
            confidence = conf_override

        logger.info(
            "TRANSITION [%s] %s → %s | GDD=%.1f chill=%.0f/%s Tmoy=%.1f",
            signals.current_date, self.current_phase, resolved,
            self.gdd_cumul, self.chill_cumul,
            "satisfied" if self.chill_satisfied else "pending",
            signals.tmoy,
        )

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
        wd = WeatherRowAccessor(w)
        tmoys.append(wd.temp_mean)
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
    """Run the referential-driven phenology state machine for any crop.

    Single source of truth architecture:
    - ``stades_bbch``: phase order (``phase_kc``), GDD thresholds (``gdd_cumul``),
      cycle months (``mois``).
    - ``phases_config``: non-GDD exit conditions, skip logic, reset actions.
    - ``signaux.streaks``: streak definitions for condition evaluation.
    - ``protocole_phenologique.calculs_preliminaires``: derived signal formulas.

    No crop-specific hardcoding. Adding a new crop = adding its referential JSON.

    Process
    -------
    1. Extract ``PhaseConfig`` (chill months from stades_bbch repos phase,
       active phases from ``protocole_phenologique.phases_par_maturite``).
    2. Resolve variety-specific chill threshold from ``gdd.seuils_chill_units_par_variete``.
    3. Build ``PhaseDefinition`` list from ``stades_bbch`` GDD ranges +
       ``phases_config`` exit conditions.  GDD threshold = upper bound of
       each phase's ``gdd_cumul`` range.  Non-GDD conditions ANDed with it.
    4. Load ``calculs_preliminaires`` formulas — evaluated daily via
       ``FormulaEvaluator`` and injected into condition context.
    5. Read GDD params (tbase, tupper) from ``gdd``.
    6. Determine cycle boundaries from ``stades_bbch`` month ranges.
    7. Group daily weather by cycle year.
    8. For each cycle year with ≥ 120 days, run ``CropPhaseStateMachine``.
    9. Collect ``SeasonTimeline`` per cycle.

    Args:
        weather_days: Daily weather records (temp_max/temperature_max,
                      temp_min/temperature_min, precip/precipitation_sum).
                      Field aliases handled by ``WeatherRowAccessor``.
        nirv_series: NIRv satellite series ``[{"date": "YYYY-MM-DD", "value": float}]``.
        ndvi_series: NDVI satellite series (same format).
        crop_type: Canonical crop type key (e.g. ``"olivier"``, ``"agrumes"``).
        variety: Variety name for variety-specific chill thresholds.
        reference_data: Parsed referential JSON dict.  Pass ``None`` to fall
                        back to built-in olive defaults.
        maturity_phase: Tree maturity phase (``JUVENILE``, ``PLEINE_PRODUCTION``,
                        etc.).  Controls which phases are active — juvenile trees
                        may skip fruiting phases if ``phases_par_maturite`` defines it.

    Returns:
        List of ``SeasonTimeline`` objects, one per complete agronomic cycle year.
    """
    if not weather_days:
        return []

    # All thresholds from referential — no crop-specific hardcoding below this line.
    cfg = extract_phase_config(reference_data, maturity_phase=maturity_phase)
    gdd_ref = reference_data.get("gdd") if reference_data else None
    cfg.chill_threshold = resolve_chill_threshold(variety, gdd_ref, reference_data)

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
        logger.info(
            "CYCLE %d: %d weather days, Tmoy_Q25=%.1f, skip_dormancy=%s",
            year, len(year_weather), cycle_tmoy_q25,
            "yes" if cycle_tmoy_q25 >= 15 else "no",
        )

        # Load calculs_preliminaires formulas from referential
        prelim_formulas: dict[str, str] = {}
        if reference_data:
            proto = reference_data.get("protocole_phenologique")
            if isinstance(proto, dict):
                raw = proto.get("calculs_preliminaires", {})
                if isinstance(raw, dict):
                    prelim_formulas = {k: v for k, v in raw.items() if isinstance(v, str)}

        # Create state machine for this year
        machine = CropPhaseStateMachine(
            tmoy_q25=cycle_tmoy_q25,
            config=cfg,
            phase_definitions=phase_defs,
            streak_definitions=streak_defs,
            preliminary_formulas=prelim_formulas,
        )
        machine._gdd_tbase = gdd_tbase
        machine._gdd_tupper = gdd_tupper

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


def _find_transition(transitions: list[PhaseTransition], phase: str) -> PhaseTransition | None:
    for t in transitions:
        if t.phase == phase:
            return t
    return None


def _find_transition_after(
    transitions: list[PhaseTransition],
    phase: str,
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
    debourrement = _find_transition(transitions, "DEBOURREMENT")
    floraison = _find_transition(transitions, "FLORAISON")
    nouaison = _find_transition(transitions, "NOUAISON")

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
        "DORMANCE",
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
    phase_map = {
        "dormancy_exit": "DEBOURREMENT",
        "plateau_start": "FLORAISON",
        "peak": "FLORAISON",
        "decline_start": "NOUAISON",
    }
    if stage in phase_map:
        t = _find_transition(transitions, phase_map[stage])
        return t.gdd_at_entry if t else None

    if stage == "dormancy_entry":
        debourrement = _find_transition(transitions, "DEBOURREMENT")
        if debourrement:
            dormance_return = _find_transition_after(
                transitions, "DORMANCE", debourrement.start_date
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
                            "phase": t.phase if isinstance(t.phase, str) else t.phase.value,
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
                    "phase": t.phase if isinstance(t.phase, str) else t.phase.value,
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
