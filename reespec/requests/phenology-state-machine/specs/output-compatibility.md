# Spec: Output Compatibility

## Step4Output backward compatibility

### GIVEN the state machine produces a phase timeline for a cycle year
### WHEN mapping to Step4Output.yearly_stages
### THEN PhenologyDates fields are populated:
  - dormancy_exit = PHASE_0→1 transition date (or cycle start if no dormancy)
  - plateau_start = PHASE_1→2 transition date
  - peak = midpoint of PHASE_2 (FLORAISON) or PHASE_2→3 transition
  - decline_start = PHASE_2→3 transition date
  - dormancy_entry = PHASE_4 start or PHASE_6→0 transition date

### GIVEN multiple cycle years with valid stages
### WHEN computing mean_dates
### THEN each field is the day-of-year average across all valid years, mapped to the earliest year

### GIVEN the state machine output
### WHEN computing inter_annual_variability_days
### THEN each field is the population standard deviation of day-of-year across years

### GIVEN the state machine output with GDD at each transition
### WHEN computing gdd_correlation
### THEN correlate day-of-year with GDD-at-transition across years (np.corrcoef)

## Extended output

### GIVEN a completed state machine run
### WHEN producing Step4Output
### THEN include a new `phase_timeline` field with per-season data:
  - phase_id (DORMANCE, DEBOURREMENT, FLORAISON, etc.)
  - start_date, end_date
  - gdd_at_entry
  - confidence (ELEVEE, MODEREE, FAIBLE, TRES_FAIBLE)
  - mode (NORMAL or AMORCAGE if < 3 complete cycles)

## Fallback for non-olive crops

### GIVEN crop_type != "olivier" or reference_data without protocole_phenologique
### WHEN detect_phenology is called
### THEN use the legacy signal-based detection (current step4 code)
