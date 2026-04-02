---
sidebar_position: 8
title: "Plan — Calibration Review Levels + Export + Expert Lecture"
date: "2026-04-02"
status: "DRAFT — CEO Validated, Oracle Round 4 Pending"
---

# Plan : Calibration 5-Niveaux + Export Données Brutes + Lecture Expert

> **Statut** : Plan révisé après 3 rounds de revue Oracle — CEO validé (D1-D5), Oracle round 2 rejeté (3 petits restants), fixes appliqués en v1.3.
> **Portée** : Réorganisation de l'affichage calibration + export + audit expert.
> **Effort estimé** : Medium (phase 1) → Large (phase 2, protocole complet).
> **Révision** : v1.4 — Fix downloading in frontend validation, export JSON criterion aligned with derived metadata.

---

## 1. CONSTAT — Ce qui existe aujourd'hui

### 1.1 Pipeline FastAPI (8 étapes)

Le backend-service (`backend-service/app/services/calibration/`) exécute un pipeline 8 étapes et retourne un `CalibrationOutput` plat :

| Step | Contenu | Modèle |
|------|---------|--------|
| **Step1** | Séries temporelles NDVI, NDMI, NDRE, EVI, NIRv, GCI, MSAVI, MSI + filtrage nuages + outliers | `Step1Output` |
| **Step2** | Météo quotidienne, GDD cumulés, chill hours, événements extrêmes | `Step2Output` |
| **Step3** | Percentiles globaux (P10-P90) + percentiles par période phénologique | `Step3Output` |
| **Step4** | Dates phénologiques (dormancy_exit, peak, plateau, decline, dormancy_entry) + variabilité inter-annuelle + corrélation GDD | `Step4Output` |
| **Step5** | Anomalies spectrales détectées (date, type, sévérité, déviation) | `Step5Output` |
| **Step6** | Potentiel de rendement + alternance | `Step6Output` |
| **Step7** | Classification zones A-E (GeoJSON + répartition %) | `Step7Output` |
| **Step8** | Score de santé (total/100 + composants : vigor, temporal_stability/homogeneity, stability, hydric, nutritional) | `Step8Output` |
| **+** | Recommandations, Score de confiance (7 composants), Metadata (quality flags, version) | `CalibrationOutput` |

**Endpoint** : `POST /v2/run` → retourne `CalibrationOutput` complet.

### 1.2 Frontend (affichage plat)

Le composant `parcels.$parcelId.ai.calibration.tsx` affiche les données en sections plates :

1. **Executive Summary** — Health Score, Confidence, Maturity Phase, Yield Potential, Zones
2. **Detailed Analysis** — Graphiques NDVI/NDMI/NDRE, Zones pie chart, Timeline phénologique, Météo mensuelle
3. **Detected Anomalies** — Anomalies spectrales + Événements météo extrêmes
4. **Recommendations** — Actions suggérées (uniquement en phase `active`)
5. **Calibration Improvement** — Breakdown confiance, métriques nuages, quality flags

### 1.3 Protocole phénologique (`protocole_agent_ia_1.json`)

Le protocole définit un système OLIVIER-SPECIFIQUE beaucoup plus sophistiqué :

| Section | Contenu | Implémenté ? |
|---------|---------|:---:|
| **Section 0** | Questionnaire parcellaire (11 questions) | ❌ Partiellement (via CalibrationInput) |
| **Section 1** | Filtrage : masque nuageux, plausibilité temporelle, seuil pixels, extraction médiane, années extrêmes, lissage Whittaker | ⚠️ Partiel (pas de lissage, pas de filtrage temporel) |
| **Section 2** | Classification du signal : SIGNAL_PUR / MIXTE_MODERE / DOMINE_ADVENTICES + mode AMORÇAGE + références adaptatives | ❌ Non implémenté |
| **Section 3** | Machine à états phénologique : 6 phases (Dormance, Débourrement, Floraison, Nouaison, Stress estival, Reprise automnale) avec conditions GDD/spectral/thermique | ❌ Non implémenté |
| **Section 4** | 6 alertes phénologiques vérifiées à chaque acquisition | ❌ Non implémenté |
| **Section 5** | Règles d'affichage : complétude, timeline, mise à jour | ⚠️ Partiel (frontend) |
| **Section 6** | Limites documentées | ✅ Documentation |

---

## 2. DEMANDE — Les 5 niveaux de sortie proposés

```
SORTIES
│
├── 1. Décisionnelles (QUE FAIRE)
│   ├── Phase actuelle
│   ├── Phase suivante
│   └── Alertes
│
├── 2. Diagnostiques (POURQUOI)
│   ├── État du signal
│   ├── Mode
│   ├── Annotations
│   └── Diagnostics par phase
│
├── 3. Biophysiques (SUR QUOI JE ME BASE)
│   ├── NIRv
│   ├── NIRvP
│   └── GDD
│
├── 4. Temporelles (EST-CE FIABLE)
│   ├── Timeline
│   └── Historique
│
└── 5. Qualité données (AUDIT)
    ├── Filtrage
    └── Cycles hors norme
```

+ **Export données brutes** : téléchargement de toutes les données pour comparaison externe
+ **Lecture Expert (point critique)** : section d'audit pour review expert

---

## 3. ANALYSE — Mapping 5 niveaux → Données existantes

### 3.1 Table de mapping

| Niveau | Intitulé | Source existante | Gaps identifiés |
|--------|----------|-----------------|-----------------|
| **L1 — Décisionnelles** | Phase actuelle, Phase suivante, Alertes | `step5.anomalies`, `step2.extreme_events`, `recommendations`, `step7.zone_summary` (zones prioritaires) | ⚠️ **Phase phénologique** : le protocole définit une machine à états avec 6 phases + transitions GDD. L'implémentation actuelle fait de la détection de dates (min/max) uniquement. **La "phase actuelle" n'existe pas comme concept dynamique.** |
| **L2 — Diagnostiques** | État du signal, Mode, Annotations, Diagnostics par phase | `step8.health_score.components` (vigor, stability, hydric, nutritional), `step6.alternance`, `step7.spatial_pattern_type`, contexte des anomalies | ❌ **État du signal** : `SIGNAL_PUR / MIXTE_MODERE / DOMINE_ADVENTICES` du protocole Section 2 n'est pas implémenté. ❌ **Mode AMORÇAGE** : la détection `< 3 cycles complets` n'existe pas. ⚠️ **Diagnostics par phase** : le protocole définit des diagnostics spécifiques par phase (intensité floraison, sévérité stress, type fonctionnel/structurel). Aucun n'est implémenté. |
| **L3 — Biophysiques** | NIRv, NIRvP, GDD | `step1.index_time_series` (NIRv ✅, NDVI ✅, NDMI ✅, NDRE ✅, EVI ✅), `step2.cumulative_gdd` ✅, `step3.global_percentiles` ✅ | ❌ **NIRvP** n'est pas produit par le pipeline actuel. La formule est `NIRv × PAR_jour` mais PAR n'est pas extrait. |
| **L4 — Temporelles** | Timeline, Historique | `step4.mean_dates` (timeline phénologique) ✅, `step1.index_time_series` (historique indices) ✅, `step2.monthly_aggregates` ✅, historique calibration NestJS ✅ | ⚠️ La timeline actuelle montre des dates moyennes, pas les transitions de phase du protocole. |
| **L5 — Qualité données** | Filtrage, Cycles hors norme | `step1.cloud_coverage_mean` ✅, `step1.filtered_image_count` ✅, `step1.outlier_count` ✅, `step1.interpolated_dates` ✅, `metadata.data_quality_flags` ✅, `confidence` ✅ | ⚠️ **Cycles hors norme** : le protocole (Règle 1.5) exclut les années pluviométriques extrêmes (`> moyenne + 2σ`). L'implémentation actuelle ne fait pas ce filtrage. ⚠️ **Audit règle par règle** : le pipeline ne trace pas quelles règles ont exclu quelles dates. |

### 3.2 Points critiques identifiés

#### 🔴 CRITIQUE 1 : "Phase actuelle" est un concept inexistant

Le protocole définit une machine à états avec des transitions basées sur GDD cumulé, température, et indices spectraux. L'implémentation actuelle (`step4_phenology_detection.py`) fait seulement :
- Trouver le min/max de la courbe lissée
- Calculer des dates moyennes inter-annuelles

**Risque** : Afficher une "phase actuelle" basée sur les données actuelles serait trompeur. Ce serait un avis basé sur le mois calendaires (`PHENOLOGY_CONFIG` dans `calibration.py`), pas sur l'état réel de la parcelle.

**Recommandation** : Niveau 1 doit afficher clairement : `"Phase estimée (méthode heuristique)"` avec un avertissement que la méthode n'est pas conforme au protocole. La vraie machine à états est un travail séparé (Phase 2 du plan).

#### 🟡 ATTENTION 2 : État du signal absent

`SIGNAL_PUR / MIXTE_MODERE / DOMINE_ADVENTICES` est le concept central du protocole — il conditionne TOUTE l'interprétation. Sans lui, les niveaux 1 et 2 ne peuvent pas fonctionner comme spécifié.

**Recommandation** : Le Niveau 2 doit afficher `"État du signal : non disponible"` avec une explication. Implémenter la classification du signal est un prérequis pour le déploiement complet des niveaux 1-2.

#### 🟡 ATTENTION 3 : NIRvP manquant

Le protocole utilise NIRvP (NIRv × PAR) comme indicateur clé pour :
- La détermination de phase (`NIRvP_norm`)
- Le diagnostic floraison (`Ratio GCI/NIRvP`)
- La détection d'adventices

**Recommandation** : Le Niveau 3 peut afficher NIRv et GDD (disponibles). NIRvP nécessite l'ajout de l'extraction PAR depuis ERA5-Land dans Step1 — faisable mais scope additionnel.

#### 🟢 CONFLIT DE NOMENCLATURE 4 : "Niveaux" vs AgromindIA

Le produit a déjà des "niveaux d'affichage AgromindIA" (Level 1 Basic, Level 2 Bloqué, Level 3 Expert). Les 5 niveaux de calibration sont un concept différent.

**Recommandation** : Utiliser le terme `calibration_layers` ou `review_levels` dans le code, jamais `level1/level2` nus qui créeraient la confusion.

#### 🔴 CRITIQUE 5 : Conflit Tbase GDD — Code vs Protocole

**Conflit documenté** :
- **Code actuel** (`orchestrator.py:34`, `gdd_service.py:8`) : `TBASE_BY_CROP["olivier"] = 10.0°C`
- **Protocole JSON** (`protocole_agent_ia_1.json:23`) : `temperature_base_GDD.valeur = 7.5°C` (ref: Moriondo et al. 2001)
- **Moteur Calibrage IA (DOCX)** : Confirme 7.5°C comme base physiologique

**Impact** : Le GDD cumulé actuel sous-estime l'avancement phénologique par ~25% par rapport au protocole. Une phase "Floraison" attendue à GDD=350 serait atteinte ~87 jours plus tôt avec Tbase=7.5 qu'avec Tbase=10.0.

**Recommandation** : Ce conflit DOIT être résolu dans Phase 2 (T4.6 machine à états). Pour Phase 1, le DTO `CalibrationReviewView` doit exposer `base_temperature_used` (valeur du pipeline) ET `base_temperature_protocol: 7.5` (valeur protocole) pour que l'utilisateur puisse comparer. Cf. §4.2 `level3_biophysical.gdd`.

#### 🔴 CRITIQUE 6 : Règle "observation pure" du Moteur Calibrage vs Niveau 1 Décisionnelles

Le MOTEUR CALIBRAGE IA (DOCX, §1.2) stipule formellement :

> *"Pendant toute la durée du calibrage, l'IA est en mode OBSERVATION PURE. Cette règle est non négociable."*
> *"CE QUE TU NE DOIS PAS DIRE : Vous devriez irriguer davantage."*

Or le Niveau 1 "Décisionnelles" mappe actuellement les `recommendations` comme alertes (`source: "recommendation"`). Le moteur de calibrage n'est PAS censé générer des recommandations — c'est le moteur opérationnel (`operational-engine-spec.md`) qui le fait.

**Impact** : Le plan mélange deux phases du produit :
- **Calibration** (Phase 1) = observation pure, pas de recommandations
- **Opérationnel** (Phase 2) = recommandations, alertes, plan d'action

**Recommandation** : Niveau 1 en mode calibration doit :
1. Ne PAS inclure les `recommendations` existantes (elles sont générées par un autre module)
2. N'afficher que les **anomalies spectrales** et **événements météo** comme "signaux détectés"
3. Ajouter un avertissement : *"Aucune recommandation d'action n'est émise en phase calibrage (règle observation pure)"*
4. En phase `active` (post-calibration), les alertes opérationnelles OLI-01 à OLI-18 peuvent être injectées par le moteur opérationnel

#### 🟡 ATTENTION 7 : Système d'alertes — Portée sous-spécifiée

Le protocole JSON définit **6 alertes phénologiques** (Section 4), mais le `operational-engine-spec.md` définit un système plus large :
- **18 alertes oléoles** (OLI-01 à OLI-18) réparties en 6 catégories : hydriques, climatiques, nutritionnelles, sanitaires, phénologiques, structurelles
- Mécanisme d'hystérésis (seuil entrée ≠ seuil sortie)
- Priorisation 4 niveaux (URGENTE/PRIORITAIRE/VIGILANCE/INFORMATION)

**Recommandation** : Le plan Phase 1 doit préciser que les alertes du Niveau 1 viendront du moteur opérationnel (NestJS), pas du pipeline FastAPI. Le système d'alertes OLI-01 à OLI-18 est un système distinct à intégrer post-calibration.

### 3.3 Incohérences inter-documents identifiées

| Conflit | Source A | Source B | Résolution proposée |
|---------|---------|---------|-------------------|
| Tbase GDD olivier | Code = 10.0°C | Protocole = 7.5°C | Aligner code sur protocole en Phase 2. Exposer les deux valeurs dans l'export pour transparence. |
| Recommandations en calibration | Code a des `recommendations` | DOCX interdit | Séparer : les `recommendations` existantes ne sont pas montrées en Niveau 1 pendant le calibrage. |
| Nb alertes | Protocole = 6 alertes | Opérationnel = 18 alertes | Le protocole définit les alertes phénologiques. Le moteur opérationnel définit les alertes complètes. Ce sont deux systèmes différents. |
| Phase PHASE_5 absente | Protocole a Phase 0,1,2,3,4,6 | Pas de Phase 5 | Conforme au protocole — Phase 5 n'existe pas (passage direct de 4 à 6 ou de 4 à 0). |

---

## 4. ARCHITECTURE PROPOSÉE

### 4.1 Principe : Séparer calcul de présentation

```
┌─────────────┐      ┌──────────────────────────────┐      ┌─────────────────┐
│  FastAPI     │      │  NestJS                      │      │  Frontend       │
│  (port 8001) │─────▶│  (port 3001)                 │─────▶│  React          │
│             │      │                              │      │                 │
│ Calibration │      │ Orchestrate                  │      │ 5-Level Review  │
│ Pipeline    │      │ + Adapter                    │      │ + Export UI     │
│ (step1-8)   │      │ + Export                     │      │ + Expert Lecture│
│             │      │ + History                    │      │                 │
└─────────────┘      └──────────────────────────────┘      └─────────────────┘
       ↓                       ↓
  CalibrationOutput     CalibrationReviewView
  (IMMUABLE — contrat    (DÉRIVÉ — présentation)
   de calcul)
```

**Règle** : `CalibrationOutput` (step1-8) reste le contrat de calcul immuable. Le modèle de présentation `CalibrationReviewView` est construit par NestJS comme un adaptateur au-dessus.

**Contrat d'entrée de l'adapter** : Le `CalibrationReviewAdapter` ne prend PAS seulement `CalibrationOutput`. Il prend un **snapshot calibré complet** depuis la DB NestJS :

```typescript
interface CalibrationSnapshotInput {
  // Du snapshot persisté dans calibration_data
  calibration_id: string;
  parcel_id: string;
  generated_at: string;
  output: CalibrationV2Output;        // step1-8 immuable
  inputs: CalibrationV2Input;         // les inputs envoyés au pipeline
  confidence_score: number | null;
  status: string;                      // status du calibration run

  // Du contexte parcelle (NestJS)
  parcel_phase: CalibrationPhase;      // disabled | pret_calibrage | calibrating | ...
  organization_id: string;

  // De l'historique (NestJS)
  calibration_history: CalibrationHistoryRecord[];
}
```

C'est cet objet complet que l'adapter transforme en `CalibrationReviewView`.

### 4.2 Schéma `CalibrationReviewView` (nouveau DTO NestJS)

```typescript
interface CalibrationReviewView {
  // Lien vers le calibration immuable
  calibration_id: string;
  parcel_id: string;
  generated_at: string;
  schema_version: "calibration-review/v1";

  // Output brut (step1-8) — disponible pour export et expert
  output: CalibrationV2Output;

  // === LES 5 NIVEAUX DE REVIEW ===

  level1_decision: {
    // ⚠️ RÈGLE OBSERVATION PURE : en phase calibrage, PAS de recommandations d'action.
    // Les alertes ici = signaux détectés (anomalies, événements météo), pas des conseils.
    // Les recommandations OLI-01 à OLI-18 sont injectées par le moteur opérationnel en phase active uniquement.
    current_phase: {
      name: string;          // ex: "Stress estival (estimé)"
      method: "heuristic" | "protocol";  // "heuristic" tant que machine à états pas implémentée
      confidence: string;    // ELEVEE | MODEREE | FAIBLE
      date_start: string | null;
      estimated_date_end: string | null;
    };
    next_phase: {
      name: string | null;
      timing_estimate: string | null;
      condition: string | null;  // "Quand GDD > 350 ET Tmoy >= 18"
    };
    detected_signals: Array<{       // renommé de "active_alerts" — ce sont des signaux, pas des actions
      type: string;
      severity: "low" | "medium" | "high" | "critical";
      message: string;
      date: string;
      source: "anomaly" | "extreme_event";  // PAS "recommendation" en phase calibrage
    }>;
    // ⚠️ PHASE 2 — operational_alerts : le système OLI-01 à OLI-18 (18 alertes oléoles du
    // operational-engine-spec.md) n'est pas encore implémenté dans le codebase NestJS.
    // Le code actuel ne contient aucune implémentation des alertes opérationnelles.
    // Ce champ sera null en Phase 1 pour TOUT les états, y compris "active".
    // Phase 2 : après implémentation du moteur opérationnel, injecter les alertes ici.
    operational_alerts: Array<{
      code: string;             // "OLI-01", "OLI-02", etc.
      category: string;         // "hydrique" | "climatique" | "nutritionnel" | "sanitaire" | "phenologique" | "structurel"
      severity: string;
      message: string;
      hysteresis: { entry_threshold: string; exit_threshold: string };
    }> | null;  // ⚠️ TOUJOURS null en Phase 1 — non implémenté
  };

  level2_diagnostic: {
    signal_state: "SIGNAL_PUR" | "MIXTE_MODERE" | "DOMINE_ADVENTICES" | "NON_DISPONIBLE";
    signal_state_note?: string;  // "Classification non encore implémentée"
    mode: "NORMAL" | "AMORCAGE" | "OBSERVATION";
    mode_detail: string;        // ex: "2 cycles disponibles, minimum 3 recommandé"
    annotations: string[];      // ex: ["Adventices possibles — signal mixte", "Stress fonctionnel détecté"]
    phase_diagnostics: Record<string, {   // clé = nom de phase
      status: "detected" | "estimated" | "not_applicable";
      detail: string;
    }>;
    health_components: {
      vigor: number;
      temporal_stability: number;   // "homogeneity" dans step8, renommé pour clarté
      stability: number;            // stabilité basée sur les anomalies
      hydric: number;
      nutritional: number;
    };
    alternance: {
      detected: boolean;
      current_year_type: "on" | "off" | null;
      confidence: number;
    } | null;
  };

  level3_biophysical: {
    indices: {
      NIRv: Array<{ date: string; value: number; outlier: boolean }>;
      NIRvP: Array<{ date: string; value: number; outlier: boolean }> | null;  // null tant que pas extrait
      NDVI: Array<{ date: string; value: number; outlier: boolean }>;
      NDMI: Array<{ date: string; value: number; outlier: boolean }>;
      NDRE: Array<{ date: string; value: number; outlier: boolean }>;
      EVI: Array<{ date: string; value: number; outlier: boolean }>;
      GCI: Array<{ date: string; value: number; outlier: boolean }>;
    };
    gdd: {
      cumulative: Record<string, number>;   // "YYYY-MM" → GDD cumulé
      daily: Array<{ date: string; gdd_day: number; tmean: number }>;
      base_temperature_used: number;        // valeur utilisée par le pipeline (10.0°C actuel)
      base_temperature_protocol: number;     // valeur du protocole (7.5°C — Moriondo et al. 2001)
      chill_hours: number;
    };
    percentiles: Record<string, {
      p10: number; p25: number; p50: number; p75: number; p90: number;
      mean: number; std: number;
    }>;
  };

  level4_temporal: {
    phenology_timeline: {
      dormancy_exit: string;
      peak: string;
      plateau_start: string;
      decline_start: string;
      dormancy_entry: string;
      inter_annual_variability: Record<string, number>;
    };
    calibration_history: Array<{
      id: string;
      date: string;
      health_score: number | null;
      confidence_score: number | null;
      maturity_phase: string;
      status: string;
    }>;
    confidence: {
      total_score: number;
      normalized_score: number;
      components: Record<string, { score: number; max_score: number }>;
    };
  };

  level5_quality_audit: {
    filtering: {
      total_images_input: number;
      images_retained: number;
      images_rejected_cloud: number;
      average_cloud_coverage: number;
      outliers_removed: number;
      interpolated_dates: string[];
    };
    excluded_cycles: string[];          // IDs des cycles hors norme (vide si pas implémenté)
    data_quality_flags: string[];
    notes: string[];                     // ex: ["NIRvP non disponible — diagnostic floraison limité"]
  };

  // === EXPORT ===
  export: {
    available_formats: ("json" | "csv" | "zip")[];
    calibration_id: string;              // pour générer l'export immuable
  };
}
```

### 4.3 Endpoints proposés

| Service | Endpoint | Description | Response |
|---------|----------|-------------|----------|
| **NestJS** | `GET /calibration/:parcelId/review` | Retourne `CalibrationReviewView` (5 niveaux) | `application/json` — objet unique |
| **NestJS** | `GET /calibration/:calibrationId/export?format=json` | Export JSON complet (output + review) | `application/json` — objet unique avec `{ output, review, meta }` |
| **NestJS** | `GET /calibration/:calibrationId/export?format=csv` | Export CSV résumé (tableau unique) | `text/csv` — **un seul fichier** CSV contenant un résumé des 5 niveaux + métriques clés |
| **NestJS** | `GET /calibration/:calibrationId/export?format=zip` | Export ZIP complet (JSON + CSVs + manifest) | `application/zip` — archive contenant manifest.json + output.json + review.json + csv/ + quality/ |

> **Note** : `format=csv` retourne **un seul fichier CSV** (résumé exécutable), PAS un ZIP. Pour l'export multi-fichiers complet, utiliser `format=zip`.

**Pourquoi NestJS et pas FastAPI ?**
- NestJS possède déjà l'historique calibration, les métadonnées parcelle, et le contexte organisationnel
- L'architecture dicte : FastAPI = calcul satellite/GEE, NestJS = logique métier
- L'export doit inclure des données NestJS (historique, phase workflow) + données FastAPI (output)

### 4.4 Export — Contenu du ZIP

> **Principe "all raw data"** : L'utilisateur doit pouvoir comparer les données exportées avec ses propres observations terrain. L'export doit donc inclure non seulement les sorties du pipeline, mais aussi les entrées et les données intermédiaires qui permettent de retracer le raisonnement.
>
> **Principe "immutable snapshot"** : L'export par `calibration_id` contient les données persistées dans le snapshot `calibration_data` (output + inputs) **PLUS** des métadonnées dérivées calculées à l'export (quality/, audit/). Les métadonnées dérivées sont déterministes — elles ne changent pas entre deux exports du même `calibration_id`.
>
> **Distinction** :
> - **Données persistées** (output.json, inputs/, csv/) : proviennent directement du snapshot stocké — immuables
> - **Métadonnées dérivées** (review.json, quality/, audit/) : calculées par l'adapter NestJS à partir du snapshot — déterministes et reproductibles

```
calibration-export-{parcelId}-{calibrationId}-{date}.zip
├── manifest.json                    // métadonnées : parcelle, date, version, calibration_id
├── output.json                      // CalibrationOutput brut (step1-8) — immuable
├── review.json                      // CalibrationReviewView (5 niveaux)
├── inputs/
│   ├── calibration_input.json       // CalibrationInput complet envoyé au pipeline ✅ Phase 1
│   ├── harvest_records.json         // historique rendements déclarés ✅ Phase 1
│   ├── parcel_profile.json          // questionnaire réponses (Q01-Q11) ⚠️ Phase 1 : limité aux champs persistés dans CalibrationInput
│   ├── soil_analysis.json           // analyses de sol si disponibles ✅ Phase 1
│   ├── water_analysis.json          // analyses d'eau d'irrigation si disponibles ✅ Phase 1
│   ├── foliar_analysis.json         // analyses foliaires si disponibles ✅ Phase 1
│   └── cultural_history.json        // événements terrain ⚠️ Phase 1 : limité aux champs persistés
├── csv/
│   ├── satellite_indices.csv        // date, NDVI, NIRv, NDMI, NDRE, EVI, GCI, outlier, interpolated ✅ Phase 1
│   ├── satellite_acquisitions.csv   // date, cloud_coverage, retained (bool) ✅ Phase 1
│   │                                // ⚠️ Phase 2 : ajout de SCL_pixels_retained, SCL_pixels_total, rejection_reason
│   ├── weather_daily.csv            // date, temp_min, temp_max, precip, et0, gdd_day ✅ Phase 1
│   │                                // ⚠️ Phase 2 : ajout de PAR_MJ_m2 (nécessite extraction ERA5-Land)
│   ├── weather_monthly.csv          // month, precipitation_total, gdd_total, precip_annual_vs_historical ✅ Phase 1
│   ├── anomalies.csv                // date, anomaly_type, severity, index_name, value, previous_value, deviation, excluded, weather_ref ✅ Phase 1
│   ├── extreme_events.csv           // date, event_type, severity ✅ Phase 1
│   ├── zones.csv                    // class_name, surface_percent ✅ Phase 1
│   ├── phenology.csv                // stage, date, variability_days, gdd_correlation ✅ Phase 1
│   └── gdd_accumulation.csv         // month, gdd_cumulative, base_temperature_used, base_temperature_protocol, chill_hours ✅ Phase 1
├── quality/
│   ├── confidence.json              // score + composants + qualité par composant ✅ Phase 1
│   ├── filtering.json               // images input/retained/rejected, cloud coverage, outliers ✅ Phase 1
│   │                                // ⚠️ Phase 2 : ajout du filtrage règle-par-règle (REGLE_1_1 à REGLE_1_6)
│   ├── data_quality_flags.json      // flags + explications ✅ Phase 1
│   └── excluded_cycles.json         // cycles marqués hors_norme ⚠️ Phase 1 : vide (non implémenté)
│                                    // Phase 2 : cycles avec justification (Règle 1.5)
└── audit/
    ├── rules_applied.json           // ⚠️ MÉTADONNÉE DÉRIVÉE (non persistée) — chaque règle du protocole
    │                                // Phase 1 : stub avec status "not_implemented"/"partial" pour chaque règle
    │                                // Phase 2 : status "applied"/"skipped" avec detail
    └── protocol_compliance.json     // MÉTADONNÉE DÉRIVÉE — conformité section par section + écarts documentés ✅ Phase 1 (partiel)
```

**Données Phase 1 vs Phase 2** :

| Fichier/Champ | Phase 1 (actuel) | Phase 2 (protocole complet) |
|---------------|:---:|:---:|
| `satellite_indices.csv` (date, value, outlier) | ✅ | ✅ |
| `satellite_acquisitions.csv` (SCL pixels, rejection reason) | ❌ | ✅ |
| `weather_daily.csv` (PAR) | ❌ | ✅ |
| `audit/rules_applied.json` (règle par règle) | ⚠️ stub | ✅ |
| `excluded_cycles.json` | ⚠️ vide | ✅ |
| `filtering.json` (règle par règle) | ❌ | ✅ |

**Pourquoi cette distinction** : Le pipeline actuel ne persiste pas les données d'audit par acquisition (SCL pixel counts, rejection reasons) ni le filtrage règle par règle. Promettre ces données dans l'export Phase 1 créerait des fichiers vides ou des stubs trompeurs. Mieux vaut être explicite : Phase 1 exporte ce qui existe, Phase 2 complète avec l'audit complet.

**Points clés** :
- **Données rejetées** : `satellite_acquisitions.csv` Phase 1 inclut les acquisitions avec `retained: false` et `cloud_coverage` — suffisant pour identifier les images rejetées par seuil nuageux. Le détail SCL pixels viendra en Phase 2.
- **Provenance PAR** : `weather_daily.csv` n'inclut PAS PAR en Phase 1 (non extrait). Une note dans le manifest précise : `"par_available": false, "nirvp_note": "NIRvP cannot be recalculated without PAR data"`.
- **Inputs utilisateur** : `inputs/` contient les données terrain déclarées et persistées dans le snapshot — sans elles, l'export ne permet pas de comparaison complète.
- **Audit règle par règle** : Phase 1 génère un stub avec `status: "not_implemented"` pour les règles non codées (REGLE_1_2, REGLE_1_5, REGLE_1_6, REGLE_2_x, REGLE_3_x, REGLE_4_x). Les règles partiellement implémentées (REGLE_1_1 filtrage nuageux) ont `status: "partial"`.

**Ne pas inclure** : les binaires raster/images (trop volumineux). Inclure les chemins de stockage `raster_paths` comme références. Un mode "forensic" avec rasters pourra être ajouté ultérieurement si demandé.

### 4.5 "Lecture Expert" — Approche recommandée

La "Lecture Expert" (point critique) doit être un **audit déterministe généré par le backend**, pas par l'IA. L'IA peut ensuite le narrater, mais ne doit pas inventer les sources.

**Structure de l'audit :**

```typescript
interface ExpertAudit {
  // Quelles règles ont été appliquées
  rules_applied: Array<{
    rule_id: string;         // "REGLE_1_1", "REGLE_1_2", etc.
    name: string;            // "Masque nuageux"
    status: "applied" | "skipped" | "not_implemented";
    detail: string;          // "23 images retenues sur 31"
  }>;

  // Quelles données manquent
  missing_data: Array<{
    field: string;           // "NIRvP", "signal_state", etc.
    impact: string;          // "Diagnostic floraison limité"
    workaround: string | null; // "Utiliser NIRv seul comme proxy"
  }>;

  // Points d'attention pour l'expert
  expert_notes: Array<{
    severity: "info" | "warning" | "critical";
    category: string;        // "methodology" | "data_gap" | "reliability"
    note: string;            // "La phase actuelle est estimée par méthode heuristique, pas par machine à états du protocole"
  }>;

  // Conformité au protocole
  protocol_compliance: {
    section_1_filtering: "partial" | "full" | "none";
    section_2_classification: "none";    // toujours "none" pour l'instant
    section_3_diagnostic: "none";         // toujours "none" pour l'instant
    section_4_alerts: "none";             // toujours "none" pour l'instant
    overall: "partial" | "minimal" | "none";
  };
}
```

**Positionnement UI** : La Lecture Expert apparaît comme une section collapsible en haut de la page calibration (après le banner de phase, avant les 5 niveaux).

**Visibilité par état** (`AiPhase` du backend : `disabled | downloading | pret_calibrage | calibrating | paused | awaiting_validation | awaiting_nutrition_option | active`) :

> **Note** : Le frontend `CalibrationPhase` (`calibration-v2.ts:9-17`) omet `downloading`. Le backend `AiPhase` (`calibration-state-machine.ts:5-13`) l'inclut. Phase 1 devrait aligner le frontend type pour inclure `downloading`.

| État | Lecture Expert visible ? | Export visible ? | Raison |
|------|:---:|:---:|--------|
| `disabled` | ❌ | ❌ | Pas encore de calibration |
| `downloading` | ❌ | ❌ | Téléchargement des données satellite en cours — pas encore de résultats |
| `pret_calibrage` | ❌ | ❌ | Pas encore de données |
| `calibrating` | ❌ | ❌ | En cours de pipeline — pas encore de résultats |
| `paused` | ❌ | ❌ | Calibration interrompue — résultats partiels, pas fiables pour audit |
| `awaiting_validation` | ✅ | ✅ | Résultats disponibles — l'expert peut auditer avant validation |
| `awaiting_nutrition_option` | ✅ | ✅ | Résultats disponibles — l'expert peut auditer |
| `active` | ✅ | ✅ | Résultats validés — audit complet disponible |

En mode `active` avec `observation_only` (confidence < 0.25), afficher un bandeau supplémentaire rappelant les limites de l'audit.

---

## 5. PLAN D'IMPLÉMENTATION PHASÉ

### Phase 1 : Réorganisation + Export + Audit (Medium effort)

Cette phase ne modifie PAS le pipeline de calcul. Elle réorganise l'existant.

#### Wave 1 (Backend NestJS)
| Tâche | Description | Fichier(s) |
|-------|-------------|------------|
| **T1.1** | Créer le DTO `CalibrationReviewView` avec les 5 niveaux | `agritech-api/src/modules/calibration/dto/calibration-review.dto.ts` (nouveau) |
| **T1.2** | Créer le service d'adaptation `CalibrationReviewAdapter` qui transforme `CalibrationSnapshotInput → CalibrationReviewView` (cf §4.1 pour le contrat d'entrée complet) | `agritech-api/src/modules/calibration/calibration-review.adapter.ts` (nouveau) |
| **T1.3** | Créer l'endpoint `GET /calibration/:parcelId/review` | `agritech-api/src/modules/calibration/calibration.controller.ts` (modifier) |
| **T1.4** | Créer l'endpoint `GET /calibration/:calibrationId/export` avec support JSON/CSV/ZIP | `agritech-api/src/modules/calibration/calibration-export.controller.ts` (nouveau) |
| **T1.5** | Implémenter la logique d'export CSV (réutiliser le pattern `toCsv` du frontend ou utiliser un CSV writer NestJS) | `agritech-api/src/modules/calibration/calibration-export.service.ts` (nouveau) |
| **T1.6** | Générer l'audit `ExpertAudit` basé sur les flags et données disponibles | Inclus dans T1.2 (adapter) |

#### Wave 2 (Frontend)
| Tâche | Description | Fichier(s) |
|-------|-------------|------------|
| **T2.1** | Créer les types TypeScript `CalibrationReviewView` | `project/src/types/calibration-review.ts` (nouveau) |
| **T2.2** | Créer le hook `useCalibrationReview(parcelId)` | `project/src/hooks/useCalibrationReview.ts` (nouveau) |
| **T2.3** | Créer les composants de chaque niveau (5 composants collapsibles) | `project/src/components/calibration/review/` (nouveau dossier) |
| **T2.4** | Créer le composant `ExpertLecture` (audit section) | `project/src/components/calibration/review/ExpertLecture.tsx` (nouveau) |
| **T2.5** | Créer le composant `CalibrationExportButton` (téléchargement JSON/CSV/ZIP) | `project/src/components/calibration/review/CalibrationExportButton.tsx` (nouveau) |
| **T2.6** | Refondre la page calibration pour utiliser les 5 niveaux + Expert Lecture + Export | `project/src/routes/.../parcels.$parcelId.ai.calibration.tsx` (modifier) |
| **T2.7** | Ajouter les clés i18n pour les 5 niveaux (en, fr, ar) | `project/src/locales/{en,fr,ar}/` (modifier) |

#### Wave 3 (QA)
| Tâche | Description |
|-------|-------------|
| **T3.1** | Tests unitaires NestJS : adapter DTO transformation |
| **T3.2** | Tests unitaires NestJS : export CSV/JSON/ZIP |
| **T3.3** | Tests intégration : endpoint review + export |
| **T3.4** | Vérification UI : les 5 niveaux rendent correctement |

### Phase 2 : Implémentation du protocole (Large effort — nécessite validation CEO)

Cette phase implémente les features manquantes du protocole.

#### Wave 4 (FastAPI — Pipeline)
| Tâche | Description | Pré-requis |
|-------|-------------|-----------|
| **T4.1** | Ajouter l'extraction PAR depuis ERA5-Land → calcul NIRvP | `step1_satellite_extraction.py` |
| **T4.2** | Implémenter le filtrage de plausibilité temporelle (Règle 1.2) | `step1_satellite_extraction.py` |
| **T4.3** | Implémenter le filtrage années pluviométriques extrêmes (Règle 1.5) | `step3_percentile_calculation.py` |
| **T4.4** | Implémenter le lissage Whittaker/Savitzky-Golay (Règle 1.6) | Nouveau `step1b_smoothing.py` |
| **T4.5** | Implémenter la classification de l'état du signal (Section 2) | Nouveau `step2b_signal_classification.py` |
| **T4.6** | Implémenter la machine à états phénologique (Section 3) | Refonte `step4_phenology_detection.py` |
| **T4.7** | Implémenter le système d'alertes (Section 4) | Nouveau `step4b_alerts.py` |
| **T4.8** | Ajouter l'audit trail déterministe (règles appliquées, exclusions) | Modification orchestrateur |

#### Wave 5 (Mise à jour des niveaux)
| Tâche | Description |
|-------|-------------|
| **T5.1** | Mettre à jour l'adapter NestJS pour peupler les champs "NON_DISPONIBLE" avec les vraies données |
| **T5.2** | Mettre à jour `protocol_compliance` dans ExpertAudit |
| **T5.3** | Supprimer les avertissements "méthode heuristique" des niveaux 1-2 |

---

## 6. RISQUES ET POINTS DE DÉCISION

### Décisions à prendre par le CEO

| # | Décision | Options | Impact |
|---|---------|---------|--------|
| **D1** | **Portée Phase 1** | A) Réorganisation UI seule (frontend) B) Réorg + Export + Expert Lecture (NestJS + frontend) | B est recommandé — l'export sans backend ne peut pas être immuable ni inclure l'historique |
| **D2** | **"Phase actuelle" en l'absence de machine à états** | A) Afficher la phase estimée avec avertissement B) Ne pas afficher de phase C) Implémenter la machine à états d'abord | A recommandé pour Phase 1 — permet de livrer vite sans faux-semblant |
| **D3** | **NIRvP** | A) Laisser vide/null avec note B) Ajouter extraction PAR + calcul NIRvP dans Phase 1 | A recommandé pour Phase 1 — B est faisable mais ajoute du scope |
| **D4** | **Lecture Expert : IA vs Déterministe** | A) Audit déterministe (backend) + narration IA (AgromindIA) B) Audit déterministe uniquement C) IA uniquement | A recommandé — l'audit donne la source de vérité, l'IA la rend lisible |
| **D5** | **Export : inclure les rasters ?** | A) Non (références seulement) B) Oui (ZIP avec GeoTIFF) C) Optionnel (paramètre ?include_rasters=true) | A recommandé — les rasters peuvent faire plusieurs GB |

### Risques techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|:-----------:|:------:|------------|
| L'adapter NestJS devient un "god object" | Moyen | Moyen | Garder l'adapter stateless, testable unitairement |
| Export ZIP volumineux (> 50MB) | Faible | Moyen | Limiter les CSVs aux indices principaux, pas toutes les bandes brutes |
| Confusion nomenclature niveaux | Élevé | Faible | Utiliser `calibration_layers` dans le code, jamais `level1/2/3` nus |
| Performance endpoint review | Faible | Faible | Le review est calculé à la volée depuis les données persistées — pas de pipeline |

---

## 7. RÉSUMÉ EXÉCUTIF

| Question | Réponse |
|----------|---------|
| **Peut-on livrer la réorganisation 5 niveaux avec les données actuelles ?** | Oui, avec des champs marqués "non disponible" là où le protocole n'est pas implémenté |
| **L'export est-il faisable sans FastAPI ?** | Oui — NestJS a déjà les données persistées (`calibration_data.output`) |
| **La "Lecture Expert" peut-elle être utile immédiatement ?** | Oui — même avec des "non disponible", l'audit montre honnêtement ce qui est calculé vs ce qui manque |
| **Faut-il implémenter la machine à états phénologique ?** | Pas dans Phase 1. C'est un travail distinct (Phase 2) qui nécessite validation CEO |
| **Est-ce que ça casse l'existant ?** | Non — `CalibrationOutput` reste immuable. Le `CalibrationReviewView` est un adaptateur au-dessus |

### Recommendation

**Livrer Phase 1** : Réorganisation 5 niveaux + Export + Expert Lecture = **Medium effort**, valeur immédiate pour les utilisateurs (transparence, comparaison, audit).

**Planifier Phase 2** : Machine à états + classification signal + NIRvP + alertes = **Large effort**, nécessite une itération dédiée avec validation CEO.

---

## 8. VALIDATION — Matrice de validation

### 8.1 Validation croisée : nouveaux endpoints vs logique existante

**Backend (NestJS)** :

| Scénario | Endpoint | Résultat attendu | Critère de succès |
|----------|----------|-----------------|------------------|
| **Parcelle sans calibration** | `GET /:parcelId/review` | 404 | Ne retourne jamais de review sans calibration complété |
| **Parcelle downloading** | `GET /:parcelId/review` | 404 | Données satellite en cours de téléchargement — pas de review |
| **Parcelle calibrating** | `GET /:parcelId/review` | 404 | Le calibration n'est pas encore terminé — pas de review |
| **Parcelle paused** | `GET /:parcelId/review` | 404 | Calibration interrompu — résultats partiels non exposés |
| **Parcelle awaiting_validation** | `GET /:parcelId/review` | 200 + 5 niveaux | `base_temperature_used` et `base_temperature_protocol` affichés. Tous champs "NON_DISPONIBLE" marqués. |
| **Parcelle active (confidence < 0.25)** | `GET /:parcelId/review` | 200 + 5 niveaux | `operational_alerts` est null (Phase 1). `detected_signals` contient anomalies + météo. |
| **Parcelle active (confidence >= 0.25)** | `GET /:parcelId/review` | 200 + 5 niveaux complets | `operational_alerts` est null (Phase 1 — non implémenté). |
| **Export JSON** | `GET /:calibrationId/export?format=json` | 200 + `{ output, review, meta }` | `output` est identique au snapshot stocké (pas de recalcul). `review` et `meta` sont des métadonnées dérivées déterministes. |
| **Export CSV** | `GET /:calibrationId/export?format=csv` | 200 + `text/csv` | Un seul fichier CSV résumé |
| **Export ZIP** | `GET /:calibrationId/export?format=zip` | 200 + `application/zip` | Archive multi-fichiers conforme §4.4 |
| **Export avec calibrationId différent** | `GET /:calibrationId/export` | Retourne le snapshot de CE calibration, pas le plus récent | Immuable par ID |

**Frontend (React)** :

| Scénario | Comportement | Critère de succès |
|----------|-------------|------------------|
| **Navigation vers /calibration** | Le routeur vérifie le statut avant d'appeler le endpoint review | Pas d'appel API inutile pour `disabled`, `downloading`, `pret_calibrage`, `calibrating`, `paused` |
| **Clic export** | Bouton visible uniquement pour `awaiting_validation`, `awaiting_nutrition_option`, `active` | Pas de bouton export pour états sans données |

### 8.2 Régression : endpoints existants non impactés

| Endpoint existant | Impact attendu | Vérification |
|-------------------|---------------|-------------|
| `POST /v2/run` (FastAPI) | Aucun changement — `CalibrationOutput` immuable | Comparer la réponse avant/après |
| `GET /calibration/:parcelId` (NestJS report) | Aucun changement — structure existante préservée | Le `report.output` reste identique |
| `GET /calibration/:parcelId/history` (NestJS) | Aucun changement | L'historique des calibration_id est intact |
| `POST /calibration/:parcelId/validate` (NestJS) | Aucun changement | Validation flow identique |
| Frontend `useAICalibration` hook | Aucun changement — hook existant toujours disponible | La page peut utiliser l'ancien OU le nouveau mode |
| Tests existants calibration (`*.spec.ts`) | Tous passent — aucun test modifié | `npm run test` dans agritech-api |

### 8.3 Checklist pré-implémentation

**Approbations** :
- [x] CEO a validé la portée Phase 1 (réorg + export + audit, sans machine à états)
- [x] CEO a tranché sur les 5 décisions (D1-D5 : full NestJS+frontend, phase estimée avec warning, NIRvP null, déterministe+IA, pas de rasters)
- [x] Oracle round 1 : 7 issues identifiés → tous fixés dans v1.1
- [x] Oracle round 2 : 6 issues identifiés → tous fixés dans v1.2
- [x] Oracle round 3 : 3 issues identifiés → tous fixés dans v1.3
- [x] Oracle round 4 : 2 issues identifiés → tous fixés dans v1.4

**Pré-requis techniques** :
- [ ] Équipe frontend valide le nouveau layout 5 niveaux
- [ ] Équipe backend valide l'approche adapter NestJS
- [ ] Les tests existants passent toujours (backward compat)
- [ ] Export contient toutes les données brutes PERSISTÉES (inputs + outputs + rejets) — cf §4.4 pour la distinction Phase 1/2
- [ ] Lecture Expert disponible pour awaiting_validation ET awaiting_nutrition_option ET active
- [ ] Adapter prend `CalibrationSnapshotInput` (pas seulement `CalibrationOutput`) — cf §4.1

**Points de vigilance Phase 1** :
- `operational_alerts` est TOUJOURS null (système OLI-01 à OLI-18 non implémenté)
- `satellite_acquisitions.csv` n'a pas SCL pixels counts (données non persistées)
- `audit/rules_applied.json` est un stub (règles protocole non implémentées)
- `health_components` inclut `temporal_stability` (alias de `homogeneity` dans step8)

### 8.4 Revue multi-agent — Notes de synthèse

Ce plan a été élaboré avec les contributions suivantes :

| Agent | Rôle | Contribution |
|-------|------|--------------|
| **Explore** (×3) | Recherche codebase | Exploration du pipeline FastAPI (17 fichiers calibration), du frontend (10 fichiers calibration), et des patterns d'export existants |
| **Oracle** (round 1) | Architecture critique | Revue du mapping 5 niveaux → step1-8, identification du Tbase conflict (7.5 vs 10), recommandation de séparer calcul de présentation, validation de l'approche adapter NestJS. **7 issues identifiés, tous fixés dans v1.1.** |
| **Oracle** (round 2) | Vérification critique | Re-vérification v1.1 : 3 issues partiellement fixés + 5 nouveaux blocages identifiés (Tbase DTO inconsistency, export format contracts, adapter input under-specified, export over-promises, missing states, operational_alerts not grounded, health_components incomplete, approval status contradiction). **Tous fixés dans v1.2.** |
| **Direct analysis** | Synthèse multi-doc | Identification de 7 incohérences inter-documents (Tbase, observation pure, alertes, nomenclature), mapping complet de chaque niveau |
