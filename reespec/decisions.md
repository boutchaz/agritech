# Decisions

Architectural and strategic decisions across all requests.
One decision per entry. One paragraph. Reference the request for details.

## Entry format

### <Decision title> — YYYY-MM-DD (Request: <request-name>)

What was decided and why. What was considered and rejected.
See request artifacts for full context.

---

## What belongs here
- Library or technology choices with rationale
- Architectural patterns adopted
- Approaches explicitly rejected and why
- Deviations from the original plan with explanation
- Decisions that constrain future work

## What does NOT belong here
- Activity entries ("added X", "removed Y", "refactored Z")
- Implementation details available in request artifacts
- Decisions too small to affect future planning

---

<!-- decisions below this line -->

### Blog SSR via NestJS HTML routes, extract later if needed — 2026-03-30 (Request: blog-next-level)

Blog pages will be server-rendered by NestJS, which already runs and already has the Strapi integration. New routes (GET /blog, GET /blog/:slug, GET /sitemap.xml, GET /rss.xml) return HTML/XML instead of JSON, reusing the existing BlogsService. Nginx proxies /blog/* to NestJS instead of serving the SPA. Considered and rejected: TanStack Start (requires full build system migration from Vite to Vinxi, overkill for 4 routes), separate Astro/Hono service (unnecessary complexity for 5 endpoints), Next.js (too heavy). If the blog grows significantly in the future, extract to a dedicated service then.

### Morocco accounting_standard normalized to CGNC — 2026-03-26 (Request: generic-accounting-mappings)

SQL schema seeds used 'PCEC' for Morocco while TypeScript code used 'CGNC'. Standardized everything to CGNC (Code Général de Normalisation Comptable) since that's what the chart template metadata and getSupportedCountries() use. All 57 PCEC references in the schema migration were replaced.

### Unified account resolution through account_mappings — 2026-03-26 (Request: generic-accounting-mappings)

All accounting flows (invoices, payments, costs, revenue, worker payments) now resolve GL accounts through `AccountingAutomationService.resolveAccountId()` which queries the `account_mappings` table. No service directly looks up accounts by hardcoded code. Previously, invoices.service and payments.service hardcoded US GAAP codes (1200, 2110, 2150, 1110) which didn't exist in any non-US chart of accounts.

### applyTemplate sets org accounting context and initializes mappings — 2026-03-26 (Request: generic-accounting-mappings)

When applying a country chart template, the system now: (1) sets `country_code` and `accounting_standard` on the organization, (2) inserts all chart accounts, (3) calls `initializeDefaultMappings` to create org-level account_mappings with resolved account_ids. Previously, accounting context was never set on the org and account_mappings_created was always 0.

### Chat connects to AgromindIA via delegation, not duplication — 2026-03-26 (Request: chat-polish)

AgromindiaContextService calls existing services (AiDiagnosticsService, AiRecommendationsService, AnnualPlanService, AiReferencesService, CalibrationService) in parallel to fetch computed intelligence per parcel. It does NOT query DB tables directly for AI data. This ensures the chat always reflects the same intelligence shown on the /parcels/:id/ai pages. The service is wired into ContextBuilder via ChatService.onModuleInit setter pattern to avoid constructor circular dependencies.

### Remove all chat caching (response + module) — 2026-03-26 (Request: chat-polish)

Both the response cache (Map<query, AI response>) and module cache (Map<orgId:module, DB data>) were removed from ChatService. Response cache bypassed AI quota/metering — cached responses weren't counted. Module cache served stale data with no invalidation, didn't work across multiple instances, and the underlying Supabase queries with `.limit(3)` are fast enough. With AgromindIA integration coming, stale diagnostics/recommendations would produce wrong advice. Every chat message now does fresh DB queries and a real AI call.

### Pre-existing seed data bugs fixed for cash/tax accounts — 2026-03-26 (Request: generic-accounting-mappings)

Multiple countries had cash mapping account codes that didn't match their actual chart of accounts: MA (514→5141, 511→5161), TN (53→52/511), GB (1200→232, 1220→231), DE (1100→1000). Tunisia and Germany also lacked separate input VAT accounts in their charts — used closest equivalents with notes to configure manually.

### AgromindIA V2: English table names, V2 column semantics — 2026-04-04 (Request: agromind-v2-integration)

All DB tables keep English names (calibrations, parcels, ai_recommendations, annual_plans, plan_interventions). The V2 spec proposed French names (calibrages, recommandations, taches_calendrier) but renaming would touch 143+ from() calls across the backend plus frontend types/hooks. Column structures and enums adopt V2 semantics. Multi-tenant organization_id kept on all tables per CLAUDE.md CRITICAL rule — V2 spec used utilisateur_id which was rejected.

### AgromindIA V2: Hybrid recommendation architecture — 2026-04-04 (Request: agromind-v2-integration)

Recommendations use a hybrid model: ai_diagnostic_sessions stores full AI engine output per analysis run (one row per satellite pass), ai_recommendations stores individual actionable items as separate rows (for governance lifecycle), recommendation_events journals every state transition. The V2 spec proposed embedding recommendations as JSONB inside a session row, but the governance spec requires per-recommendation state tracking (8 states, expiration timers, evaluation windows, frequency limits per theme) which is fundamentally relational — not JSONB-friendly.

### AgromindIA V2: Parcel lifecycle replaces ai_phase — 2026-04-04 (Request: agromind-v2-integration)

Parcel ai_phase values replaced with V2 lifecycle: awaiting_data → ready_calibration → calibrating → calibrated → awaiting_nutrition_option → active → archived. Old values (disabled, calibration, pret_calibrage, paused) removed. awaiting_validation removed as a parcel state — it lives on the calibration record instead. awaiting_nutrition_option kept as a parcel-level gate before activation.

### AgromindIA V2: Config-driven prompts replace hardcoded prompts — 2026-04-04 (Request: agromind-v2-integration)

V1 prompts embedded all agronomic rules in prompt text. V2 prompts are meta-programs: they take (moteurConfig, referentiel) as arguments and JSON.stringify them into the system prompt. MOTEUR_CONFIG.json (54KB, culture-agnostic) and DATA_{CULTURE}_v*.json (per-culture referentiel) are loaded from disk via crop-reference-loader.ts. This makes agronomic rules editable without code changes and keeps prompts consistent across cultures.

### Chat action tools use @IsString() instead of @IsUUID() for tool parameter validation — 2026-04-06 (Request: chat-action-tools)

SWC decorator compilation with @IsUUID() from class-validator fails silently in Jest tests — validated UUIDs are rejected. Switched to @IsString() for all UUID-type parameters in chat tool validation classes (CreateTaskParams, MarkInterventionDoneParams). Entity existence is validated by the subsequent Supabase lookup (which also enforces org-scoping), so the UUID format validation is redundant. The @IsUUID() decorators work fine in other NestJS modules compiled with tsc but not in the SWC-based jest transform.

### AgromindIA V2: mode_calibrage gets V2 engine semantics — 2026-04-04 (Request: agromind-v2-integration)

The calibrations.mode_calibrage column changes meaning: old values (full/partial/annual) described what triggered the calibration; V2 values (lecture_pure/calibrage_progressif/calibrage_complet/calibrage_avec_signalement/collecte_donnees/age_manquant) describe how the engine behaved based on parcel maturity. A new `type` column (initial/F2_partial/F3_complete) takes over the trigger-type responsibility.

### Journal entries as single source of truth for all profitability — 2026-04-08 (Request: profitability-consolidation)

All profitability calculations (parcel-level, crop-cycle-level, org-level) must derive exclusively from journal_entries/journal_items. The dual-path system — where crop_cycles.recalculateProfitability() read from financial_transactions while profitability.getParcelProfitability() read from costs+revenues+operational tables — is retired. Costs/revenues tables remain as data entry mechanisms but only count toward profitability once posted to the journal. Considered keeping the triple-source approach for backward compatibility but rejected it: two paths guaranteed number mismatches between views.

### Account mappings are mandatory — hard fail on missing mappings — 2026-04-08 (Request: profitability-consolidation)

When creating any cost or revenue (manual, labor, material, harvest, metayage), the system must fail the entire operation if account mappings are not configured — no silent fallback, no orphaned records without journal entries. Previously the backend logged a warning and saved the cost/revenue without a journal entry, creating orphaned records invisible to profitability. This was rejected because it breaks the journal-as-source-of-truth invariant.

### All operational modules must create journal entries — 2026-04-08 (Request: profitability-consolidation)

Work records (labor), product applications (materials), harvest records (revenue), and metayage settlements must all create journal entries via AccountingAutomationService to appear in profitability. Previously these were queried directly from their source tables by getParcelProfitability(), bypassing the accounting ledger entirely. This created a shadow accounting system outside the journal. All six cost/revenue sources now follow the same path: source event → account mapping lookup → journal entry creation → profitability reads journal.

### Chill hours surfaced via variety-aware traffic light + Block A overlay — 2026-04-19 (Request: chill-hours-display)

Calibration `step2.chill_hours` (cumulative hours T<7.2°C) is now exposed on `block_b.phenology_dashboard.chill` with bands derived from the variety bracket in `DATA_OLIVIER.json` (`heures_froid_requises[min, max]`). Bands: critique <100h (always — rule OLI-08), red <min, yellow <max, green ≥max. Fallback bracket `[200, 400]` when variety unknown / not in referentiel; flagged via `reference.source: 'fallback'`. Block A overlay: critique → critique concern, red → vigilance concern, green → strength, yellow → no entry. Olive-only for v1 (`crop_type !== 'olivier'` returns null). Considered hard-coding a single threshold — rejected because Picholine Marocaine `[100,200]` and Picual `[400,600]` differ 4× and a single number would mis-flag most parcels. Considered separate weather-page surfacing — kept on calibration page because dormancy is the scientific link and Hassan needs it next to the phenology timeline. `CalibrationSnapshotInput` extended with optional `variety` field; `calibration.service.ts` parcel select extended to fetch it.
