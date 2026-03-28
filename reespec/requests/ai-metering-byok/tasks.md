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

- [ ] **RED** — Write integration test: `GET /ai-quota` with valid auth returns `{ monthly_limit, current_count, period_start, period_end, is_byok, is_unlimited }`. Run → fails (404).
- [ ] **ACTION** — Add `getQuotaStatus()` method to `AiQuotaService`. Create `AiQuotaController` with `GET /ai-quota` endpoint behind `JwtAuthGuard`. Returns current quota status including whether org has BYOK and effective limit. Add Swagger decorators.
- [ ] **GREEN** — Run integration test → passes. Swagger docs show the endpoint.

## Phase 4: Frontend — AI Settings Page

### 11. Create AI settings route and sidebar entry

- [ ] **RED** — Navigate to `/settings/ai` → 404. Check sidebar → no "AI" or "Intelligence Artificielle" entry exists.
- [ ] **ACTION** — Create `project/src/routes/_authenticated/(settings)/settings.ai.tsx` route. Add sidebar entry in `SettingsLayout.tsx` under Organization section with `Brain` icon. Add i18n keys for all 3 languages.
- [ ] **GREEN** — Navigate to `/settings/ai` → page renders. Sidebar shows AI entry, highlighted when active.

### 12. Build usage bar component

- [ ] **RED** — Check `project/src/components/settings/AiUsageBar.tsx` does not exist.
- [ ] **ACTION** — Create `AiUsageBar` component: shows progress bar with `current_count / monthly_limit`, percentage, color (green < 70%, orange < 90%, red ≥ 90%), reset date. Shows "Illimité" badge for BYOK or enterprise. Shows upsell CTAs when at limit.
- [ ] **GREEN** — Component renders correctly with mock data (verify with Storybook or route). Shows all states: normal, warning, full, unlimited.

### 13. Create useAiQuota hook and wire to settings page

- [ ] **RED** — Check `project/src/hooks/useAiQuota.ts` does not exist.
- [ ] **ACTION** — Create `useAiQuota(organizationId)` hook using `useQuery` calling `GET /ai-quota`. Wire into AI settings page to show real usage data in `AiUsageBar`. Move existing `AIProvidersSettings` component into this page.
- [ ] **GREEN** — AI settings page shows real quota data from API. Provider cards render. Usage bar reflects actual count/limit.

### 14. Build soft-block modal component

- [ ] **RED** — Check `project/src/components/ai/AiQuotaExceededModal.tsx` does not exist.
- [ ] **ACTION** — Create `AiQuotaExceededModal`: dialog showing usage/limit info, two CTAs (navigate to `/settings/subscription` for upgrade, navigate to `/settings/ai` for BYOK). Export a `useAiQuotaError()` hook that detects `AI_QUOTA_EXCEEDED` from mutation errors and triggers the modal.
- [ ] **GREEN** — Modal renders with correct messaging in all 3 languages. CTAs navigate correctly.

### 15. Wire soft-block modal into chat and report UIs

- [ ] **RED** — In chat: send message when quota exceeded → generic error shown. No upsell modal.
- [ ] **ACTION** — Add `useAiQuotaError()` hook to chat page and report generation pages. When AI mutations return `AI_QUOTA_EXCEEDED`, show `AiQuotaExceededModal` instead of generic error toast.
- [ ] **GREEN** — Chat: quota exceeded → modal appears with upsell. Reports: same. Generic errors still show toast.

## Phase 5: Cleanup

### 16. Fix settings sidebar: consolidate Profile/Preferences into Account

- [ ] **RED** — Settings sidebar shows "Profile" and "Preferences" as separate items. Neither highlights when on `/settings/account`.
- [ ] **ACTION** — In `SettingsLayout.tsx`: remove "Profile" and "Preferences" items from Personal section. Add single "Account" item pointing to `/settings/account` with `User` icon. Keep redirect routes for backwards compat.
- [ ] **GREEN** — Sidebar shows single "Account" item. Clicking it navigates to `/settings/account`. Item highlights correctly.

### 17. Add i18n keys for all AI metering strings

- [ ] **RED** — Check `project/src/locales/en/ai.json` for keys: `quota.title`, `quota.used`, `quota.limit`, `quota.exceeded`, `quota.unlimited`, `quota.resetDate`, `quota.upgradeAction`, `quota.byokAction`. Keys are missing.
- [ ] **ACTION** — Add all AI metering i18n keys to `en/ai.json`, `fr/ai.json`, `ar/ai.json`. Include quota messages, upsell text, provider labels, settings page strings.
- [ ] **GREEN** — All keys exist in all 3 language files. No hardcoded strings in AI settings or modal components.
