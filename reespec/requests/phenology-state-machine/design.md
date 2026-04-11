# Phenology State Machine — Design

## Architecture

### State machine vs. curve fitting

The current step4 processes an entire year of data at once and fits stages to signal shape (argmax, argmin, threshold crossings). The new approach processes data **chronologically, day by day**, maintaining state and transitioning when referential conditions are met.

```
Current (curve fitting):           New (state machine):
                                   
  NIRv series ──► smooth           daily_weather ──┐
                    │               satellite ─────┤
                    ▼                               ▼
              find peak/trough     ┌──────────────────────────┐
                    │              │  PhaseStateMachine        │
                    ▼              │                           │
              5 stage dates        │  state: PHASE_0           │
                                   │  gdd_cumul: 0             │
                                   │  chill_cumul: 0           │
                                   │                           │
                                   │  for each day:            │
                                   │    compute signals        │
                                   │    check transitions      │
                                   │    emit phase change      │
                                   └──────────────────────────┘
                                              │
                                              ▼
                                   per-season phase timeline
                                   + mapped to Step4Output
```

### File structure

```
backend-service/app/services/calibration/
├── step4_phenology_detection.py      # Entry point — dispatches to state machine or legacy
├── step4_state_machine.py            # NEW — OlivePhaseStateMachine
└── step4_legacy.py                   # MOVED — current curve-fitting code (fallback)
```

### Phase definitions (from referential)

```
PHASE_0: DORMANCE           — Tmoy < Tmoy_Q25, NIRvP_norm < 0.15
PHASE_1: DEBOURREMENT       — exit dormancy, GDD accumulates
PHASE_2: FLORAISON          — GDD ≥ 350, Tmoy ≥ 18
PHASE_3: NOUAISON           — GDD > 700 or Tmoy > 25
PHASE_4: STRESS_ESTIVAL     — signal_pur, Tmax > 30
PHASE_6: REPRISE_AUTOMNALE  — Precip > 20, Tmoy < 25, dNIRv > 0
```

### Key design decisions

**1. Chill threshold: use lower bound of variety range**

The referential gives ranges (e.g., Arbequina: [200, 400]). Use the **lower bound** as the threshold — once met, the tree CAN break dormancy. The upper bound represents the point where dormancy is FULLY satisfied; using it as threshold would be too conservative.

**2. NIRvP unavailability: degrade gracefully**

NIRvP requires PAR data (ERA5). When unavailable:
- PHASE_0 entry condition: skip the `NIRvP_norm < 0.15` check, rely on `Tmoy < Tmoy_Q25` alone
- NIRvP_norm calculations: skip, set to None
- This is acceptable because temperature is the primary driver for olive dormancy

**3. Warm climate skip (Tmoy_Q25 ≥ 15)**

The referential says: "SI Tmoy_Q25 >= 15 → PAS_DE_DORMANCE_MARQUEE — passer directement à Phase 1". This means:
- Compute Tmoy_Q25 from all available daily weather
- If ≥ 15°C, skip PHASE_0 entirely, start at PHASE_1
- GDD_cumul starts at 0 from the beginning of the cycle
- Chill tracking still runs but is informational only

**4. Step4Output backward compatibility**

The state machine produces richer output (6 phases with dates, confidence, GDD). Map to existing `Step4Output`:

```
State machine phase      →  PhenologyDates field
─────────────────────────────────────────────────
PHASE_0→1 transition     →  dormancy_exit
PHASE_1→2 transition     →  plateau_start  (debourrement end ≈ flowering start)
PHASE_2 peak GDD point   →  peak
PHASE_2→3 transition     →  decline_start  (flowering end)
PHASE_4 entry or last    →  dormancy_entry
```

**5. Incomplete seasons**

If a cycle year has < 120 days of data, skip it (don't force the state machine through incomplete data). If the state machine doesn't complete a full cycle (e.g., stops at PHASE_2), emit transitions found so far and mark missing stages with the last known date.

**6. Per-season output**

Following the referential's `sortie_par_saison`, each season produces:
- `phase_timeline`: list of (phase_id, start_date, end_date, gdd_at_entry)
- `confiance`: per-phase confidence level
- `mode`: NORMAL or AMORCAGE (< 3 complete cycles)

This is stored in an extended `Step4Output` field and forwarded to the review adapter.

### Input signals computed per day

From `calculs_preliminaires`:
- `GDD_jour`: max(0, (min(Tmax, 30) + max(Tmin, 7.5)) / 2 - 7.5)
- `Tmoy`: (Tmax + Tmin) / 2
- `dNIRv_dt`: (NIRv(t) - NIRv(t-1)) / days_between
- `dNDVI_dt`: (NDVI(t) - NDVI(t-1)) / days_between
- `Precip_30j`: sum of precipitation over last 30 days
- `Tmax_30j_pct`: % of last 30 days where Tmax > 30

### Risks

- **Data gaps**: satellite data has gaps (clouds). The state machine must tolerate missing NIRv/NDVI on some days — use last known value or skip satellite conditions.
- **GDD reset timing**: the referential says "GDD_cumul = 0 quand dormance se termine". Must align with the chill-gate reset in gdd_service.py.
- **Test coverage**: the state machine has many transition paths. Need thorough tests with realistic Moroccan climate data.
