# Research Implementation Roadmap

> Implementation plan for agricultural research specifications from `docs/research/`
> Based on: referentiel_arboriculture.docx, ref_olivier_v2.docx, ref_avocatier_v2.docx, NIRv.docx, moteur_decisionnel_ia.docx

---

## Status: Phase 1 DONE — Phases 2-6 PLANNED

### Phase 1: Satellite Indices Foundation ✅ DONE
**Scope:** NIRv, EVI, NIRvP, PAR integration
**What was implemented:**
- NIRv = NDVI × NIR (all 3 providers: numpy, Earth Engine, CDSE)
- EVI = 2.5 × (NIR-Red) / (NIR+6Red-7.5Blue+1)
- NIRvP = NIRv × PAR (time-series only, not heatmaps)
- PAR fetch from Open-Meteo archive with Supabase cache
- PRI removed (not in research docs)
- Frontend: NIRv/EVI in heatmaps, NIRvP in time-series only
- Database: satellite_par_data table, updated CHECK constraints

---

### Phase 2: Meteorological Data Pipeline 🔜 NEXT
**Priority:** HIGH — Foundation for all subsequent phases
**Effort:** ~2-3 weeks
**Dependencies:** Phase 1

#### 2.1 ERA5 / Open-Meteo Weather Data Ingestion
- [ ] Daily weather data pipeline (temperature min/max/mean, humidity, precipitation, wind, SSRD)
- [ ] Source: Open-Meteo Historical API (ERA5 backend, free, CC-BY)
- [ ] Storage: New `weather_data` table (per location per day)
- [ ] Coordinate-based caching (same approach as PAR, ~1km grid)
- [ ] Backfill 3+ years of historical data per parcel

#### 2.2 Derived Meteorological Variables
- [ ] **ETP** (evapotranspiration) via Penman-Monteith or Hargreaves
- [ ] **GDD** (Growing Degree Days): `max(0, (Tmax+Tmin)/2 - Tbase)` cumulative
  - Tbase varies by crop: Olive=10°C, Citrus=13°C, Almond=4.5°C, Vine=10°C, Palm=18°C
- [ ] **Chill Hours**: Count hours T < 7.2°C during dormancy
  - Utah Model (weighted) and Dynamic Model (chill portions) as advanced options
- [ ] **Frost risk**: T_min < threshold (crop-specific)
- [ ] **Heat stress**: T_max > threshold (crop-specific)

#### 2.3 Weather Forecast Integration
- [ ] 7-day forecast from Open-Meteo Forecast API
- [ ] Store forecasts for application timing decisions
- [ ] Support for alert system (Phase 5)

**Database tables needed:**
```sql
weather_daily_data (location_lat, location_lon, date, t_min, t_max, t_mean, humidity, precipitation, wind_speed, ssrd, etp)
weather_derived_data (parcel_id, date, gdd_cumulative, chill_hours_cumulative, frost_risk, heat_stress)
weather_forecasts (location_lat, location_lon, forecast_date, target_date, t_min, t_max, precipitation, humidity, wind)
```

---

### Phase 3: Crop Referential Engine 📚
**Priority:** HIGH — Required for AI calibration and recommendations
**Effort:** ~3-4 weeks
**Dependencies:** Phase 1

#### 3.1 Referential Data Model
- [ ] `crop_types` table (olive, avocado, citrus, almond, vine, pomegranate, fig, apple/pear, stone fruit, date palm, walnut)
- [ ] `crop_varieties` table with per-variety data:
  - Yield potential by age, alternance tendency, frost tolerance, disease sensitivity
  - Chill hours requirement, Tbase for GDD, GDD to harvest
  - Flower type (A/B for avocado), pollination requirements
- [ ] `plantation_systems` table (traditional, intensive, super-intensive)
  - Tree density, expected NDVI ranges, NIRv ranges
  - Spacing, canopy coverage percentage
- [ ] `phenological_stages` table (BBCH for olive, custom for avocado)
  - Stage name, BBCH code, satellite signals, GDD thresholds
  - Kc per stage, fertilization fractions

#### 3.2 Satellite Index Thresholds per Crop/System
- [ ] `crop_index_thresholds` table
  - Per crop × system × index: healthy_min, healthy_max, stress_low, stress_high
  - These are GUARD-RAILS (not real thresholds — real ones come from calibration)
- [ ] Support for: NDVI, NIRv, EVI, NDMI, NDRE, MSI, GCI, MSAVI2

#### 3.3 Kc Coefficients
- [ ] `crop_kc_coefficients` table
  - Per crop × variety × phenological_stage: kc_value
  - Olive: 0.45 (dormancy) → 0.65 (flowering) → 0.70 (fruit growth) → 0.55 (maturation)
  - Avocado: 0.60 → 0.80 → 0.85 → 0.70

#### 3.4 Mineral Export Tables
- [ ] `crop_mineral_exports` table
  - Per crop: N, P2O5, K2O, Ca, Mg, Fe, Zn, B exports per tonne of fruit
  - Olive: 15 N, 4 P2O5, 20 K2O per tonne
  - Avocado: 8.5 N, 2.5 P2O5, 25 K2O per tonne

#### 3.5 Disease/Pest Database
- [ ] `crop_diseases` table
  - Per crop: disease name, pathogen, conditions (T, humidity, satellite signals)
  - Treatment protocol: product, dose, spray volume, method, DAR
  - Variety sensitivity matrix
- [ ] Key diseases: Oeil de paon (olive), Phytophthora (avocado), Verticilliose (both)

**Seed data from research docs:**
- 11 crop types with all varieties
- ~50 varieties with full parameters
- ~30 diseases with treatment protocols
- Complete Kc and mineral export tables

---

### Phase 4: AI Calibration Engine (Moteur Décisionnel) 🧠
**Priority:** CRITICAL — Core intelligence of the platform
**Effort:** ~4-6 weeks
**Dependencies:** Phase 1 + 2 + 3

#### 4.1 Parcel Profile & Registration
- [ ] Enhanced parcel creation form with agronomic data:
  - Crop type, variety, plantation system, tree density
  - Age of plantation, soil type, pH, irrigation system
  - Historical yield data (if available)
- [ ] Store in existing `parcels` table with new columns or related `parcel_agronomic_profile` table

#### 4.2 Automatic Calibration ("Point Zéro")
- [ ] On parcel registration, run calibration:
  1. Fetch 12-36 months satellite history (NDVI, NIRv, NDMI, NDRE, EVI)
  2. Calculate percentiles: P10, P25, P50, P75, P90 per index
  3. Compare against crop guard-rail thresholds
  4. If P50 is abnormally low → flag as "poor health" parcel, don't calibrate as "normal"
  5. Store personalized thresholds in `parcel_calibration` table
- [ ] `parcel_calibration` table:
  - parcel_id, index_name, p10, p25, p50, p75, p90, calibration_date, data_months_used
  - stress_threshold, critical_threshold, excellent_threshold
- [ ] Recalibration: Annual automatic recalibration

#### 4.3 Water Balance Engine
- [ ] Real-time calculation: `Bilan = Precip + Irrigation - ETP × Kc`
- [ ] Inputs: weather (precip, ETP), Kc from referential, irrigation (user-declared)
- [ ] Cross-validate with satellite: NDMI shows stress → bilan should be negative
- [ ] Store in `parcel_water_balance` table (daily)
- [ ] Alert when bilan is negative for N consecutive days

#### 4.4 Fertilization Engine (NPK)
- [ ] Calculate annual NPK needs:
  ```
  Dose_N = (Export_N × Target_Yield + Tree_Need_N) / Utilization_Coeff_N - Soil_Input_N
  ```
- [ ] Fractionation by phenological stage (% of annual dose per stage)
- [ ] Track what has ALREADY been applied (from user input/stock management)
- [ ] Detect nutrient interactions/antagonisms (Fe↔P, Ca↔K, etc.)
- [ ] Adjust for alternance (ON year: +20% K, OFF year: +N for reserves)

#### 4.5 Phenological Stage Detection
- [ ] Combine GDD + satellite signals to detect current stage:
  - GDD reaches threshold → check satellite confirms (e.g., NDVI drop for leaf fall)
  - Satellite shows anomaly → check if GDD matches expected stage transition
- [ ] Store detected stages in `parcel_phenology_log`
- [ ] Trigger stage-specific recommendations

---

### Phase 5: Alert System (18 Alert Codes) 🚨
**Priority:** HIGH — Direct farmer value
**Effort:** ~3-4 weeks
**Dependencies:** Phase 2 + 3 + 4

#### 5.1 Alert Engine Architecture
- [ ] `alert_definitions` table (pre-populated from research docs):
  - alert_code, name, severity, crop_types applicable
  - entry_threshold, exit_threshold (hysteresis to avoid oscillation)
  - condition_type: satellite_only | meteo_only | satellite_x_meteo
  - action_template: what to recommend when triggered
- [ ] `parcel_alerts` table:
  - parcel_id, alert_code, status (active/resolved), entered_at, resolved_at
  - trigger_values (JSON: what triggered it)

#### 5.2 Alert Types (from research docs)

**Satellite-only alerts (7):**
1. NDVI drop > 15% in 2 weeks → vegetation stress
2. NDMI < P10 → water stress
3. NDRE drop > 20% → nitrogen deficiency
4. NIRv < P10 for crop type → canopy decline
5. MSI > P90 → severe moisture stress
6. EVI saturation in dense canopy → switch to NIRv
7. MSAVI2 drop in young plantation → establishment failure

**Meteo-only alerts (5):**
8. T_min < frost threshold → frost risk (crop-specific)
9. T_max > heat threshold → heat stress
10. Chill hours insufficient → poor dormancy break
11. Precipitation during flowering → pollination risk
12. High humidity + moderate T → fungal disease risk

**Cross satellite × meteo alerts (6):**
13. NDMI low + negative water balance → confirmed irrigation deficit
14. NDVI drop + recent frost → frost damage confirmed
15. NDRE drop + high T → heat-induced chlorosis
16. Satellite normal + weather risk → preventive alert
17. Satellite stress + planned application + bad weather forecast → reschedule application
18. NIRvP declining vs previous season → yield at risk

#### 5.3 Meteorological × Application Calendar
- [ ] Cross 7-day forecast with planned applications
- [ ] Alert if: rain within 24h of planned treatment, wind > 15 km/h, T > 35°C
- [ ] Push notification system integration

---

### Phase 6: Yield Prediction & Advanced Analytics 📈
**Priority:** MEDIUM — Long-term value, requires data accumulation
**Effort:** ~4-6 weeks
**Dependencies:** Phase 2 + 3 + 4 (+ 3 years of data for calibration)

#### 6.1 Yield Prediction Model
- [ ] Per-crop regression model:
  ```
  Yield = α₁×Σ(NIRvP) + α₂×Alternance(N-2) + α₃×Chill_Hours + α₄×GDD 
        + α₅×Water_Deficit + α₆×Frost(0/1) + α₇×Precip_Flowering + constant
  ```
- [ ] Σ(NIRvP) = cumulative seasonal NIRvP (from time-series)
- [ ] Coefficients calibrated per parcel with 3+ years yield data
- [ ] Expected R²: 0.4-0.6 (traditional), 0.5-0.7 (intensive), 0.6-0.8 (super-intensive)

#### 6.2 Σ(NIRvP) Seasonal Cumulative Heatmap
- [ ] End-of-season spatial productivity map
- [ ] Calculate cumulative NIRvP per pixel over growing season
- [ ] Display as heatmap showing most/least productive zones within parcel

#### 6.3 Alternance Detection
- [ ] Compare current season NIRvP curve with N-1 and N-2
- [ ] Detect ON/OFF year pattern
- [ ] Adjust fertilization and yield expectations accordingly

#### 6.4 Cost/ROI Analysis
- [ ] Calculate ROI per recommendation
- [ ] Prioritize recommendations by cost-effectiveness
- [ ] Track actual vs recommended actions

---

## Implementation Priority Matrix

| Phase | Priority | Effort | Value | Dependencies |
|-------|----------|--------|-------|-------------|
| Phase 1: Indices | ✅ DONE | - | HIGH | None |
| Phase 2: Meteo | 🔜 NEXT | 2-3 weeks | HIGH | Phase 1 |
| Phase 3: Referential | 🔜 PARALLEL | 3-4 weeks | HIGH | Phase 1 |
| Phase 4: AI Engine | ⏳ AFTER 2+3 | 4-6 weeks | CRITICAL | Phase 2+3 |
| Phase 5: Alerts | ⏳ AFTER 4 | 3-4 weeks | HIGH | Phase 2+3+4 |
| Phase 6: Yield | ⏳ LONG-TERM | 4-6 weeks | MEDIUM | Phase 2+3+4 + data |

**Recommended execution:** Phase 2 and 3 in PARALLEL → Phase 4 → Phase 5 → Phase 6

## Technical Notes

### Database Schema Additions (estimated)
- ~15 new tables
- ~10 new RPC functions
- ~5 new database triggers
- Significant seed data from research documents

### API Additions (estimated)
- Weather data endpoints (NestJS or Python backend)
- Referential CRUD endpoints
- Calibration engine endpoints
- Alert management endpoints
- Yield prediction endpoints

### Frontend Additions (estimated)
- Enhanced parcel creation wizard (agronomic profile)
- Water balance dashboard widget
- Fertilization plan view
- Alert center with push notifications
- Yield prediction charts (current season vs historical)
- Phenological stage timeline

### External API Dependencies
- Open-Meteo Historical API (ERA5 backend) — free, CC-BY
- Open-Meteo Forecast API — free, CC-BY
- Existing: Google Earth Engine, CDSE (Copernicus)
