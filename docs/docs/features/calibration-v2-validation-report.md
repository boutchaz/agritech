---
sidebar_position: 3
---

# Calibration V2 — Multi-Stakeholder Validation Report

**Date**: March 15, 2026  
**Pipeline Version**: v2 (V1 fully removed)  
**Supported Crops**: olivier, agrumes, avocatier, palmier dattier  
**Validated By**: 8-stakeholder panel (Data Scientist, Agronomist, Farm Manager, Organization Admin, Product, Backend/Platform, Frontend/UX, Support/Success)

## Executive Summary

The V2 calibration pipeline is **algorithmically sound** and functionally complete for an initial release. The 8-step pipeline (satellite extraction → weather → percentiles → phenology → anomalies → yield → zones → health score) produces structured calibration reports with health scores, anomaly detection, yield estimates, and nutrition recommendations.

**Verdict**: CONDITIONAL GO — 3 mandatory pre-release fixes required, 10 HIGH-severity items for Sprint+1.

| Metric | Count |
|--------|-------|
| Total findings | 37 |
| Blocker | 1 |
| High severity | 10 |
| Medium severity | 10 |
| Low severity | 7 |

---

## Pipeline Overview

```
NestJS startCalibrationV2()
  → runCalibrationV2InBackground()
    → POST /api/calibration/v2/run → Python run_calibration_pipeline()
      → Step 1: extract_satellite_history (8 indices, cloud filter, interpolation, outlier detection)
      → Step 2: extract_weather_history (GDD, chill hours, extreme events, crop-specific frost)
      → Step 3: calculate_percentiles (P10/P25/P50/P75/P90, period-based if >24mo)
      → Step 4: detect_phenology (NIRv/NDVI curve, dormancy/peak/plateau/decline)
      → Step 5: detect_anomalies (sudden_drop, progressive_decline, abnormal_value, trend_break, stagnation)
      → Step 6: calculate_yield_potential (reference brackets + harvest history)
      → Step 7: classify_zones (1×1 median NDVI → single zone — PLACEHOLDER)
      → Step 8: calculate_health_score (rolling median, temporal CV, 5 weighted components)
      → Confidence scoring (satellite/soil/water/yield/profile/coherence)
    → Updates calibrations table + parcel ai_phase
```

### Health Score Components (Step 8)

| Component | Weight | Source |
|-----------|--------|--------|
| Vigor | 30% | Rolling median of NDVI vs P10-P90 range |
| Homogeneity | 20% | Temporal CV proxy (std/mean of NDVI) |
| Stability | 15% | `100 - anomaly_count × 8` |
| Hydric | 20% | Rolling median of NDMI vs P10-P90 range |
| Nutritional | 15% | Rolling median of NDRE vs P10-P90 range |

### State Machine

```
disabled → calibrating → awaiting_validation → awaiting_nutrition_option → active
```

### Nutrition Options

| Option | Label | Trigger |
|--------|-------|---------|
| A (Standard) | Balanced fertigation + standard foliar | Recent soil + water analyses, non-saline |
| B (Enhanced) | Enhanced fertigation + biostimulant | Default fallback when A prerequisites not met |
| C (Intensive) | Intensive program + leaching management | Salinity detected (water or soil EC > threshold) |

---

## 1. Data Scientist — Algorithms, Indices & Statistical Rigor

### Validated (Working Correctly)

- **Rolling median health score**: Uses last 5 non-outlier readings — eliminates single-image noise
- **3-sigma outlier detection** (step1): Marks but doesn't remove outliers; step8 properly skips them
- **Percentile calculation** (step3): Period-based percentiles activate at >24 months of data
- **Anomaly detection** (step5): 5 anomaly types with weather cross-reference
- **Confidence scoring**: 6-component system with sensible point allocation
- **Crop-specific frost thresholds**: olivier=-2°C, agrumes=0°C, avocatier=2°C, palmier=-4°C

### Findings

| ID | Severity | Finding | Impact | Recommendation |
|----|----------|---------|--------|----------------|
| DS-1 | **BLOCKER** | Zone detection is a placeholder. `classify_zones()` receives a 1×1 pixel raster (`np.array([[median_ndvi]])`). Always produces 1 zone = 100% of parcel. | Zone pie chart shows single color for every parcel. No actionable zone-based recommendations. | Hide zone section until per-pixel rasters available. Add `data_quality_flag: "single_pixel_zone"`. |
| DS-2 | **HIGH** | Temporal CV as homogeneity proxy is misleading. `_temporal_homogeneity()` uses `CV = std/mean` from global percentiles — measures temporal variation, not spatial uniformity. Olives with normal Jan=0.3/Jul=0.65 cycle get CV≈0.3 → score≈40. | Crops with natural seasonal variation penalized as "low homogeneity." | Rename to "temporal_stability" in UI. Compute spatial metric when per-pixel data available. |
| DS-3 | **MEDIUM** | 8 indices, 3 redundant. EVI≈NDVI (r>0.95 for trees), MSAVI≈EVI, MSI≈1/NDMI. Same event triggers anomalies on correlated indices. | Inflated anomaly counts. One drought → anomalies on NDVI+EVI+MSAVI+MSI. Stability drops 32pts for single event. | Reduce to 5 core indices (NDVI, NIRv, NDMI, NDRE, GCI) or deduplicate anomalies per index group. |
| DS-4 | **MEDIUM** | Linear interpolation for satellite gaps. NDVI curves are sinusoidal; linear interpolation across seasonal peaks/troughs generates phantom mid-values. | Interpolated values near peaks are underestimated; near troughs, overestimated. Affects percentiles and rolling median. | Use Savitzky-Golay interpolation for seasonal curves. |
| DS-5 | **MEDIUM** | No minimum data threshold. Pipeline runs with even 1 satellite image. <5 images: outlier detection skips, percentiles meaningless, phenology fails silently. | Confident-looking report from insufficient data. Confidence gives 5pts even for 1 month of data. | Require ≥6 satellite images. Below that, return "data insufficient" result. |
| DS-6 | **LOW** | Simplified chill hours formula. `(7.2 - temp_min) * 1.5` with cap at 12 vs Utah/Dynamic model. | Acceptable for MVP. Rough approximation. | Document as approximate. Upgrade to Dynamic model for precision agriculture tier. |
| DS-7 | **LOW** | Drought detection ignores irrigation. 30-day <5mm precip triggers `prolonged_drought`. Irrigated orchards trigger this every summer. | False positives. Alert fatigue for irrigated farms. | Add irrigation flag. Suppress drought alerts for irrigated parcels or increase threshold. |
| DS-8 | **LOW** | Anomaly deduplication by (date, type) loses index info. Two indices with sudden_drop on same date → deduplicated to one. | Minor — hides which indices are affected. | Deduplicate by (date, type, index) or group by event. |

---

## 2. Agronomist — Agronomic Soundness & Crop Specificity

### Validated (Working Correctly)

- **Maturity phases**: 5-phase lifecycle with correct age boundaries (0-5, 5-10, 10-40, 40-60, 60+)
- **GDD base temperatures**: olivier=10°C, agrumes=13°C, avocatier=10°C, palmier=18°C
- **Nutrition option logic**: 3-tier with salinity triggers aligned with FAO olive guidelines (~2.7 dS/m)
- **Yield potential**: Variety-specific reference data blended with historical harvest records
- **Chill hours**: Computed Nov-Feb only, essential for olive fruit set

### Findings

| ID | Severity | Finding | Impact | Recommendation |
|----|----------|---------|--------|----------------|
| AG-1 | **HIGH** | Phenology detection assumes deciduous behavior. Olives, citrus, and avocado are **evergreen** — NDVI varies only ~5-10% seasonally. Algorithm detects noise as "stages." | Phenology timeline shows meaningless dates for 3 of 4 supported crops. Only date palm has clear seasonal cycle. | Add evergreen guard: mark phenology as "approximate" for olivier/agrumes/avocatier. Weight phenology-derived features lower. |
| AG-2 | **HIGH** | No olive alternance (ON/OFF year) detection. Olives have biennial bearing. Yield potential treats each year independently. | Low-yield OFF year appears as "underperforming." False alarm on normal biennial pattern. | Compare current year NDVI to previous year. If anti-correlated + olive → flag ON/OFF year, adjust yield ±30%. |
| AG-3 | **HIGH** | Palmier dattier water EC threshold too low (3.5 dS/m). Date palms tolerate 8-10 dS/m. System recommends intensive leaching when palm is fine. | Over-treatment: unnecessary costs. Potential waterlogging from excessive irrigation. | Increase to water=6.0, soil=8.0 dS/m per FAO salt tolerance table. |
| AG-4 | **MEDIUM** | No irrigation context in water stress assessment. NDMI interpretation differs between rainfed (expected low in summer) and irrigated (urgent if low). | Hydric component (20% of total) may be misleading without irrigation regime. | Add irrigation flag to parcel metadata. Adjust NDMI interpretation accordingly. |
| AG-5 | **MEDIUM** | Fixed phenology periods don't match Moroccan seasons. DEFAULT_PERIODS: dormancy=Dec-Feb, flowering=Jun-Jul. Moroccan olives flower Apr-May, harvest Oct-Dec. | Period-based percentiles use wrong months, affecting reference ranges. | Make periods crop-specific or derive from step4 output. |
| AG-6 | **MEDIUM** | No post-harvest / pruning detection. Sudden NDVI drop after harvest/pruning is normal but flagged as "sudden_drop" up to "critical" severity. | False anomaly alerts during harvest/pruning season. | Add harvest window parameter per crop. Suppress sudden_drop anomalies during that window. |
| AG-7 | **LOW** | Soil analysis age threshold of 730 days (2 years) is generous for Mediterranean fertigation (changes in 6-12 months). | Acceptable for MVP — soil analysis is expensive. | Document as "recommended: annual soil analysis." |
| AG-3 | **HIGH** | Palmier dattier water EC threshold too low (3.5 dS/m). Date palms tolerate 8-10 dS/m. System recommends intensive leaching when palm is fine. | Over-treatment: unnecessary costs. Potential waterlogging from excessive irrigation. | Increase to water=6.0, soil=8.0 dS/m per FAO salt tolerance table. |
| AG-4 | **MEDIUM** | No irrigation context in water stress assessment. NDMI interpretation differs between rainfed (expected low in summer) and irrigated (urgent if low). | Hydric component (20% of total) may be misleading without irrigation regime. | Add irrigation flag to parcel metadata. Adjust NDMI interpretation accordingly. |
| AG-5 | **MEDIUM** | Fixed phenology periods don't match Moroccan seasons. DEFAULT_PERIODS: dormancy=Dec-Feb, flowering=Jun-Jul. Moroccan olives flower Apr-May, harvest Oct-Dec. | Period-based percentiles use wrong months, affecting reference ranges. | Make periods crop-specific or derive from step4 output. |
| AG-6 | **MEDIUM** | No post-harvest / pruning detection. Sudden NDVI drop after harvest/pruning is normal but flagged as "sudden_drop" up to "critical" severity. | False anomaly alerts during harvest/pruning season. | Add harvest window parameter per crop. Suppress sudden_drop anomalies during that window. |
| AG-7 | **LOW** | Soil analysis age threshold of 730 days (2 years) is generous for Mediterranean fertigation (changes in 6-12 months). | Acceptable for MVP — soil analysis is expensive. | Document as "recommended: annual soil analysis." |
| AG-3 | **HIGH** | Palmier dattier water EC threshold too low (3.5 dS/m). Date palms tolerate 8-10 dS/m. System recommends intensive leaching when palm is fine. | Over-treatment: unnecessary costs. Potential waterlogging from excessive irrigation. | Increase to water=6.0, soil=8.0 dS/m per FAO salt tolerance table. |
| AG-4 | **MEDIUM** | No irrigation context in water stress assessment. NDMI interpretation differs between rainfed (expected low in summer) and irrigated (urgent if low). | Hydric component (20% of total) may be misleading without irrigation regime. | Add irrigation flag to parcel metadata. Adjust NDMI interpretation accordingly. |
| AG-5 | **MEDIUM** | Fixed phenology periods don't match Moroccan seasons. DEFAULT_PERIODS: dormancy=Dec-Feb, flowering=Jun-Jul. Moroccan olives flower Apr-May, harvest Oct-Dec. | Period-based percentiles use wrong months, affecting reference ranges. | Make periods crop-specific or derive from step4 output. |
| AG-6 | **MEDIUM** | No post-harvest / pruning detection. Sudden NDVI drop after harvest/pruning is normal but flagged as "sudden_drop" up to "critical" severity. | False anomaly alerts during harvest/pruning season. | Add harvest window parameter per crop. Suppress sudden_drop anomalies during that window. |
| AG-7 | **LOW** | Soil analysis age threshold of 730 days (2 years) is generous for Mediterranean fertigation (changes in 6-12 months). | Acceptable for MVP — soil analysis is expensive. | Document as "recommended: annual soil analysis." |

---

## 3. Farm Manager — Report Accuracy, Actionability & Workflow

### Validated (Working Correctly)

- **Health score**: 0-100 with 5 named components — intuitive for farm managers
- **Anomaly weather cross-reference**: "NDVI dropped 40% near a heatwave" builds trust
- **Nutrition option labels**: "Standard" / "Enhanced" / "Intensive" — clear non-technical names
- **Yield potential**: Reference range + actual history helps gauge performance
- **Maturity phase labels**: Human-readable French labels in UI

### Findings

| ID | Severity | Finding | Impact | Recommendation |
|----|----------|---------|--------|----------------|
| FM-1 | **HIGH** | No actionable recommendations. Report shows health score and anomalies but never says "do X." Manager sees "hydric: 45" but doesn't know the action. | Report is diagnostic but not prescriptive. Managers with limited agronomy knowledge can't act on it. | Add simple rule engine: hydric<50 → "Check irrigation", stability<50 → "Investigate stress events", nutritional<50 → "Consider soil/leaf analysis." |
| FM-2 | **BLOCKER** | Zone pie chart shows single color for every parcel (DS-1). Users comparing to ground truth lose confidence. | "This AI says my entire parcel is uniform — I can see variation with my eyes." Credibility risk. | Hide zone section or show clear placeholder message. |
| FM-3 | **MEDIUM** | Too many anomalies on correlated indices. One heatwave → 6 anomaly records (NDVI, EVI, MSAVI, MSI, NIRv, GCI). | Anomaly list is noisy and overwhelming. 20+ anomalies when only 3-4 real events occurred. | Group anomalies by date + weather event. Show as single event with affected indices listed. |
| FM-4 | **MEDIUM** | Phenology timeline shows nonsense dates for evergreens (AG-1). Manager knows olives don't go dormant in December. | Trust erosion: "It says my olives have dormancy — they don't." | Hide or disclaim phenology for evergreen crops. |
| FM-5 | **LOW** | No way to provide feedback on calibration accuracy. No "this score feels wrong" mechanism. | System can't learn from field truth. No per-parcel tuning over time. | Add 1-5 star accuracy rating that feeds into model tuning. |
| FM-6 | **LOW** | Weather data from gridded sources may not match farm microclimate (mountain vs valley vs coastal). | Health score and anomaly attribution may be wrong for microclimate farms. | Document limitation. Consider allowing manual weather station integration. |

---

## 4. Organization Admin — Rollout, Subscription & ROI

### Validated (Working Correctly)
t
- **Multi-tenant isolation**: All queries filter by `organization_id`, state machine validates ownership
- **Subscription-gated**: Calibration behind `SubscriptionGuard` with 14-day free trial
- **Per-parcel calibration**: Admin can prioritize high-value parcels
- **State machine transparency**: `ai_phase` visible per parcel

### Findings

| ID | Severity | Finding | Impact | Recommendation |
|----|----------|---------|--------|----------------|
| OA-1 | **MEDIUM** | No bulk calibration. Admin with 200 parcels must calibrate each individually. | Onboarding friction: large orgs will churn at calibration step. 200 parcels × manual workflow = days of work. | Add "Calibrate All" at farm level. Queue calibrations and auto-validate with default nutrition option. |
| OA-2 | **MEDIUM** | No calibration status dashboard. No aggregate view of calibration progress across org. | Admin has no visibility into rollout progress. | Add dashboard widget: "45/200 calibrated, 30 awaiting validation, 125 not started." |
| OA-3 | **MEDIUM** | Calibration cost invisible. No metering, no cost attribution, no usage limits per tier. | Risk of unexpected costs. No budget controls. | Add usage tracking. Define calibration limits per subscription tier. |
| OA-4 | **LOW** | Planting year prompt is per-parcel. Large orchards planted same year need repetitive input. | Minor UX friction during bulk onboarding. | Allow setting planting year at farm level with "apply to all parcels" option. |
| OA-5 | **LOW** | Boundary change resets calibration. Even minor GIS adjustment triggers recalibration. | Frustrating if admin is cleaning up boundaries post-calibration. | Add boundary similarity check — only reset if >5% area change. |

---

## 5. Product — Acceptance, Scope & Release Readiness

### Release Criteria Checklist

| Criterion | Status |
|-----------|--------|
| Core pipeline executes end-to-end | ✅ PASS |
| V1 fully removed | ✅ PASS |
| Test coverage (Python 56/56, NestJS 46/46) | ✅ PASS |
| State machine works (all transitions) | ✅ PASS |
| Nutrition option flow (salinity, soil age, 3-tier) | ✅ PASS |
| Frontend displays full report | ✅ PASS |
| Multi-tenant security (org_id filter, subscription guard) | ✅ PASS |
| Zone detection is real spatial analysis | ❌ FAIL — placeholder |
| Minimum data safeguard | ❌ FAIL — none |
| Phenology valid for all crops | ❌ FAIL — wrong for evergreens |

### Findings

| ID | Severity | Finding | Impact | Recommendation |
|----|----------|---------|--------|----------------|
| PR-1 | **BLOCKER** | Zone visualization is misleading (=DS-1/FM-2). Single-zone pie chart presented as real spatial analysis. | Cannot ship as-is. Competitive demos will expose immediately. | Hide section or add clear disclaimer. |
| PR-2 | **HIGH** | No minimum data guard (=DS-5). 1 satellite image produces confident-looking report. | Users trust and act on meaningless metrics. | Add data sufficiency check. Refuse or warn below 6 images. |
| PR-3 | **HIGH** | Evergreen phenology is wrong (=AG-1). 3 of 4 supported crops show incorrect phenology. | Visible inaccuracy damages product credibility. | Hide phenology for evergreen crops or add disclaimer. |
| PR-4 | **MEDIUM** | Anomaly noise from correlated indices. Up to 40 records per event. | UI overwhelms users. Acceptable if grouped by date. | Group anomalies by event in frontend. |
| PR-5 | **MEDIUM** | No re-calibration trigger. Nothing prompts recalibration when new data arrives. | Calibration becomes stale. No lifecycle management. | Add periodic recalibration suggestion (e.g., every 3 months or new season). |
| PR-6 | **LOW** | Confidence can reach 100% without real zone data. `coherence_level` always "none" (5 free points). | Confidence inflates spatial accuracy that doesn't exist. | Reduce coherence to 0 until real zone data available. |

---

## 6. Backend / Platform — API, Performance & Robustness

### Validated (Working Correctly)

- **Background execution**: `setImmediate()` — doesn't block HTTP response
- **Error recovery**: Python failure → parcel resets to `disabled`
- **State machine guards**: `VALID_TRANSITIONS` prevents invalid phase jumps
- **Type safety**: Full TypeScript↔Python type parity verified with `satisfies`
- **Lazy imports**: `import_module()` for steps 5-8 reduces cold-start
- **Boundary change detection**: JSON comparison — simple but effective

### Findings

| ID | Severity | Finding | Impact | Recommendation |
|----|----------|---------|--------|----------------|
| BE-1 | **HIGH** | No timeout on Python pipeline call. axios.post has no explicit timeout. Python hang → parcel stuck in `calibrating` forever. | Stuck parcels with no auto-recovery. Admin must manually reset. | Add 5-minute axios timeout. Reset to `disabled` with `data_quality_flag: "pipeline_timeout"`. |
| BE-2 | **HIGH** | No retry on transient failures. Network blip or GEE rate limit → entire calibration fails. | Users must manually re-trigger after transient failures. | Add exponential backoff retry (3 attempts) on Python HTTP call. |
| BE-3 | **MEDIUM** | Concurrent calibration race condition. Nothing prevents starting calibration twice on same parcel. | Data corruption: mixed results from two runs. State machine conflicts. | Add optimistic locking: check `ai_phase === 'disabled'` before transitioning. |
| BE-4 | **MEDIUM** | `calibrations` table grows unbounded. No cleanup or archival. 10K parcels × monthly = 120K rows/year. | Database bloat at scale. | Add retention policy or archival for old calibration records. |
| BE-5 | **MEDIUM** | No observability. No structured logging, no timing metrics, no failure alerting. | Ops blind spot. Silent failures until user complains. | Add structured logging at pipeline start/end. Alert on error rate >5%. |
| BE-6 | **LOW** | `coherence_level` hardcoded to "none" (5 free points). Confidence system supports levels but none are computed. | Confidence inflated by 5 unearned points. | Implement coherence assessment or set to 0. |
| BE-7 | **LOW** | `storage` parameter always `None`. Raster upload code exists but is never invoked. `raster_paths` in output are empty. | Dead code path. No rasters stored. | Remove storage parameter or implement raster upload for zone detection. |

---

## 7. Frontend / UX — Report & Validation Flow

### Validated (Working Correctly)

- **Phase banner**: Clear state indicator with appropriate CTA, color-coded
- **Executive summary**: Health score, maturity, confidence, anomaly count at a glance
- **Time series charts**: NDVI/NDMI/NDRE with P25-P75 bands + outlier markers
- **Anomaly list**: Severity-colored cards with weather reference
- **Nutrition option selector**: 3 cards with eligibility badges and highlighted recommendation
- **Confidence breakdown**: Radar/bar chart with max_score context
- **i18n**: Full French/Arabic/English translations

### Findings

| ID | Severity | Finding | Impact | Recommendation |
|----|----------|---------|--------|----------------|
| FE-1 | **BLOCKER** | Zone pie chart renders single slice (=DS-1/PR-1). Users think it's broken. | Immediate support ticket generator: "Why is my parcel all one color?" | Replace with placeholder card or hide entirely. |
| FE-2 | **MEDIUM** | Calibration page is 1300+ lines. Single file, 15+ components, chart logic mixed with data transforms. | Hard to maintain, test, and debug. Any change risks breaking multiple sections. | Extract sub-components: `<CalibrationCharts/>`, `<AnomalySection/>`, `<ZoneSection/>`, `<ConfidenceSection/>`. |
| FE-3 | **MEDIUM** | No loading skeleton during calibration (1-3 minutes). Just a spinner. | User uncertainty: "Is it stuck?" "How long?" "Should I refresh?" | Add step-by-step progress: "Fetching satellite data... Analyzing weather... Computing health score..." |
| FE-4 | **MEDIUM** | No error state for failed calibration. Parcel silently resets to `disabled`. No explanation. | "I already calibrated this. Why is it asking me again?" Confusion. | Show toast with failure reason. Persist error in calibration record. |
| FE-5 | **LOW** | Charts render with empty axes when index has 0 data points. No "no data" message. | Empty chart looks like rendering bug. | Add "No data available" placeholder for empty chart series. |
| FE-6 | **LOW** | Mobile responsiveness not verified. Complex layout with charts and multi-column design. | Farm managers in the field (mobile) may see broken layout. | Test and optimize for mobile viewports. |

---

## 8. Support / Success — Explainability & Troubleshooting

### Validated (Working Correctly)

- **Confidence breakdown**: Transparent — user sees exactly what data is missing
- **Anomaly weather reference**: Support can explain anomalies as weather-related
- **Nutrition rationale**: Full rationale object with trigger, EC values, thresholds
- **Version metadata**: `version: "v2"` + `generated_at` timestamp for debugging

### Findings

| ID | Severity | Finding | Impact | Recommendation |
|----|----------|---------|--------|----------------|
| SU-1 | **HIGH** | No calibration history. Only latest calibration accessible. Can't compare over time. | "Last month score was 85, now 60 — why?" Support can't compare. | Retain last 5 calibration runs. Add "compare with previous" in UI. |
| SU-2 | **HIGH** | No failure reason stored. Failed calibration → reset to `disabled`, no record of error. | "Calibration keeps failing" → support is blind. Must dig server logs. | Persist error in calibration record: `{status: "failed", error: "...", failed_at_step: "step1"}`. |
| SU-3 | **MEDIUM** | Health score component names are technical ("vigor", "hydric", "nutritional"). Users ask "what is hydric?" | Repetitive support tickets. Need glossary. | Add tooltips or info icons explaining each component in plain language. |
| SU-4 | **MEDIUM** | No "why is my score X" explanation. Shows components but not *why* vigor is 45. | Support must manually interpret NDVI data. Time-consuming. | Add per-component explanation: "Vigor is 45 because recent NDVI (0.38) is below the 25th percentile (0.42)." |
| SU-5 | **LOW** | `data_quality_flags` always empty. Designed for warnings but never populated. | Lost opportunity for proactive user warnings. | Populate flags: `"few_satellite_images"`, `"high_cloud_coverage"`, `"no_soil_analysis"`, `"single_pixel_zones"`, `"evergreen_phenology_approximate"`. |
| SU-6 | **LOW** | No export/PDF of calibration report. Can only screenshot. | Feature request: "Can I share this with my agronomist/bank?" | Add PDF export or shareable link. |

---

## Consolidated Priority Matrix

### BLOCKER (Must fix before release)

| ID | Finding | Owner | Effort |
|----|---------|-------|--------|
| DS-1 / FE-1 / PR-1 / FM-2 | Zone detection is 1×1 pixel placeholder — hide section | Frontend | 1 hour |
| PR-2 / DS-5 | No minimum data threshold — add ≥6 image check | Backend | 2 hours |
| AG-1 / PR-3 / FM-4 | Phenology wrong for evergreens — add disclaimer | Frontend + Backend | 1 hour |

### HIGH (Sprint+1)

| ID | Finding | Owner | Effort |
|----|---------|-------|--------|
| BE-1 | No timeout on Python pipeline call | Backend | 30 min |
| BE-2 | No retry on transient failures | Backend | 1 hour |
| AG-3 | Palmier dattier EC threshold too low | Backend | 15 min |
| FM-1 | No actionable recommendations from report | Backend + Frontend | 4 hours |
| SU-1 | No calibration history | Backend + Frontend | 3 hours |
| SU-2 / FE-4 | No failure reason stored/shown | Backend + Frontend | 2 hours |
| AG-2 | No olive alternance detection | Backend | 4 hours |
| DS-2 | Temporal CV mislabeled as "homogeneity" | Frontend | 30 min |

### MEDIUM (Sprint+2)

| ID | Finding | Owner | Effort |
|----|---------|-------|--------|
| DS-3 / FM-3 | Index redundancy / anomaly noise | Backend | 2 hours |
| OA-1 | No bulk calibration | Full stack | 4 hours |
| BE-3 | Concurrent calibration race condition | Backend | 1 hour |
| AG-4 | No irrigation context for NDMI | Backend + DB | 2 hours |
| AG-5 | Phenology periods wrong for Morocco | Backend | 1 hour |
| AG-6 | No harvest/pruning suppression | Backend | 2 hours |
| FE-3 | No loading progress during calibration | Frontend | 2 hours |
| SU-5 | data_quality_flags always empty | Backend | 2 hours |
| OA-2 | No calibration status dashboard | Frontend | 3 hours |
| OA-3 | Calibration cost invisible | Backend | 2 hours |
| FE-2 | Calibration page 1300+ lines monolith | Frontend | 4 hours |
| BE-4 | Calibrations table grows unbounded | Backend | 1 hour |
| BE-5 | No observability / structured logging | Backend | 2 hours |
| SU-3 | Component names too technical | Frontend | 1 hour |
| SU-4 | No "why is my score X" explanation | Backend + Frontend | 3 hours |
| PR-5 | No re-calibration trigger | Backend | 2 hours |

### LOW (Backlog)

| ID | Finding | Owner | Effort |
|----|---------|-------|--------|
| DS-4 | Linear interpolation (should be Savitzky-Golay) | Backend | 3 hours |
| DS-6 | Simplified chill hours formula | Backend | 2 hours |
| DS-7 | Drought ignores irrigation | Backend | 1 hour |
| DS-8 | Anomaly dedup loses index info | Backend | 30 min |
| AG-7 | Soil analysis age threshold generous | Documentation | 15 min |
| OA-4 | Planting year per-parcel repetitive | Frontend | 1 hour |
| OA-5 | Boundary change resets calibration aggressively | Backend | 1 hour |
| BE-6 | coherence_level hardcoded "none" | Backend | 30 min |
| BE-7 | storage parameter dead code | Backend | 15 min |
| PR-6 | Confidence 100% without real zones | Backend | 30 min |
| FM-5 | No feedback mechanism | Full stack | 4 hours |
| FM-6 | Gridded weather vs microclimate | Documentation | 15 min |
| FE-5 | Empty charts no "no data" message | Frontend | 30 min |
| FE-6 | Mobile responsiveness not verified | Frontend | 2 hours |
| SU-6 | No PDF export | Frontend | 4 hours |

---

## Release Verdict

### Can we ship V2 today?

**CONDITIONAL GO** — with 3 mandatory pre-release fixes (total ~4 hours):

1. **Hide or disclaim zone section** (DS-1/FE-1/PR-1/FM-2) — 1 hour
2. **Add minimum data threshold of ≥6 satellite images** (PR-2/DS-5) — 2 hours
3. **Add evergreen phenology disclaimer** (AG-1/PR-3/FM-4) — 1 hour

### Immediate post-release (Sprint+1):

- Pipeline timeout (BE-1)
- Failure reason persistence (SU-2/FE-4)
- Palmier dattier EC threshold fix (AG-3)
- Retry mechanism (BE-2)

### Next quarter roadmap:

- Per-pixel zone detection (DS-1 proper fix)
- Recommendation engine (FM-1)
- Calibration history & comparison (SU-1)
- Olive alternance detection (AG-2)
- Bulk calibration (OA-1)
