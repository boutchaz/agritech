# AgromindIA Feature Specifications

Generated: 2026-03-18

---

#### 🎯 Moteur de Calibrage IA

#### 📌 Overview
Phase 1 d'intégration obligatoire pour établir l'état zéro (baseline) d'une parcelle. Le calibrage analyse l'historique satellite, météorologique et utilisateur pour créer un référentiel personnalisé sans générer de recommandations opérationnelles.

#### 👤 User Stories / Use Cases
- As a farmer, I want to establish a baseline for my field so that I have a personalized reference for all future analysis.
- As an agronomist, I want to validate the quality of collected data (satellite, soil, water) so that I can ensure calibration reliability.
- As a technical user, I want to understand what data is missing so that I can prioritize additional analyses.

#### ✅ Functional Requirements
- Extract 12-36 months of Sentinel-2 satellite history for the field
- Calculate personalized percentiles (P10, P25, P50, P75, P90) from historical data
- Detect historical phénological stages and anomalies (frost, drought, disease)
- Establish personalized thresholds for each spectral index per field
- Generate initial health score (0-100) with component breakdown
- Calculate confidence level (0-100%) based on data availability
- Generate calibration report with findings and recommendations for data completion
- Require explicit user validation before transitioning to operational phase
- Mode OBSERVATION PURE: No operational recommendations during calibration phase

#### 🚫 Out of Scope / Constraints
- In scope: Calibration phase only. Observation, analysis, baseline establishment.
- Out of scope: No operational recommendations. No alerts. No treatment suggestions. No criticism of user practices.

#### 🔗 Dependencies
- Sentinel-2 satellite imagery archive (12-36 months)
- ERA5 or Open-Meteo weather data
- Culture reference database (phenology, thresholds)
- User profile data (F1 form completion)

#### ❓ Open Questions / Ambiguities
- How should young plantations (< 5 years) with very limited history be handled?
- When and how should farmers be prompted to add missing analyses (soil, water, leaf)?

#### 🏷️ Labels / Tags
Calibration, Baseline, Phase 1, Data Foundation, Observation

---

#### 🎯 Moteur Opérationnel IA

#### 📌 Overview
Phase 2 qui démarre après validation du calibrage. Génère des diagnostics, alertes et recommandations personnalisées basées sur le suivi satellite en temps réel, les données météo et la comparaison aux seuils calibrés.

#### 👤 User Stories / Use Cases
- As a farmer, I want to receive alerts when my field deviates from its baseline so that I can react quickly to problems.
- As an agronomist, I want to see the diagnostic reasoning (hypothesis + confidence level) so that I can validate or challenge recommendations.
- As a farmer, I want rendement forecast updates throughout the season so that I can plan harvesting and logistics.

#### ✅ Functional Requirements
- Monitor satellite indices every 5 days (Sentinel-2) and compare to calibrated thresholds
- Execute daily weather data acquisition and calculate GDD, water balance, frost risk
- Trigger alerts based on hysteresis thresholds (entry and exit criteria)
- Generate differential diagnoses with confidence levels (high/medium/low)
- Evaluate response to post-application interventions within specified evaluation windows
- Progressively recalibrate model based on actual vs. predicted outcomes
- Provide rendement forecast updates at key phenological stages
- Detect execution of interventions from satellite signatures even without user declaration

#### 🚫 Out of Scope / Constraints
- In scope: Operational diagnostics, alerts, recommendations, post-application evaluation, continuous learning.
- Out of scope: Guaranteed yields. Single-cause diagnoses. Advice outside agronomic scope.

#### 🔗 Dependencies
- Moteur Calibrage IA (Phase 1 - must be completed first)
- Sentinel-2 operational feed (5-day revisit)
- Daily weather data and 7-day forecasts
- Culture reference (diagnostic scenarios, alert codes, intervention windows)
- Governance module for recommendation lifecycle

#### ❓ Open Questions / Ambiguities
- Confidence thresholds: what confidence level (e.g., ⭐⭐⭐) triggers automated vs. user-reviewed recommendations?
- How to handle ambiguous diagnostics when multiple causes are equally likely?

#### 🏷️ Labels / Tags
Operational, Diagnostics, Alerts, Recommendations, Phase 2

---

#### 🎯 Workflow IA

#### 📌 Overview
Orchestration complète des 12 phases du système IA, de l'initialisation jusqu'au recalibrage annuel post-récolte. Décrit le flux entre calibrage, acquisition, diagnostic, prévision et suivi.

#### 👤 User Stories / Use Cases
- As a user, I want a clear workflow view so that I understand where the system is in the complete process.
- As a technical manager, I want to track data flow through each phase so that I can ensure data integrity.

#### ✅ Functional Requirements
- Execute 12 sequential phases from field initialization through annual recalibration
- Synchronize satellite, weather, and user data sources
- Determine current phenological stage using GDD and satellite trends
- Apply phénological window restrictions before recommending interventions

#### 🚫 Out of Scope / Constraints
- In scope: All 12 workflow phases generic to all tree crops.
- Out of scope: Culture-specific details (in Reference Culture documents).

#### 🔗 Dependencies
- All upstream modules (Calibrage, Opérationnel)
- Culture references (phenology, GDD, thresholds)
- Governance module

#### ❓ Open Questions / Ambiguities
- How granular should phase transitions be (automatic vs. user-triggered)?

#### 🏷️ Labels / Tags
Workflow, Orchestration, All Phases, Process Flow

---

#### 🎯 Génération du Plan Annuel

#### 📌 Overview
Génération automatique d'un plan intégré pour la saison : calendrier complet de fertilisation, biostimulants, phytosanitaire préventif et irrigation ajusté selon le profil parcellaire.

#### 👤 User Stories / Use Cases
- As a farmer, I want an integrated annual plan so that I know exactly what to do each month.
- As a farm manager, I want the plan to adjust automatically to conditions so that I respond to field needs dynamically.
- As a technical user, I want to see the calculation logic so that I can verify accuracy and make adjustments.

#### ✅ Functional Requirements
- Calculate annual NPK doses based on target yield, soil analysis, water quality
- Adjust doses for crop alternance status (ON / OFF / exhaustion)
- Fractionate annual doses by month according to phenological calendar
- Generate preventive phytosanitaire program with calendar dates
- Calculate irrigation volumes monthly based on ETo, Kc, irrigation efficiency
- Implement salinity management (acidification, gypse, low-salt fertilizer forms) if Option C active
- Generate output as JSON calendar with monthly interventions
- Allow mid-season plan adjustments triggered by alerts or real yield forecasts

#### 🚫 Out of Scope / Constraints
- In scope: Annual planning for nutrition, irrigation, phyto prevention, taille, harvest window.
- Out of scope: Real-time tactical adjustments (handled by operational engine). Pest curative treatments.

#### 🔗 Dependencies
- Moteur Calibrage (baseline + confidence)
- Soil/water/leaf analyses (if available)
- Yield history (for target setting)
- Culture reference (calendars, coefficients)
- Alternance detection algorithm

#### ❓ Open Questions / Ambiguities
- Should users be able to override calculated doses?
- How sensitive is the plan to forecasted vs. realized seasonal weather?

#### 🏷️ Labels / Tags
Planning, Calendar, Nutrition, Irrigation, Annual

---

#### 🎯 Fiches de Saisie Standardisées

#### 📌 Overview
Trois formulaires standardisés (F1, F2, F3) pour la saisie des données de calibrage initial, recalibrage partiel et recalibrage post-campagne.

#### 👤 User Stories / Use Cases
- As a farmer, I want simple forms to enter my field data so that I don't spend hours on paperwork.
- As an agronomist, I want progressive form complexity (optional vs. required fields) so that basic users can start quickly.
- As a data manager, I want validation feedback so that I know what data is still needed to improve model confidence.

#### ✅ Functional Requirements
- F1: Collect initial field data (plantation, irrigation, soil/water/leaf analyses, yield history)
- F1: Auto-calculate confidence level from data completeness
- F2: Enable selective recalibration of specific data blocks (water source, irrigation, analyses)
- F3: Auto-detect missing year-end tasks and prompt user for completion
- F3: Compare predicted vs. actual yields and update baseline accordingly
- Display field confidence score before activation (with improvement suggestions)

#### 🚫 Out of Scope / Constraints
- In scope: Data entry forms F1, F2, F3 for calibration workflow.
- Out of scope: Real-time data entry during operations. External data integration beyond specified fields.

#### 🔗 Dependencies
- Moteur Calibrage (Phase 1 logic)
- Culture reference (standards, norms)
- GIS/mapping component (AOI drawing)
- Satellite auto-loading (Sentinel-2 history)

#### ❓ Open Questions / Ambiguities
- Should F1 form allow bulk upload of analyses (CSV/PDF)?
- How to handle conflicting data (e.g., soil sample vs. satellite signature)?

#### 🏷️ Labels / Tags
Data Entry, Forms, User Input, Calibration, Recalibration

