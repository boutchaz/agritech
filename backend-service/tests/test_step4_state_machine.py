"""Tests for the olive phenology state machine (step4)."""
from __future__ import annotations

import math
from datetime import date, timedelta
from importlib import import_module
from pathlib import Path
from unittest.mock import patch

sm = import_module("app.services.calibration.pipeline.s4_state_machine")

OlivePhase = getattr(sm, "OlivePhase")
PhaseTransition = getattr(sm, "PhaseTransition")
SeasonTimeline = getattr(sm, "SeasonTimeline")
compute_daily_signals = getattr(sm, "compute_daily_signals")
DailySignals = getattr(sm, "DailySignals")
OlivePhaseStateMachine = getattr(sm, "OlivePhaseStateMachine")


def _load_olive_referential() -> dict:
    import json

    path = Path(__file__).resolve().parents[2] / "agritech-api" / "referentials" / "DATA_OLIVIER.json"
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def test_olive_phase_enum_values() -> None:
    assert OlivePhase.DORMANCE.value == "DORMANCE"
    assert OlivePhase.DEBOURREMENT.value == "DEBOURREMENT"
    assert OlivePhase.FLORAISON.value == "FLORAISON"
    assert OlivePhase.NOUAISON.value == "NOUAISON"
    assert OlivePhase.STRESS_ESTIVAL.value == "STRESS_ESTIVAL"
    assert OlivePhase.REPRISE_AUTOMNALE.value == "REPRISE_AUTOMNALE"


def test_phase_transition_fields() -> None:
    from datetime import date

    t = PhaseTransition(
        phase=OlivePhase.DORMANCE,
        start_date=date(2024, 12, 1),
        end_date=date(2025, 2, 15),
        gdd_at_entry=0.0,
        confidence="ELEVEE",
    )
    assert t.phase == OlivePhase.DORMANCE
    assert t.start_date.year == 2024
    assert t.confidence == "ELEVEE"


def test_season_timeline_fields() -> None:
    tl = SeasonTimeline(year=2025, transitions=[], mode="NORMAL")
    assert tl.year == 2025
    assert tl.mode == "NORMAL"
    assert tl.transitions == []


# ---------------------------------------------------------------------------
# Task 3: Daily signal computation
# ---------------------------------------------------------------------------


def _make_weather(d: date, tmax: float, tmin: float, precip: float = 0.0) -> dict:
    return {"date": d, "temp_max": tmax, "temp_min": tmin, "precip": precip}


def test_compute_daily_signals_gdd_and_tmoy() -> None:
    """GDD_jour = max(0, (min(Tmax,30) + max(Tmin,7.5))/2 - 7.5)."""
    d = date(2025, 4, 15)
    weather = _make_weather(d, tmax=25.0, tmin=10.0)
    # GDD = (min(25,30) + max(10,7.5)) / 2 - 7.5 = (25+10)/2 - 7.5 = 10.0
    # Tmoy = (25+10)/2 = 17.5
    signals = compute_daily_signals(
        current_date=d,
        weather_day=weather,
        weather_history_30d=[weather],
        satellite_nirv=None,
        satellite_ndvi=None,
        prev_nirv=None,
        prev_ndvi=None,
        days_since_prev_satellite=1,
    )
    assert signals.gdd_jour == 10.0
    assert signals.tmoy == 17.5
    assert signals.tmax == 25.0


def test_compute_daily_signals_gdd_cap_at_30() -> None:
    """Tmax capped at 30 for GDD."""
    d = date(2025, 7, 15)
    weather = _make_weather(d, tmax=40.0, tmin=20.0)
    # GDD = (min(40,30) + max(20,7.5)) / 2 - 7.5 = (30+20)/2 - 7.5 = 17.5
    signals = compute_daily_signals(
        current_date=d,
        weather_day=weather,
        weather_history_30d=[weather],
        satellite_nirv=None,
        satellite_ndvi=None,
        prev_nirv=None,
        prev_ndvi=None,
        days_since_prev_satellite=1,
    )
    assert signals.gdd_jour == 17.5


def test_compute_daily_signals_precip_30j() -> None:
    """Precip_30j sums precipitation over the 30-day history."""
    d = date(2025, 3, 1)
    history = [
        _make_weather(d - timedelta(days=i), 20.0, 10.0, precip=2.0)
        for i in range(30)
    ]
    signals = compute_daily_signals(
        current_date=d,
        weather_day=history[0],
        weather_history_30d=history,
        satellite_nirv=None,
        satellite_ndvi=None,
        prev_nirv=None,
        prev_ndvi=None,
        days_since_prev_satellite=1,
    )
    assert signals.precip_30j == 60.0  # 30 days × 2mm


def test_compute_daily_signals_derivatives() -> None:
    """dNIRv_dt and dNDVI_dt computed from current vs prev values."""
    d = date(2025, 4, 15)
    weather = _make_weather(d, 20.0, 10.0)
    signals = compute_daily_signals(
        current_date=d,
        weather_day=weather,
        weather_history_30d=[weather],
        satellite_nirv=0.15,
        satellite_ndvi=0.40,
        prev_nirv=0.10,
        prev_ndvi=0.35,
        days_since_prev_satellite=5,
    )
    # dNIRv_dt = (0.15 - 0.10) / 5 = 0.01
    assert abs(signals.d_nirv_dt - 0.01) < 1e-6
    # dNDVI_dt = (0.40 - 0.35) / 5 = 0.01
    assert abs(signals.d_ndvi_dt - 0.01) < 1e-6


# ---------------------------------------------------------------------------
# Task 4: PHASE_0 (DORMANCE) entry and exit
# ---------------------------------------------------------------------------


def _make_signals(d: date, tmoy: float, tmax: float = 20.0, tmin: float = 5.0,
                  gdd: float = 0.0, precip_30j: float = 0.0,
                  d_nirv_dt: float | None = None) -> DailySignals:
    return DailySignals(
        current_date=d, tmax=tmax, tmin=tmin, tmoy=tmoy,
        gdd_jour=gdd, precip=0.0, precip_30j=precip_30j,
        tmax_30j_pct=0.0, d_nirv_dt=d_nirv_dt,
    )


def test_dormancy_exit_on_warm_streak() -> None:
    """Machine transitions from PHASE_0 to PHASE_1 after 10 consecutive warm days
    once chill is satisfied."""
    machine = OlivePhaseStateMachine(
        tmoy_q25=10.0,
        chill_threshold=50,  # low threshold for test
    )
    assert machine.current_phase == OlivePhase.DORMANCE

    base = date(2024, 12, 1)

    # Feed 30 cold days (Tmoy=5 < Q25=10) with some chill accumulation.
    # With sinusoidal model: tmax=12, tmin=-2 → several hours < 7.2 per day.
    # We'll just set chill directly via the signals — the machine tracks chill
    # from estimate_chill_hours(tmax, tmin).
    for i in range(30):
        sig = _make_signals(base + timedelta(days=i), tmoy=5.0, tmax=12.0, tmin=-2.0)
        machine.process_day(sig)

    assert machine.current_phase == OlivePhase.DORMANCE
    assert machine.chill_cumul > 0  # some chill accumulated

    # Feed 12 warm days (Tmoy=12 > Q25=10).  After 10 consecutive, should transition.
    for i in range(12):
        sig = _make_signals(base + timedelta(days=30 + i), tmoy=12.0, tmax=18.0, tmin=6.0, gdd=3.0)
        machine.process_day(sig)

    assert machine.current_phase == OlivePhase.DEBOURREMENT
    # GDD resets to 0 at transition, then accumulates for remaining days in DEBOURREMENT
    assert machine.transitions[1].gdd_at_entry == 0.0  # reset on transition
    # Should have transitioned on day 40 (30 cold + 10 warm)
    assert len(machine.transitions) == 2  # DORMANCE + DEBOURREMENT
    assert machine.transitions[1].phase == OlivePhase.DEBOURREMENT


# ---------------------------------------------------------------------------
# Task 5: Warm climate skip
# ---------------------------------------------------------------------------


def test_warm_climate_skips_dormancy() -> None:
    """When Tmoy_Q25 >= 15, machine starts at DEBOURREMENT, never enters DORMANCE."""
    machine = OlivePhaseStateMachine(tmoy_q25=16.0, chill_threshold=150)
    assert machine.current_phase == OlivePhase.DEBOURREMENT
    assert machine.transitions[0].phase == OlivePhase.DEBOURREMENT

    # Feed some days — should stay in DEBOURREMENT (accumulating GDD), not go to DORMANCE
    base = date(2025, 1, 1)
    for i in range(20):
        sig = _make_signals(base + timedelta(days=i), tmoy=18.0, tmax=25.0, tmin=11.0, gdd=6.0)
        machine.process_day(sig)

    # Should still be in DEBOURREMENT (or beyond), never DORMANCE
    assert machine.current_phase != OlivePhase.DORMANCE
    # Should have started accumulating GDD
    assert machine.gdd_cumul > 0


# ---------------------------------------------------------------------------
# Task 6: Variety-specific chill thresholds
# ---------------------------------------------------------------------------

_OLIVE_GDD_REF = {
    "tbase_c": 7.5,
    "plafond_c": 30,
    "seuils_chill_units_par_variete": {
        "Picholine Marocaine": [100, 200],
        "Arbequina": [200, 400],
        "Picual": [400, 600],
    },
}


def test_arbequina_chill_threshold_200() -> None:
    """Arbequina uses lower bound 200 as chill threshold."""
    resolve = getattr(sm, "resolve_chill_threshold")
    assert resolve("Arbequina", _OLIVE_GDD_REF) == 200


def test_picholine_chill_threshold_100() -> None:
    """Picholine Marocaine uses lower bound 100."""
    resolve = getattr(sm, "resolve_chill_threshold")
    assert resolve("Picholine Marocaine", _OLIVE_GDD_REF) == 100


def test_unknown_variety_falls_back_to_150() -> None:
    """Unknown variety falls back to 150."""
    resolve = getattr(sm, "resolve_chill_threshold")
    assert resolve("UnknownVariety", _OLIVE_GDD_REF) == 150


def test_no_gdd_ref_falls_back_to_150() -> None:
    """No gdd reference data falls back to 150."""
    resolve = getattr(sm, "resolve_chill_threshold")
    assert resolve("Arbequina", None) == 150


# ---------------------------------------------------------------------------
# Task 7: PHASE_1→2 (DEBOURREMENT → FLORAISON)
# ---------------------------------------------------------------------------


def test_debourrement_to_floraison_at_gdd_350() -> None:
    """Transition to FLORAISON when GDD_cumul >= 350 and Tmoy >= 18."""
    machine = OlivePhaseStateMachine(tmoy_q25=16.0)  # warm → skip dormancy
    assert machine.current_phase == OlivePhase.DEBOURREMENT

    base = date(2025, 3, 1)
    # Feed days with GDD ~10/day, Tmoy=20 → should transition around day 35
    for i in range(40):
        sig = _make_signals(
            base + timedelta(days=i),
            tmoy=20.0, tmax=28.0, tmin=12.0,
            gdd=10.0,  # ~10 GDD/day → 350 at day 35
        )
        machine.process_day(sig)

    assert machine.current_phase == OlivePhase.FLORAISON
    floraison = [t for t in machine.transitions if t.phase == OlivePhase.FLORAISON]
    assert len(floraison) == 1
    assert floraison[0].gdd_at_entry >= 350.0


def test_debourrement_stays_if_tmoy_below_18() -> None:
    """No transition if GDD >= 350 but Tmoy < 18."""
    machine = OlivePhaseStateMachine(tmoy_q25=16.0)
    base = date(2025, 3, 1)
    # GDD accumulates but Tmoy stays at 15 (< 18)
    for i in range(50):
        sig = _make_signals(
            base + timedelta(days=i),
            tmoy=15.0, tmax=22.0, tmin=8.0,
            gdd=10.0,
        )
        machine.process_day(sig)

    # GDD > 350 but Tmoy < 18 → should stay in DEBOURREMENT
    assert machine.current_phase == OlivePhase.DEBOURREMENT


# ---------------------------------------------------------------------------
# Task 8: PHASE_2→3 (FLORAISON → NOUAISON)
# ---------------------------------------------------------------------------


def _get_machine_in_floraison() -> tuple[OlivePhaseStateMachine, date]:
    """Helper: create a machine already in FLORAISON with GDD ~400."""
    machine = OlivePhaseStateMachine(tmoy_q25=16.0)
    base = date(2025, 3, 1)
    # Push through DEBOURREMENT: 36 days × 10 GDD at Tmoy=20
    for i in range(36):
        sig = _make_signals(base + timedelta(days=i), tmoy=20.0, tmax=28.0, tmin=12.0, gdd=10.0)
        machine.process_day(sig)
    assert machine.current_phase == OlivePhase.FLORAISON
    return machine, base + timedelta(days=36)


def test_floraison_to_nouaison_at_gdd_700() -> None:
    """Transition to NOUAISON when GDD_cumul > 700."""
    machine, base = _get_machine_in_floraison()
    # Continue feeding: need ~300 more GDD to reach 700 → 30 days × 10
    for i in range(35):
        sig = _make_signals(base + timedelta(days=i), tmoy=22.0, tmax=30.0, tmin=14.0, gdd=10.0)
        machine.process_day(sig)

    assert machine.current_phase == OlivePhase.NOUAISON
    nouaison = [t for t in machine.transitions if t.phase == OlivePhase.NOUAISON]
    assert len(nouaison) == 1
    assert nouaison[0].gdd_at_entry > 700.0


def test_floraison_to_nouaison_on_sustained_heat() -> None:
    """Transition to NOUAISON when Tmoy > 25 for ≥ 5 consecutive days."""
    machine, base = _get_machine_in_floraison()
    # Feed 6 hot days (Tmoy > 25) with moderate GDD (not reaching 700)
    for i in range(6):
        sig = _make_signals(base + timedelta(days=i), tmoy=27.0, tmax=35.0, tmin=19.0, gdd=8.0)
        machine.process_day(sig)

    assert machine.current_phase == OlivePhase.NOUAISON


# ---------------------------------------------------------------------------
# Task 9: PHASE_3→4 (NOUAISON → STRESS_ESTIVAL)
# ---------------------------------------------------------------------------


def _get_machine_in_nouaison() -> tuple[OlivePhaseStateMachine, date]:
    """Helper: machine in NOUAISON."""
    machine, base = _get_machine_in_floraison()
    # Push through FLORAISON: need GDD > 700, currently at ~360, so ~35 more days × 10
    for i in range(36):
        sig = _make_signals(base + timedelta(days=i), tmoy=22.0, tmax=30.0, tmin=14.0, gdd=10.0)
        machine.process_day(sig)
    assert machine.current_phase == OlivePhase.NOUAISON
    return machine, base + timedelta(days=36)


def test_nouaison_to_stress_estival() -> None:
    """Transition to STRESS_ESTIVAL on hot + dry conditions."""
    machine, base = _get_machine_in_nouaison()
    # Feed hot dry days: Tmax > 30, Precip_30j < 5, for several days
    for i in range(10):
        sig = _make_signals(
            base + timedelta(days=i),
            tmoy=32.0, tmax=38.0, tmin=22.0,
            gdd=12.0, precip_30j=2.0,
        )
        machine.process_day(sig)

    assert machine.current_phase == OlivePhase.STRESS_ESTIVAL


# ---------------------------------------------------------------------------
# Task 10: PHASE_4→6 and PHASE_6→0
# ---------------------------------------------------------------------------


def _get_machine_in_stress() -> tuple[OlivePhaseStateMachine, date]:
    """Helper: machine in STRESS_ESTIVAL."""
    machine, base = _get_machine_in_nouaison()
    # Push through NOUAISON: hot+dry days
    for i in range(5):
        sig = _make_signals(
            base + timedelta(days=i),
            tmoy=32.0, tmax=38.0, tmin=22.0,
            gdd=12.0, precip_30j=2.0,
        )
        machine.process_day(sig)
    assert machine.current_phase == OlivePhase.STRESS_ESTIVAL
    return machine, base + timedelta(days=5)


def test_stress_to_reprise_on_rain() -> None:
    """Transition to REPRISE_AUTOMNALE on rain + cooling + NIRv rise."""
    machine, base = _get_machine_in_stress()
    # Feed rainy cool days with positive dNIRv
    for i in range(5):
        sig = _make_signals(
            base + timedelta(days=i),
            tmoy=20.0, tmax=26.0, tmin=14.0,
            gdd=5.0, precip_30j=30.0,
            d_nirv_dt=0.005,
        )
        machine.process_day(sig)

    assert machine.current_phase == OlivePhase.REPRISE_AUTOMNALE


def test_reprise_to_dormance_on_cold() -> None:
    """Transition back to DORMANCE when Tmoy drops below Q25."""
    machine, base = _get_machine_in_stress()
    # First go to REPRISE
    for i in range(5):
        sig = _make_signals(
            base + timedelta(days=i),
            tmoy=20.0, tmax=26.0, tmin=14.0,
            gdd=5.0, precip_30j=30.0,
            d_nirv_dt=0.005,
        )
        machine.process_day(sig)
    assert machine.current_phase == OlivePhase.REPRISE_AUTOMNALE

    # Now feed cold days (Tmoy < Q25=16) for sustained period
    base2 = base + timedelta(days=5)
    for i in range(12):
        sig = _make_signals(
            base2 + timedelta(days=i),
            tmoy=8.0, tmax=14.0, tmin=2.0,
            gdd=0.0,
        )
        machine.process_day(sig)

    assert machine.current_phase == OlivePhase.DORMANCE


def test_stress_direct_to_dormance_on_winter() -> None:
    """PHASE_4 can go directly to DORMANCE if no autumn rain (skip REPRISE)."""
    machine, base = _get_machine_in_stress()
    # Feed cold dry days — no rain episode, just getting cold
    for i in range(12):
        sig = _make_signals(
            base + timedelta(days=i),
            tmoy=8.0, tmax=14.0, tmin=2.0,
            gdd=0.0, precip_30j=3.0,
        )
        machine.process_day(sig)

    assert machine.current_phase == OlivePhase.DORMANCE


# ---------------------------------------------------------------------------
# Referential config extraction
# ---------------------------------------------------------------------------

extract_phase_config = getattr(sm, "extract_phase_config")
PhaseConfig = getattr(sm, "PhaseConfig")


def test_extract_phase_config_from_olive_referential() -> None:
    """Config extracted from real olive referential matches protocole values."""
    ref = _load_olive_referential()
    cfg = extract_phase_config(ref)
    assert cfg.warm_skip_tmoy_q25 == 15.0
    assert cfg.warm_streak_days == 10
    assert cfg.gdd_debourrement_exit == 350.0
    assert cfg.gdd_floraison_exit == 700.0
    assert cfg.tmoy_floraison_min == 18.0
    assert cfg.tmoy_heat_sustained == 25.0
    assert cfg.tmax_stress_threshold == 30.0
    assert cfg.precip_dry_threshold == 5.0
    assert cfg.precip_reprise_threshold == 20.0
    assert cfg.tmoy_reprise_max == 25.0
    assert cfg.dormancy_nirvp_norm_max == 0.15


def test_extract_phase_config_without_referential() -> None:
    """Defaults used when no referential is provided."""
    cfg = extract_phase_config(None)
    assert cfg.warm_streak_days == 10
    assert cfg.gdd_debourrement_exit == 350.0
    assert cfg.gdd_floraison_exit == 700.0


def test_extract_phase_config_parses_custom_protocol_strings() -> None:
    cfg = extract_phase_config(
        {
            "protocole_phenologique": {
                "phases": {
                    "PHASE_0": {
                        "verification_prealable": "SI Tmoy_Q25 >= 13.5",
                        "condition_entree": "Tmoy < Tmoy_Q25 ET NIRvP_norm < 0.12",
                        "condition_sortie": {
                            "condition": "Tmoy > Tmoy_Q25 durablement (≥ 7 jours consécutifs)"
                        },
                    },
                    "PHASE_1": {
                        "condition_sortie": {
                            "condition": "GDD_cumul >= 280 ET Tmoy >= 17"
                        }
                    },
                    "PHASE_2": {
                        "condition_sortie": {
                            "condition": "GDD_cumul > 620 OU Tmoy > 24 pendant ≥ 4 jours"
                        }
                    },
                    "PHASE_3": {
                        "clarification": "Tmax_30j_pct > 65 ET Precip_30j < 8",
                        "condition_sortie": {
                            "condition": "etat_signal = SIGNAL_PUR ET Tmax > 33 pendant ≥ 2 jours"
                        },
                    },
                    "PHASE_4": {
                        "condition_sortie_reprise": {
                            "condition": "Precip_episode > 18 ET Tmoy < 22 ET dNIRv_dt > 0"
                        },
                        "condition_sortie_dormance": {
                            "condition": "Tmoy < Tmoy_Q25 ET Tmoy_Q25 < 13.5 ET NIRvP_norm < 0.12"
                        },
                    },
                    "PHASE_6": {
                        "condition_maintien": "Precip_recentes > 18 ET Tmoy < 22 ET dNIRv_dt > 0"
                    },
                }
            }
        }
    )

    assert cfg.warm_skip_tmoy_q25 == 13.5
    assert cfg.warm_streak_days == 7
    assert cfg.gdd_debourrement_exit == 280.0
    assert cfg.tmoy_floraison_min == 17.0
    assert cfg.gdd_floraison_exit == 620.0
    assert cfg.tmoy_heat_sustained == 24.0
    assert cfg.heat_sustained_days == 4
    assert cfg.precip_dry_threshold == 8.0
    assert cfg.tmax_stress_threshold == 33.0
    assert cfg.hot_dry_streak_days == 2
    assert cfg.precip_reprise_threshold == 18.0
    assert cfg.tmoy_reprise_max == 22.0
    assert cfg.dormancy_nirvp_norm_max == 0.12


# ---------------------------------------------------------------------------
# Task 11: Full-season run
# ---------------------------------------------------------------------------

run_olive_state_machine = getattr(sm, "run_olive_state_machine")


def _make_morocco_weather_year() -> list[dict]:
    """Generate a realistic 12-month daily weather dataset for Morocco olive country.

    Pattern: cold winter (Dec-Feb), warm spring (Mar-May),
    hot dry summer (Jun-Sep), autumn rain (Oct-Nov).
    """
    from datetime import date, timedelta
    rows = []
    base = date(2024, 12, 1)  # start of olive cycle year 2025
    for day_offset in range(365):
        d = base + timedelta(days=day_offset)
        month = d.month
        # Temperature pattern
        if month in (12, 1, 2):  # winter
            tmin, tmax, precip = 3.0, 16.0, 2.0
        elif month in (3, 4):  # early spring
            tmin, tmax, precip = 8.0, 22.0, 1.5
        elif month == 5:  # late spring
            tmin, tmax, precip = 12.0, 28.0, 0.5
        elif month in (6, 7, 8):  # summer
            tmin, tmax, precip = 18.0, 38.0, 0.0
        elif month == 9:  # late summer
            tmin, tmax, precip = 16.0, 34.0, 0.5
        elif month in (10, 11):  # autumn
            tmin, tmax, precip = 10.0, 24.0, 3.0
        else:
            tmin, tmax, precip = 5.0, 18.0, 2.0
        rows.append({
            "date": d,
            "temp_min": tmin,
            "temp_max": tmax,
            "precip": precip,
        })
    return rows


def _make_nirv_series_year() -> list[dict]:
    """Generate NIRv satellite observations (~every 5 days) for a year."""
    from datetime import date, timedelta
    series = []
    base = date(2024, 12, 1)
    for day_offset in range(0, 365, 5):
        d = base + timedelta(days=day_offset)
        month = d.month
        # NIRv follows vegetation vigor
        if month in (12, 1, 2):
            v = 0.06
        elif month in (3, 4):
            v = 0.10
        elif month == 5:
            v = 0.14
        elif month in (6, 7, 8):
            v = 0.08
        elif month in (9, 10):
            v = 0.07
        else:
            v = 0.09  # autumn reprise
        series.append({"date": d.isoformat(), "value": v})
    return series


def test_full_season_produces_timeline() -> None:
    """A full Moroccan olive year produces a SeasonTimeline with ≥ 4 phases."""
    ref = _load_olive_referential()

    weather = _make_morocco_weather_year()
    nirv = _make_nirv_series_year()

    timelines = run_olive_state_machine(
        weather_days=weather,
        nirv_series=nirv,
        ndvi_series=[],
        variety="Arbequina",
        reference_data=ref,
    )

    assert len(timelines) >= 1
    tl = timelines[0]
    assert isinstance(tl, SeasonTimeline)
    assert len(tl.transitions) >= 4  # at least DORMANCE→DEBOURREMENT→FLORAISON→NOUAISON→...

    # Each transition should have valid dates
    for t in tl.transitions:
        assert t.start_date is not None
        assert isinstance(t.phase, OlivePhase)

    # Check chronological order
    for i in range(1, len(tl.transitions)):
        assert tl.transitions[i].start_date >= tl.transitions[i - 1].start_date


def test_run_state_machine_uses_cycle_local_tmoy_q25() -> None:
    """Each cycle year should use its own temperature baseline."""
    captured_tmoy_q25: list[float] = []

    class FakeMachine:
        def __init__(self, tmoy_q25: float, **kwargs) -> None:
            _ = kwargs
            captured_tmoy_q25.append(tmoy_q25)
            self.transitions = [
                PhaseTransition(
                    phase=OlivePhase.DORMANCE,
                    start_date=date(2000, 1, 1),
                    confidence="ELEVEE",
                )
            ]

        def process_day(self, signals) -> None:
            if self.transitions[0].start_date == date(2000, 1, 1):
                self.transitions[0].start_date = signals.current_date

    weather_days: list[dict] = []

    cold_base = date(2023, 12, 1)
    for i in range(365):
        d = cold_base + timedelta(days=i)
        weather_days.append(
            {"date": d, "temp_min": 2.0, "temp_max": 12.0, "precip": 1.0}
        )

    warm_base = date(2024, 12, 1)
    for i in range(365):
        d = warm_base + timedelta(days=i)
        weather_days.append(
            {"date": d, "temp_min": 14.0, "temp_max": 28.0, "precip": 0.5}
        )

    with patch.object(sm, "CropPhaseStateMachine", FakeMachine):
        timelines = run_olive_state_machine(
            weather_days=weather_days,
            nirv_series=[],
            ndvi_series=[],
            reference_data=None,
        )

    assert len(timelines) == 2
    assert len(captured_tmoy_q25) == 2
    assert captured_tmoy_q25[0] < captured_tmoy_q25[1]
    assert captured_tmoy_q25[0] == 7.0
    assert captured_tmoy_q25[1] == 21.0


# ---------------------------------------------------------------------------
# Task 12: Map SeasonTimeline to Step4Output
# ---------------------------------------------------------------------------

map_timelines_to_step4output = getattr(sm, "map_timelines_to_step4output")


def test_timeline_maps_to_step4output() -> None:
    """A full SeasonTimeline maps to valid Step4Output with reasonable date gaps."""
    ref = _load_olive_referential()

    weather = _make_morocco_weather_year()
    nirv = _make_nirv_series_year()

    timelines = run_olive_state_machine(
        weather_days=weather,
        nirv_series=nirv,
        ndvi_series=[],
        variety="Arbequina",
        reference_data=ref,
    )

    output = map_timelines_to_step4output(timelines, cumulative_gdd={})

    # Should produce valid Step4Output
    from app.services.calibration.types import Step4Output
    assert isinstance(output, Step4Output)

    # Dates should be populated
    assert output.mean_dates.dormancy_exit is not None
    assert output.mean_dates.peak is not None
    assert output.status in {"ok", "degraded"}

    # Date gaps should be reasonable (≥ 14 days between exit and peak)
    exit_to_peak = (output.mean_dates.peak - output.mean_dates.dormancy_exit).days
    assert exit_to_peak >= 14, f"exit_to_peak={exit_to_peak} days, expected >= 14"

    if output.mean_dates.dormancy_entry is None:
        assert "dormancy_entry" in output.missing_stages

    # phase_timeline should be populated
    assert output.phase_timeline is not None
    assert len(output.phase_timeline) >= 1

    # referential_cycle_used should be True
    assert output.referential_cycle_used is True


# ---------------------------------------------------------------------------
# Task 13: Dispatcher wiring
# ---------------------------------------------------------------------------

detect_phenology_mod = import_module("app.services.calibration.pipeline.s4_phenology_detection")
detect_phenology = getattr(detect_phenology_mod, "detect_phenology")


def _make_step1_step2(weather: list[dict], nirv: list[dict]):
    """Build minimal Step1Output and Step2Output for testing."""
    from app.services.calibration.types import (
        Step1Output, Step2Output, IndexTimePoint, WeatherDay,
        MonthlyWeatherAggregate, ExtremeEvent,
    )
    # Build Step1Output
    nirv_points = []
    for entry in nirv:
        d = date.fromisoformat(str(entry["date"])[:10])
        nirv_points.append(IndexTimePoint(date=d, value=entry["value"]))
    step1 = Step1Output(
        index_time_series={"NIRv": nirv_points, "NDVI": nirv_points},
        cloud_coverage_mean=10.0,
        filtered_image_count=len(nirv_points),
        outlier_count=0,
        interpolated_dates=[],
        raster_paths={},
    )
    # Build Step2Output
    daily = []
    for w in weather:
        d = w["date"] if isinstance(w["date"], date) else date.fromisoformat(str(w["date"])[:10])
        daily.append(WeatherDay(
            date=d, temp_min=w["temp_min"], temp_max=w["temp_max"],
            precip=w.get("precip", 0.0), et0=0.0,
        ))
    step2 = Step2Output(
        daily_weather=daily,
        monthly_aggregates=[],
        cumulative_gdd={},
        chill_hours=0.0,
        extreme_events=[],
    )
    return step1, step2


def test_detect_phenology_uses_state_machine_for_olive() -> None:
    """With olive referential, detect_phenology uses state machine → phase_timeline populated."""
    ref = _load_olive_referential()

    weather = _make_morocco_weather_year()
    nirv = _make_nirv_series_year()
    step1, step2 = _make_step1_step2(weather, nirv)

    output = detect_phenology(
        step1, step2,
        crop_type="olivier",
        variety="Arbequina",
        reference_data=ref,
    )
    assert output.phase_timeline is not None
    assert len(output.phase_timeline) >= 1
    assert output.referential_cycle_used is True


def test_detect_phenology_uses_state_machine_for_all_crops() -> None:
    """State machine is used for all crops, including those without protocole_phenologique."""
    weather = _make_morocco_weather_year()
    nirv = _make_nirv_series_year()
    step1, step2 = _make_step1_step2(weather, nirv)

    output = detect_phenology(
        step1, step2,
        crop_type="agrumes",
        reference_data={},  # no protocole_phenologique — state machine still runs
    )
    # State machine always populates phase_timeline (never None).
    assert output.phase_timeline is not None


def test_detect_phenology_filters_interpolated_and_outlier_points_for_state_machine() -> None:
    from app.services.calibration.types import PhenologyDates, Step1Output, Step2Output

    captured: dict[str, object] = {}
    step1 = Step1Output.model_validate(
        {
            "index_time_series": {
                "NIRv": [
                    {
                        "date": "2024-01-15",
                        "value": 0.10,
                        "outlier": False,
                        "interpolated": False,
                    },
                    {
                        "date": "2024-02-15",
                        "value": 0.95,
                        "outlier": False,
                        "interpolated": True,
                    },
                    {
                        "date": "2024-03-15",
                        "value": 0.01,
                        "outlier": True,
                        "interpolated": False,
                    },
                    {
                        "date": "2024-04-15",
                        "value": 0.20,
                        "outlier": False,
                        "interpolated": False,
                    },
                ],
                "NDVI": [
                    {
                        "date": "2024-01-15",
                        "value": 0.30,
                        "outlier": False,
                        "interpolated": False,
                    },
                    {
                        "date": "2024-02-15",
                        "value": 0.99,
                        "outlier": False,
                        "interpolated": True,
                    },
                    {
                        "date": "2024-03-15",
                        "value": 0.02,
                        "outlier": True,
                        "interpolated": False,
                    },
                    {
                        "date": "2024-04-15",
                        "value": 0.40,
                        "outlier": False,
                        "interpolated": False,
                    },
                ],
            },
            "cloud_coverage_mean": 5.0,
            "filtered_image_count": 4,
            "outlier_count": 1,
            "interpolated_dates": ["2024-02-15"],
            "raster_paths": {"NIRv": [], "NDVI": []},
        }
    )
    step2 = Step2Output.model_validate(
        {
            "daily_weather": [],
            "monthly_aggregates": [],
            "cumulative_gdd": {},
            "chill_hours": 0.0,
            "extreme_events": [],
        }
    )

    def _fake_state_machine(**kwargs):
        captured["nirv_series"] = kwargs["nirv_series"]
        captured["ndvi_series"] = kwargs["ndvi_series"]
        return []

    stub_output = getattr(
        import_module("app.services.calibration.types"),
        "Step4Output",
    )(
        mean_dates=PhenologyDates(
            dormancy_exit=date(2024, 1, 1),
            peak=date(2024, 2, 1),
            plateau_start=date(2024, 1, 15),
            decline_start=date(2024, 3, 1),
            dormancy_entry=date(2024, 4, 1),
        ),
        yearly_stages={},
        inter_annual_variability_days={},
        gdd_correlation={},
        referential_cycle_used=True,
        phase_timeline=[],
    )

    with (
        patch.object(detect_phenology_mod, "run_state_machine", side_effect=_fake_state_machine),
        patch.object(detect_phenology_mod, "map_timelines_to_step4output", return_value=stub_output),
    ):
        detect_phenology(
            step1,
            step2,
            crop_type="olivier",
            reference_data={"protocole_phenologique": {"phases": {"PHASE_0": {}}}},
        )

    assert captured["nirv_series"] == [
        {"date": "2024-01-15", "value": 0.1},
        {"date": "2024-04-15", "value": 0.2},
    ]
    assert captured["ndvi_series"] == [
        {"date": "2024-01-15", "value": 0.3},
        {"date": "2024-04-15", "value": 0.4},
    ]




# ---------------------------------------------------------------------------
# Task 14: Integration test — mejjat parcel data shape
# ---------------------------------------------------------------------------


def test_mejjat_parcel_shape() -> None:
    """Realistic data shaped like the mejjat parcel (Arbequina, warm Morocco).

    - 568 NIRv points Apr 2024–Mar 2026 (monotonic growth, juvenile tree)
    - 1091 weather days
    - Warm climate → skip dormancy
    - 2026 cycle year truncated (< 120 days) → should be skipped
    - No yearly stage should have exit-to-peak gap < 14 days
    """
    ref = _load_olive_referential()

    # Build weather: Apr 2023 – Mar 2026 (~1091 days)
    weather = []
    base = date(2023, 4, 1)
    for i in range(1091):
        d = base + timedelta(days=i)
        month = d.month
        if month in (12, 1, 2):
            tmin, tmax, precip = 5.0, 18.0, 1.5
        elif month in (3, 4, 5):
            tmin, tmax, precip = 10.0, 25.0, 1.0
        elif month in (6, 7, 8):
            tmin, tmax, precip = 20.0, 38.0, 0.0
        elif month in (9, 10):
            tmin, tmax, precip = 15.0, 30.0, 0.5
        else:
            tmin, tmax, precip = 8.0, 22.0, 2.5
        weather.append({"date": d, "temp_min": tmin, "temp_max": tmax, "precip": precip})

    # Build NIRv: ~every 5 days, monotonically increasing (juvenile tree)
    nirv = []
    sat_base = date(2024, 4, 10)
    for i in range(0, 720, 5):  # ~144 points = ~568/4 indices
        d = sat_base + timedelta(days=i)
        # Monotonic growth: 0.05 → 0.33 over 2 years
        progress = i / 720
        v = 0.05 + 0.28 * progress
        nirv.append({"date": d.isoformat(), "value": round(v, 4)})

    step1, step2 = _make_step1_step2(weather, nirv)

    output = detect_phenology(
        step1, step2,
        crop_type="olivier",
        variety="Arbequina",
        reference_data=ref,
    )

    # Should use state machine
    assert output.phase_timeline is not None
    assert output.referential_cycle_used is True

    # Check yearly_stages
    for year_key, stages in output.yearly_stages.items():
        exit_to_peak = (stages.peak - stages.dormancy_exit).days
        assert exit_to_peak >= 14, (
            f"Year {year_key}: exit_to_peak={exit_to_peak} days (expected >= 14)"
        )
        if stages.dormancy_entry is not None:
            exit_to_entry = (stages.dormancy_entry - stages.dormancy_exit).days
            assert exit_to_entry >= 60, (
                f"Year {year_key}: exit_to_entry={exit_to_entry} days (expected >= 60)"
            )

    # Phase timeline should have at least DEBOURREMENT and STRESS for some year
    all_phases = set()
    for tl_entry in output.phase_timeline:
        for t in tl_entry.get("transitions", []):
            all_phases.add(t["phase"])

    assert "DEBOURREMENT" in all_phases, f"Missing DEBOURREMENT, got: {all_phases}"
    assert "STRESS_ESTIVAL" in all_phases, f"Missing STRESS_ESTIVAL, got: {all_phases}"
