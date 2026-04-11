# Spec: State Machine Core

## Phase transitions

### GIVEN daily weather + satellite data for a full olive cycle year
### WHEN the state machine processes the data chronologically
### THEN it produces a phase timeline with transition dates and GDD values

### GIVEN winter temperatures that accumulate enough chill hours (≥ variety lower bound)
### AND daily mean temperature exceeds Tmoy_Q25 for ≥ 10 consecutive days
### WHEN the state machine is in PHASE_0 (DORMANCE)
### THEN it transitions to PHASE_1 (DEBOURREMENT) and resets GDD_cumul to 0

### GIVEN GDD_cumul ≥ 350 AND Tmoy ≥ 18
### WHEN the state machine is in PHASE_1 (DEBOURREMENT)
### THEN it transitions to PHASE_2 (FLORAISON)

### GIVEN GDD_cumul > 700 OR Tmoy > 25 sustained
### WHEN the state machine is in PHASE_2 (FLORAISON)
### THEN it transitions to PHASE_3 (NOUAISON)

### GIVEN Tmax > 30 recurring AND dry conditions (Precip_30j < 5)
### WHEN the state machine is in PHASE_3 (NOUAISON)
### THEN it transitions to PHASE_4 (STRESS_ESTIVAL)

### GIVEN precipitation episode > 20mm AND Tmoy < 25 AND dNIRv_dt > 0
### WHEN the state machine is in PHASE_4 (STRESS_ESTIVAL)
### THEN it transitions to PHASE_6 (REPRISE_AUTOMNALE)

### GIVEN Tmoy < Tmoy_Q25 AND NIRvP_norm < 0.15 (or temp-only when NIRvP unavailable)
### WHEN the state machine is in PHASE_4 or PHASE_6
### THEN it transitions back to PHASE_0 (DORMANCE)

## Warm climate handling

### GIVEN Tmoy_Q25 ≥ 15 for the historical weather data
### WHEN starting a new cycle
### THEN skip PHASE_0 entirely and start at PHASE_1

## Variety-specific chill

### GIVEN variety = "Arbequina" with chill range [200, 400]
### WHEN chill accumulation reaches 200 hours
### THEN chill is considered satisfied (lower bound used as threshold)

### GIVEN variety = "Picholine Marocaine" with chill range [100, 200]
### WHEN chill accumulation reaches 100 hours
### THEN chill is considered satisfied

## Data gaps

### GIVEN satellite data with gaps (no NIRv value for some days)
### WHEN evaluating satellite-dependent conditions (dNIRv_dt, NIRvP_norm)
### THEN use last known satellite value or skip satellite conditions for that day

### GIVEN a cycle year with < 120 days of data
### WHEN processing yearly stages
### THEN skip that year entirely (do not emit stages)
