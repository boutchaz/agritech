# Design — AgromindIA V2 Integration

## Key Decisions (from discovery)

### D1. English table names, V2 column semantics
Keep all existing table names in English (`calibrations`, `parcels`, `ai_recommendations`, `annual_plans`, `plan_interventions`). Restructure columns to match V2 data model. Add missing tables with English names.

### D2. Multi-tenant organization_id everywhere
V2 spec uses `utilisateur_id` — we keep `organization_id` on every table per CLAUDE.md CRITICAL rule. RLS policies use `is_organization_member()`.

### D3. Fresh DB, no migration
Preprod only — rewrite tables in `00000000000000_schema.sql`. No data migration scripts. `db:reset && db:generate-types` after.

### D4. Parcel lifecycle states (V2, English)
```
awaiting_data → ready_calibration → calibrating → calibrated → awaiting_nutrition_option → active → archived
```
Replaces current: `disabled | calibration | calibrating | awaiting_validation | awaiting_nutrition_option | active | paused`

### D5. Calibration record columns
- `type`: `'initial' | 'F2_partial' | 'F3_complete'` — what triggered it
- `mode_calibrage`: `'lecture_pure' | 'calibrage_progressif' | 'calibrage_complet' | 'calibrage_avec_signalement' | 'collecte_donnees' | 'age_manquant'` — how engine behaved
- `phase_age`: `'juvenile' | 'entree_production' | 'pleine_production' | 'senescence'`
- Extracted columns: `p50_ndvi`, `p50_nirv`, `p50_ndmi`, `p50_ndre`, `p10_ndvi`, `p10_ndmi`, `coefficient_etat_parcelle`
- `calibrations.status`: `'awaiting_validation' | 'validated' | 'insufficient' | 'archived'` (+ `in_progress`, `failed` for engine runs)

### D6. Hybrid recommendation architecture
```
ai_diagnostic_sessions              — one row per AI analysis run
├── chemin (A_plan_standard | B_recommendations | C_observation)
├── engine_output JSONB             — full AI response
└── calibration_id FK

ai_recommendations                  — one row per actionable recommendation
├── session_id FK                   — links to diagnostic run
├── alert_code (OLI-01..OLI-20)
├── priority (urgent | priority | vigilance | info)
├── status (proposed | validated | waiting | executed | evaluated | closed | rejected | expired)
├── type (irrigation | fertilisation | phytosanitary | pruning | information | other)
├── bloc_1..bloc_6 JSONB            — 6-bloc structure
├── theme                           — for frequency limit tracking
├── expires_at
└── evaluated_at

recommendation_events               — lifecycle journal
├── recommendation_id FK
├── from_status, to_status
├── decider (ia | user)
├── motif TEXT
└── created_at
```

### D7. MOTEUR_CONFIG.json on disk
```
referentials/
├── MOTEUR_CONFIG.json              — culture-agnostic engine config (loaded once, cached)
├── DATA_OLIVIER_v5.json            — replaces DATA_OLIVIER.json
├── DATA_AGRUMES_v1.json            — (may need v2 update later)
├── DATA_AVOCATIER_v1.json
└── DATA_PALMIER_DATTIER_v1.json
```
`crop-reference-loader.ts` extended to load + cache MOTEUR_CONFIG.

### D8. V2 prompts replace V1
```
libs/agromind-ia/prompts/
├── calibration_prompt.ts     → calibrage.prompt.v3.ts    (buildCalibrageSystemPrompt + buildCalibrageUserPrompt)
├── annual_plan_prompt.ts     → plan_annuel.prompt.v3.ts  (buildPlanAnnuelSystemPrompt + buildPlanAnnuelUserPrompt)
├── recommendations_prompt.ts → operationnel.prompt.v3.ts (buildOperationnelSystemPrompt + buildOperationnelUserPrompt)
├── followup_prompt.ts        → (kept, may adapt later)
└── (new) recalibrage.prompt.ts                           (buildRecalibrageSystemPrompt + user prompts F2/F3)
```
Each prompt builder takes `(moteurConfig, referentiel)` and injects them as JSON into system prompt.

### D9. V2 types as source of truth
`agromind.types.ts` from V2 spec becomes the TypeScript contract for all AI engine I/O:
- `CalibrageInput / CalibrageOutput`
- `OperationnelInput / OperationnelOutput`
- `PlanAnnuelInput / PlanAnnuelOutput`
- `RecalibrageInput / RecalibrageOutput`
- `RecommandationComplete` (6-bloc structure)
- Lifecycle enums: `StatutRecommandationReactive`, `StatutRecommandationPlanifiee`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         NestJS API                               │
│                                                                  │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────────┐  │
│  │ Calibration  │   │ AI Reports    │   │ Recommendations    │  │
│  │ Module       │   │ Module        │   │ Module             │  │
│  │              │   │               │   │                    │  │
│  │ - state      │   │ - prompt      │   │ - governance       │  │
│  │   machine    │   │   builders    │   │   state machine    │  │
│  │ - phase_age  │   │ - provider    │   │ - frequency limits │  │
│  │   detection  │   │   routing     │   │ - lifecycle        │  │
│  │ - nutrition  │   │               │   │   journal          │  │
│  │   option     │   │               │   │ - co-occurrence    │  │
│  └──────┬───────┘   └──────┬────────┘   └────────┬───────────┘  │
│         │                  │                      │              │
│  ┌──────┴──────────────────┴──────────────────────┴───────────┐  │
│  │              Referential Loader (cached)                    │  │
│  │  MOTEUR_CONFIG.json + DATA_{CULTURE}_v*.json               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              Supabase (PostgreSQL)                          │  │
│  │  parcels | calibrations | ai_diagnostic_sessions           │  │
│  │  ai_recommendations | recommendation_events                │  │
│  │  annual_plans | plan_interventions                         │  │
│  │  evenements_parcelle | suivis_saison                       │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Risks

1. **Prompt token budget**: MOTEUR_CONFIG (54KB) + referentiel (94KB) = ~148KB injected as JSON into system prompt. May exceed context window on some models. Mitigation: only inject relevant sections, not full JSON.
2. **Referentiel version sync**: referentiel files on disk must match what the V2 prompts expect. Mitigation: version check in loader, fail fast if schema mismatch.
3. **Frontend breakage**: Changed data shapes from hooks will break components. Mitigation: update types first, then fix compile errors systematically.
4. **Test rewrite volume**: ~33 calibration DB calls + integration tests need updating. Mitigation: batch by module, test each layer independently.
