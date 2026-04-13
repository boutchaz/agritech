# Spec: State Machine Driven by Condition Engine

## Phase transitions use evaluate()

GIVEN olive referential with structured phases (DORMANCE exit: chill_satisfied AND warm_streak >= 10)
AND weather context with chill_satisfied=true, warm_streak=12
WHEN state machine processes day in DORMANCE phase
THEN transitions to DEBOURREMENT

GIVEN same referential
AND weather context with chill_satisfied=true, warm_streak=5
WHEN state machine processes day in DORMANCE phase
THEN stays in DORMANCE (warm_streak < 10)

## Multiple exit rules evaluated in priority order

GIVEN STRESS_ESTIVAL phase with two exits:
  [0] target=REPRISE_AUTOMNALE when: precip_30j > 20 AND Tmoy < 25 AND d_nirv_dt > 0
  [1] target=DORMANCE when: cold_streak >= 10
AND context with precip_30j=25, Tmoy=22, d_nirv_dt=0.01, cold_streak=15
WHEN state machine processes day
THEN transitions to REPRISE_AUTOMNALE (first exit wins)

GIVEN same phase
AND context with precip_30j=5, Tmoy=10, d_nirv_dt=-0.01, cold_streak=15
WHEN state machine processes day
THEN transitions to DORMANCE (first exit fails, second matches)

## Phase skip_when

GIVEN DORMANCE phase with skip_when: Tmoy_Q25 >= 15
AND cycle Tmoy_Q25 = 16
WHEN state machine initializes
THEN starts in DEBOURREMENT (skips DORMANCE)

GIVEN DORMANCE phase with skip_when: Tmoy_Q25 >= 15
AND cycle Tmoy_Q25 = 12
WHEN state machine initializes
THEN starts in DORMANCE (skip condition not met)

## Streak computation from signaux.streaks

GIVEN referential signaux.streaks: hot_streak = {"var": "Tmoy", "gt": 25}
AND 5 consecutive days with Tmoy = [26, 27, 26, 28, 27]
WHEN signal layer processes these days
THEN context.hot_streak = 5 after the 5th day

GIVEN same streak definition
AND days with Tmoy = [26, 27, 20, 28, 27]
WHEN signal layer processes these days
THEN context.hot_streak = 2 after the 5th day (reset on day 3)

## Streak with compound condition

GIVEN referential signaux.streaks: hot_dry_streak = {"and": [{"var": "Tmax", "gt": 30}, {"var": "precip_30j", "lt": 5}]}
AND 3 consecutive days: Tmax=[32,33,31], precip_30j=[3,3,3]
WHEN signal layer processes these days
THEN context.hot_dry_streak = 3

GIVEN same streak definition
AND 3 consecutive days: Tmax=[32,33,28], precip_30j=[3,3,3]
WHEN signal layer processes these days
THEN context.hot_dry_streak = 0 (reset on day 3, Tmax < 30)

## Maturity phase filtering still works

GIVEN juvenile tree with phases_par_maturite excluding NOUAISON and STRESS_ESTIVAL
AND FLORAISON exit targeting NOUAISON
WHEN transition fires
THEN resolves to REPRISE_AUTOMNALE (next active phase in cycle order)

## GDD and chill accumulation unchanged

GIVEN weather day with Tmax=25, Tmin=10, tbase=7.5, tupper=30
WHEN signal layer computes
THEN GDD_cumul increases by max(0, (min(25,30) + max(10,7.5))/2 - 7.5) = 10.0

GIVEN weather day in chill month with Tmax=10, Tmin=2
WHEN signal layer computes
THEN chill_cumul increases by estimated chill hours (sinusoidal model)

## Full season produces timeline (integration)

GIVEN olive referential with all structured phases + signaux.streaks
AND 12 months of weather data covering one agronomic cycle
WHEN run_state_machine() completes
THEN returns SeasonTimeline with transitions through expected phases
AND each PhaseTransition has gdd_at_entry populated
AND map_timelines_to_step4output() produces valid Step4Output
