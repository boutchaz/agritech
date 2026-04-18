┌─────────────────────────────────────────────────────────────────────────────┐                                         
   │                    CALIBRATION FLOW — AS BUILT                              │                                         
   │                                                                             │                                         
   │  TRIGGER: User clicks "Start Calibration" on a parcel                      │                                          
   │                                                                             │                                         
   │  ┌───────────────────────────────────────────────────────────┐              │                                         
   │  │  NESTJS ORCHESTRATOR (calibration.service.ts)             │              │                                         
   │  │                                                           │              │                                         
   │  │  1. READINESS CHECK                                       │              │                                         
   │  │     • crop_type set? (REQUIRED)                           │              │                                         
   │  │     • planting_year set? (REQUIRED)                       │              │                                         
   │  │     • variety, irrigation, water_source? (WARNING only)   │              │                                         
   │  │     • satellite images count (WARNING if <10)             │              │                                         
   │  │     • soil/water/foliar analyses? (WARNING only)          │              │                                         
   │  │     • harvest records count (WARNING only)                │              │                                         
   │  │     → confidence_preview score                            │              │                                         
   │  │     → Never blocks on missing analyses                    │              │                                         
   │  │                                                           │              │                                         
   │  │  2. STATE MACHINE                                         │              │                                         
   │  │     previous_phase → "calibrating"                        │              │                                         
   │  │     Insert calibration row (status: in_progress)          │              │                                         
   │  │                                                           │              │                                         
   │  │  3. BACKGROUND EXECUTION (10min timeout)                  │              │                                         
   │  │     Parallel data fetch:                                  │              │                                         
   │  │       • satellite_indices_data (from Supabase)            │              │                                         
   │  │       • weather_daily_data (from Supabase)                │              │                                         
   │  │       • analyses (soil/water/plant)                       │              │                                         
   │  │       • harvest records                                   │              │                                         
   │  │       • crop reference (crop_ai_references table)         │              │                                         
   │  │                                                           │              │                                         
   │  │     Auto-sync if missing:                                 │              │                                         
   │  │       • No satellite? → syncParcelSatelliteData()         │              │                                         
   │  │       • No weather? → syncWeatherData()                   │              │                                         
   │  │                                                           │              │                                         
   │  │     Extract NDVI raster pixels (per-pixel for zones)      │              │                                         
   │  │     Pre-compute GDD if missing                            │              │                                         
   │  │                                                           │              │                                         
   │  │  4. CALL FASTAPI: POST /calibration/v2/run                │              │                                         
   │  │     Sends: calibration_input + satellite_images +         │              │                                         
   │  │            weather_rows + ndvi_raster_pixels              │              │                                         
   │  └───────────────────────┬───────────────────────────────────┘              │                                         
   │                          │                                                  │                                         
   │                          ▼                                                  │                                         
   │  ┌───────────────────────────────────────────────────────────┐              │                                         
   │  │  FASTAPI CALIBRATION ENGINE (orchestrator.py)             │              │                                         
   │  │                                                           │              │                                         
   │  │  Step 0: MATURITY PHASE                                   │              │                                         
   │  │    • age = current_year - planting_year                   │              │                                         
   │  │    • Match variety to referential varietes[].nom/code     │              │                                         
   │  │    • Check yield curve for "declin"/"arrachage" labels    │              │                                         
   │  │    • Classify: juvenile/entree/pleine/maturite/senescence │              │                                         
   │  │    • Calculate threshold adjustment multiplier            │              │                                         
   │  │      (juvenile=0.75, pleine=1.0, senescence=0.85)         │              │                                         
   │  │                                                           │              │                                         
   │  │  Step 1: SATELLITE EXTRACTION                             │              │                                         
   │  │    • Filter by cloud coverage (<20%)                      │              │                                         
   │  │    • 8 indices: NDVI, NIRv, NDMI, NDRE, EVI, MSAVI,      │              │                                          
   │  │      MSI, GCI                                             │              │                                         
   │  │    • Interpolate gaps ≤15 days (linear)                   │              │                                         
   │  │    • Mark outliers (>3σ)                                  │              │                                         
   │  │    ❌ NO SCL pixel filtering (doc says SCL∈{4,5})         │              │                                         
   │  │    ❌ NO buffer négatif 10m                               │              │                                         
   │  │    ❌ NO Whittaker/Savitzky-Golay smoothing               │              │                                         
   │  │    ❌ NO 30% plausibility filter                          │              │                                         
   │  │                                                           │              │                                         
   │  │  Step 2: WEATHER EXTRACTION                               │              │                                         
   │  │    • Daily: tmin, tmax, precip, et0, wind                 │              │                                         
   │  │    • Monthly aggregates (precip, GDD)                     │              │                                         
   │  │    • Cumulative GDD (simple: (tmax+tmin)/2 - tbase)       │              │                                         
   │  │    • Chill hours estimate (winter months 11,12,1,2)       │              │                                         
   │  │    • Extreme events: frost, heatwave (3d>38°C),           │              │                                         
   │  │      drought (30d dry), high wind (>60km/h)               │              │                                         
   │  │    ❌ NO chill-heating model (De Melo-Abreu)              │              │                                         
   │  │    ❌ NO double-condition activation (thermal+satellite)  │              │                                         
   │  │    ❌ NO GDD capping at 30°C                              │              │                                         
   │  │    ❌ NO per-variety chill unit thresholds                 │              │                                        
   │  │                                                           │              │                                         
   │  │  Step 3: PERCENTILE CALCULATION                           │              │                                         
   │  │    • Global percentiles per index (P10-P90 + mean + std)  │              │                                         
   │  │    • Period percentiles IF >24 months data                │              │                                         
   │  │    • Periods from referential stades_bbch if available    │              │                                         
   │  │    • Falls back to fixed periods (Dec-Feb, Mar-May, etc.) │              │                                         
   │  │    ❌ NO referential guard-rail comparison                │              │                                         
   │  │    ❌ NO "block if percentiles outside referential"       │              │                                         
   │  │                                                           │              │                                         
   │  │  Step 4: PHENOLOGY DETECTION                              │              │                                         
   │  │    • Resolve key index from referential (indice_cle)      │              │                                         
   │  │    • Group by cycle year from stades_bbch                 │              │                                         
   │  │    • Find stages: dormancy_exit, peak, plateau,           │              │                                         
   │  │      decline, dormancy_entry                              │              │                                         
   │  │    • Calculate GDD correlation and variability            │              │                                         
   │  │    ❌ NOT the Protocole Phénologique state machine         │              │                                        
   │  │    ❌ NO signal classification (PUR/MIXTE/DOMINÉ)         │              │                                         
   │  │    ❌ NO 7 specialized alerts                             │              │                                         
   │  │    ❌ NO discrimination olivier/adventices                │              │                                         
   │  │                                                           │              │                                         
   │  │  Step 5: ANOMALY DETECTION                                │              │                                         
   │  │    • Sudden drops >25% between consecutive points         │              │                                         
   │  │    • Progressive decline (3 consecutive decreasing)       │              │                                         
   │  │    • Statistical outliers (>2σ)                           │              │                                         
   │  │    • Trend breaks (early vs late third)                   │              │                                         
   │  │    • Below referential alerte threshold                   │              │                                         
   │  │    • Prolonged stagnation (<0.01 std over 8 points)       │              │                                         
   │  │    ❌ NO triple confirmation rule (météo+sat+user)        │              │                                         
   │  │    ❌ NO exclusion from percentile recalculation          │              │                                         
   │  │    ❌ NO regime change detection                          │              │                                         
   │  │                                                           │              │                                         
   │  │  Step 6: YIELD POTENTIAL                                  │              │                                         
   │  │    • Match variety by nom/code (case-insensitive)         │              │                                         
   │  │    • Look up age bracket in rendement_kg_arbre            │              │                                         
   │  │    • Cross with historical harvest avg if available       │              │                                         
   │  │    • Olive alternance detection (NDVI yearly means)       │              │                                         
   │  │      ON year: max×1.3, OFF year: min×0.7                 │              │                                          
   │  │    ❌ NO NIRvP cumulated Apr-Sep as yield proxy           │              │                                         
   │  │    ❌ NO multi-variable weighted model                    │              │                                         
   │  │    ❌ NO precision windows (post-flowering ±40%, etc.)    │              │                                         
   │  │                                                           │              │                                         
   │  │  Step 7: ZONE DETECTION                                   │              │                                         
   │  │    • Classify pixels into A-E classes using percentiles   │              │                                         
   │  │    • Pattern type: uniform/clustered/mixed                │              │                                         
   │  │    • Uses real raster pixels if available,                │              │                                         
   │  │      falls back to single-pixel median                   │              │                                          
   │  │    ⚠ NO spatial adjacency analysis (just pixel counting) │              │                                          
   │  │                                                           │              │                                         
   │  │  Step 8: HEALTH SCORE                                     │              │                                         
   │  │    • Vigor: rolling median NDVI vs percentiles (30%)      │              │                                         
   │  │    • Temporal stability: NDVI CV proxy (20%)              │              │                                         
   │  │    • Stability: 100 - anomaly_count×8 (15%)              │              │                                          
   │  │    • Hydric: rolling median NDMI vs percentiles (20%)     │              │                                         
   │  │    • Nutritional: NDRE vs percentiles (15%)               │              │                                         
   │  │    ⚠ Weights differ from doc (doc: 30/20/15/20/15 ✓)     │              │                                          
   │  │                                                           │              │                                         
   │  │  CONFIDENCE SCORE                                         │              │                                         
   │  │    • satellite: 5-30 pts (by months)                      │              │                                         
   │  │    • soil: 0-20 pts (completeness + age)                  │              │                                         
   │  │    • water: 0-15 pts                                      │              │                                         
   │  │    • yield: 0-20 pts (by years)                           │              │                                         
   │  │    • profile: 0-10 pts (crop/variety/year/system/boundary)│              │                                         
   │  │    • irrigation: 0-10 pts                                 │              │                                         
   │  │    • coherence: 0-5 pts                                   │              │                                         
   │  │    • Total: /110, normalized to 0-1                       │              │                                         
   │  │    ⚠ Different structure from doc (doc: 25+75=100)        │              │                                         
   │  └───────────────────────┬───────────────────────────────────┘              │                                         
   │                          │                                                  │                                         
   │                          ▼                                                  │                                         
   │  ┌───────────────────────────────────────────────────────────┐              │                                         
   │  │  BACK IN NESTJS — POST-CALIBRATION                        │              │                                         
   │  │                                                           │              │                                         
   │  │  5. SAVE RESULTS                                          │              │                                         
   │  │     • Update calibration row with all computed values      │              │                                        
   │  │     • baseline_ndvi/ndre/ndmi, confidence, zone, health   │              │                                         
   │  │     • yield_potential_min/max, maturity_phase              │              │                                        
   │  │                                                           │              │                                         
   │  │  6. BILINGUAL AI REPORT                                   │              │                                         
   │  │     • Send v2 output to LLM (calibration prompt)          │              │                                         
   │  │     • Generate FR + AR reports in parallel                 │              │                                        
   │  │     • Store as rapport_fr / rapport_ar                    │              │                                         
   │  │                                                           │              │                                         
   │  │  7. PHASE TRANSITION                                      │              │                                         
   │  │     calibrating → awaiting_validation                     │              │                                         
   │  │     If auto-activate: → active                            │              │                                         
   │  │     Set ai_calibration_id on parcel                       │              │                                         
   │  │     If low confidence: ai_observation_only = true         │              │                                         
   │  │                                                           │              │                                         
   │  │  8. POST-ACTIVATION                                       │              │                                         
   │  │     • Generate AI diagnostics report                      │              │                                         
   │  │     • Generate AI recommendations                         │              │                                         
   │  │     • Ensure annual plan                                  │              │                                         
   │  │     • Send notifications                                  │              │                                         
   │  └───────────────────────────────────────────────────────────┘              │                                         
   └─────────────────────────────────────────────────────────────────────────────┘                                         
 ```                                                                                                                       
                                                                                                                           
 Key gap summary — what the doc specifies vs what's built:                                                                 
                                                                                                                           
 ┌──────────────────┬──────────────────────────────────────────────────┬─────────────────────────────────────────────────┐ 
 │ Area             │ Doc Spec                                         │ Code Reality                                    │ 
 ├──────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────┤ 
 │ Satellite        │ SCL mask, buffer négatif, Whittaker smoothing,   │ Cloud % filter + 3σ outlier + linear            │ 
 │ filtering        │ 30% plausibility                                 │ interpolation                                   │ 
 ├──────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────┤ 
 │ GDD model        │ Chill-heating 2-phase, capped at 30°C, double    │ Simple (tmax+tmin)/2 - tbase, no capping, no    │ 
 │                  │ activation condition                             │ activation gate                                 │ 
 ├──────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────┤ 
 │ Percentiles      │ By phenological period, guard-rail validation    │ Global + period (if >24mo), no guard-rail       │ 
 │                  │ against referential                              │ checks                                          │ 
 ├──────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────┤ 
 │ Phenology        │ 6-phase state machine with signal                │ Min/max/plateau curve fitting, 5 stages, no     │ 
 │                  │ classification, 7 alerts                         │ state machine                                   │ 
 ├──────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────┤ 
 │ Anomaly          │ Triple confirmation rule (météo+satellite+user), │ Statistical detection only (drops, σ, trends),  │ 
 │ detection        │ regime changes                                   │ no user confirmation                            │ 
 ├──────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────┤ 
 │ Yield model      │ Multi-variable weighted (NIRvP, alternance,      │ Referential bracket + harvest avg + alternance  │ 
 │                  │ deficit, chill, frost)                           │ (NDVI only)                                     │ 
 ├──────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────┤ 
 │ Confidence       │ 25 (satellite) + 75 (user data) = 100 pts        │ 30+20+15+20+10+10+5 = 110 pts, normalized       │ 
 ├──────────────────┼──────────────────────────────────────────────────┼─────────────────────────────────────────────────┤ 
 │ Anomaly          │ Exclude confirmed anomalies from percentile      │ Flags anomalies but doesn't recalculate         │ 
 │ exclusion        │ recalculation                                    │ percentiles                                     │ 
 └──────────────────┴──────────────────────────────────────────────────┴─────────────────────────────────────────────────┘ 
                                                                                                                           
 The calibration engine works end-to-end and produces usable results, but it's a simplified implementation of what the     
 v2.0 document specifies. The biggest structural gaps are the GDD model (no chill-heating), the phenology detection (curve 
 fitting vs state machine), and the anomaly handling (no triple confirmation or percentile recalculation).      