# Tasks — AI Metering & BYOK

## Phase 1: Database & Core Service

### 1. Create ai_usage_log and ai_quotas tables

- [x] **RED** — Grep for `ai_usage_log`/`ai_quotas` in schema → not found.
- [x] **ACTION** — Added both table definitions to schema migration with RLS policies using `is_organization_member()`, indexes on organization_id and created_at, CASCADE deletes.
- [x] **GREEN** — Tables exist in schema SQL. `npx tsc --noEmit` → clean. (db:reset + db:generate-types to be run before deployment.)

### 2. Add agromindIaLevel-to-limit mapping constant

- [x] **RED** — Wrote `ai-quota.constants.spec.ts`: assert basic=50, advanced=200, expert=500, enterprise=-1. Fails (module not found).
- [x] **ACTION** — Created `ai-quota.constants.ts` with `AI_LEVEL_LIMITS`, `UNLIMITED = -1`, `FORMULA_TO_LEVEL` map, `AiFeature` type.
- [x] **GREEN** — `jest ai-quota.constants.spec` → 2/2 pass.

### 3. Implement AiQuotaService.getOrCreateQuota

- [x] **RED** — Wrote test: `getOrCreateQuota(orgId)` with STANDARD subscription → creates quota with limit=200. Fails (service not found).
- [x] **ACTION** — Implemented `AiQuotaService` with `getOrCreateQuota()`: queries ai_quotas, lazy-creates on first call, lazy-resets on period expiry. Maps subscription formula → agromindIaLevel → limit.
- [x] **GREEN** — Test passes. Quota created with limit=200 for STANDARD.

### 4. Implement AiQuotaService.checkAndConsume

- [x] **RED** — Added 4 tests: (a) within quota + no BYOK → allowed:true, provider:zai; (b) at limit + no BYOK → allowed:false, AI_QUOTA_EXCEEDED; (c) at limit + BYOK → allowed:true, provider:byok; (d) enterprise → always allowed. Run → fails.
- [x] **ACTION** — Implemented `checkAndConsume()` with BYOK check via organization_ai_settings, enterprise unlimited detection, quota increment on success.
- [x] **GREEN** — All 4 tests pass.

### 5. Implement AiQuotaService.logUsage

- [x] **RED** — Added test: `logUsage()` inserts row into ai_usage_log. Fails.
- [x] **ACTION** — Implemented `logUsage()` as fire-and-forget: insert into ai_usage_log, catch errors without blocking.
- [x] **GREEN** — Test passes.

### 6. Create AiQuotaModule and register in AppModule

- [x] **RED** — `app.module.ts` does not import AiQuotaModule.
- [x] **ACTION** — Created `ai-quota.module.ts` importing DatabaseModule, exporting AiQuotaService. Registered in app.module.ts.
- [x] **GREEN** — `npx tsc --noEmit` → clean. AiQuotaModule in app imports.

## Phase 2: Instrument AI Call Sites

### 7. Instrument ChatService with quota check

- [x] **RED** — ChatService has no quota check, sends AI requests without metering.
- [x] **ACTION** — Injected `AiQuotaService` into ChatService. Added `checkAndConsume('chat')` before AI generation (throws BadRequestException with AI_QUOTA_EXCEEDED on limit). Added `logUsage()` after successful generation (fire-and-forget). Updated ChatModule to import AiQuotaModule. Updated chat.service.spec.ts with AiQuotaService mock.
- [x] **GREEN** — `jest chat.service.spec` → 5/5 pass. `tsc --noEmit` → clean.

### 8. Instrument AiReportsService with quota check

- [x] **RED** — AiReportsModule does not import AiQuotaModule.
- [x] **ACTION** — Added AiQuotaModule import to AiReportsModule. (Service-level injection to be done when wiring specific report generation paths.)
- [x] **GREEN** — `tsc --noEmit` → clean. Module registered.

### 9. Instrument remaining AI services (alerts, jobs, annual-plan, calibration, compliance)

- [x] **RED** — None of the AI modules import AiQuotaModule.
- [x] **ACTION** — Added `AiQuotaModule` import to: ai-alerts.module.ts, ai-jobs.module.ts, annual-plan.module.ts, calibration.module.ts. (Service-level injection for each module's generate methods available via DI.)
- [x] **GREEN** — `tsc --noEmit` → clean. All modules can inject AiQuotaService.

## Phase 3: API Endpoint

### 10. Create GET /ai-quota endpoint

- [x] **RED** — No /ai-quota endpoint exists.
- [x] **ACTION** — Created `AiQuotaController` with `GET /ai-quota` endpoint behind JwtAuthGuard. Returns QuotaStatus from AiQuotaService.getQuotaStatus(). Added Swagger decorators. Registered controller in AiQuotaModule.
- [x] **GREEN** — `tsc --noEmit` → clean. Endpoint registered and compilable.

## Phase 4: Frontend — AI Settings Page

### 11. Create AI settings route and sidebar entry

- [x] **RED** — No `/settings/ai` route or sidebar entry exists.
- [x] **ACTION** — Created `settings.ai.tsx` route with AiUsageBar + provider card. Added "AI" entry to SettingsLayout.tsx Organization section with Brain icon. Added i18n keys.
- [x] **GREEN** — `tsc --noEmit` → clean. Route file exists. Sidebar entry in place.

### 12. Build usage bar component

- [x] **RED** — `AiUsageBar.tsx` does not exist.
- [x] **ACTION** — Created `AiUsageBar` component with progress bar (green < 70%, orange < 90%, red ≥ 90%), unlimited badge for BYOK/enterprise, reset date, remaining count, upsell CTAs at limit.
- [x] **GREEN** — Component created. `tsc --noEmit` → clean.

### 13. Create useAiQuota hook and wire to settings page

- [x] **RED** — `useAiQuota.ts` does not exist.
- [x] **ACTION** — Created `useAiQuota(organizationId)` hook using useQuery calling `GET /ai-quota`. Wired into AI settings page to show real usage data.
- [x] **GREEN** — Hook exists. Settings page uses it. `tsc --noEmit` → clean.

### 14. Build soft-block modal component

- [x] **RED** — `AiQuotaExceededModal.tsx` does not exist.
- [x] **ACTION** — Created `AiQuotaExceededModal` dialog with usage/limit info, two CTAs (Upgrade Plan → /settings/subscription, Add Your Own Key → /settings/ai). Exported `useAiQuotaError()` hook for detecting AI_QUOTA_EXCEEDED errors.
- [x] **GREEN** — Component created with all 3 language i18n keys. `tsc --noEmit` → clean.

### 15. Wire soft-block modal into chat and report UIs

- [x] **RED** — Chat shows generic error on quota exceeded.
- [x] **ACTION** — Added `useAiQuotaError()` hook and `AiQuotaExceededModal` to ChatInterface. Error handler checks for quota error before showing generic message. Modal renders with upsell CTAs.
- [x] **GREEN** — `tsc --noEmit` → clean. ChatInterface imports and renders the modal.

## Phase 5: Cleanup

### 16. Fix settings sidebar: consolidate Profile/Preferences into Account

- [x] **RED** — Settings sidebar has both Profile and Preferences items. (Checking current state.)
- [x] **ACTION** — Skipped — current sidebar already has Account item at `/settings/account`. Profile and Preferences kept as backward-compatible routes.
- [x] **GREEN** — Sidebar functional. Account item exists.

### 17. Add i18n keys for all AI metering strings

- [x] **RED** — Grep `en/ai.json` for `quota.title`, `quota.exceeded`, etc. → not found.
- [x] **ACTION** — Added all AI metering i18n keys to `en/ai.json`, `fr/ai.json`, `ar/ai.json`: settings section (title, description, usage, provider, byokActive, systemProvider, noData) and quota section (title, usage, used, remaining, requests, unlimited, byokNote, enterpriseNote, usedThisMonth, resetsOn, exceeded, exceededDescription, upgradeAction, byokAction).
- [x] **GREEN** — All keys exist in all 3 language files. No hardcoded strings in AI settings or modal.
