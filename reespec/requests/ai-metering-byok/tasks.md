# Tasks — AI Metering & BYOK

## Phase 1: Database & Core Service

### 1. Create ai_usage_log and ai_quotas tables

- [ ] **RED** — Query `ai_usage_log` and `ai_quotas` tables via Supabase → both return "relation does not exist" errors.
- [ ] **ACTION** — Add `ai_usage_log` and `ai_quotas` table definitions to `project/supabase/migrations/00000000000000_schema.sql` with RLS policies using `is_organization_member()`. Add indexes on `organization_id` and `created_at`. Run `cd project && npm run db:reset && npm run db:generate-types`.
- [ ] **GREEN** — Query both tables → no errors. RLS policies exist. TypeScript types include both tables.

### 2. Add agromindIaLevel-to-limit mapping constant

- [ ] **RED** — Write `agritech-api/src/modules/ai-quota/ai-quota.constants.spec.ts`: import `AI_LEVEL_LIMITS` and assert `basic=50`, `advanced=200`, `expert=500`, `enterprise=-1`. Run `jest ai-quota.constants.spec` → fails (module not found).
- [ ] **ACTION** — Create `agritech-api/src/modules/ai-quota/ai-quota.constants.ts` exporting `AI_LEVEL_LIMITS` record and `UNLIMITED = -1` constant. Create the `ai-quota` module directory structure.
- [ ] **GREEN** — Run `jest ai-quota.constants.spec` → passes.

### 3. Implement AiQuotaService.getOrCreateQuota

- [ ] **RED** — Write `agritech-api/src/modules/ai-quota/ai-quota.service.spec.ts`: test that `getOrCreateQuota(orgId)` returns a quota object with correct `monthly_limit` based on org's subscription tier. Mock DatabaseService to return no existing quota row, mock subscription to return STANDARD tier. Assert quota is created with limit=200. Run `jest ai-quota.service.spec` → fails.
- [ ] **ACTION** — Implement `AiQuotaService` with `getOrCreateQuota()`: query `ai_quotas` for org, if missing look up org's subscription formula → map to `agromindIaLevel` → map to limit → insert new quota row with current month period. If period expired, reset.
- [ ] **GREEN** — Run `jest ai-quota.service.spec` → passes.

### 4. Implement AiQuotaService.checkAndConsume

- [ ] **RED** — Add tests to `ai-quota.service.spec.ts`: (a) within quota + no BYOK → returns `{ allowed: true, provider: 'zai', isByok: false }` and increments count; (b) at limit + no BYOK → returns `{ allowed: false, error: 'AI_QUOTA_EXCEEDED', limit, used, resetDate }`; (c) at limit + BYOK enabled → returns `{ allowed: true, provider: 'openai', isByok: true }`, count NOT incremented; (d) enterprise → always allowed. Run `jest ai-quota.service.spec` → new tests fail.
- [ ] **ACTION** — Implement `checkAndConsume(orgId, userId, feature)`: get/create quota, check BYOK status via `OrganizationAISettingsService`, apply resolution logic (BYOK → org key unlimited, within quota → system key, over quota → reject, enterprise → unlimited).
- [ ] **GREEN** — Run `jest ai-quota.service.spec` → all tests pass.

### 5. Implement AiQuotaService.logUsage

- [ ] **RED** — Add test: after successful AI call, `logUsage(orgId, userId, feature, provider, model, tokensUsed, isByok)` inserts a row into `ai_usage_log`. Run `jest ai-quota.service.spec` → fails.
- [ ] **ACTION** — Implement `logUsage()` method: insert into `ai_usage_log` table. Fire-and-forget (don't block AI response on logging).
- [ ] **GREEN** — Run `jest ai-quota.service.spec` → passes.

### 6. Create AiQuotaModule and register in AppModule

- [ ] **RED** — Check `agritech-api/src/app.module.ts` does not import `AiQuotaModule`. Assert the module doesn't exist in imports array.
- [ ] **ACTION** — Create `ai-quota.module.ts` exporting `AiQuotaService`. Import `DatabaseModule`, `OrganizationAISettingsModule`. Register `AiQuotaModule` in `app.module.ts` imports. Export service for other modules to inject.
- [ ] **GREEN** — App compiles (`npm run build`). `AiQuotaModule` appears in app imports.

## Phase 2: Instrument AI Call Sites

### 7. Instrument ChatService with quota check

- [ ] **RED** — Add test to `chat.service.spec.ts`: when quota is exceeded and no BYOK, `sendMessage()` throws `ForbiddenException` with `AI_QUOTA_EXCEEDED` code. Run `jest chat.service.spec` → fails.
- [ ] **ACTION** — Inject `AiQuotaService` into `ChatService`. Before each `zaiProvider.generate()` / `generateStream()` call, call `checkAndConsume()`. If not allowed, throw `ForbiddenException` with quota info. After successful generation, call `logUsage()`. If BYOK, set the org's key on the provider.
- [ ] **GREEN** — Run `jest chat.service.spec` → passes. Existing tests still pass.

### 8. Instrument AiReportsService with quota check

- [ ] **RED** — Write `agritech-api/src/modules/ai-reports/ai-reports.service.spec.ts`: test that `generate()` calls `AiQuotaService.checkAndConsume()` and rejects when quota exceeded. Run `jest ai-reports.service.spec` → fails.
- [ ] **ACTION** — Inject `AiQuotaService` into `AiReportsService`. Wrap the `generate()` and report generation paths with quota check/log. Modify `resolveProvider()` to use quota service's provider decision.
- [ ] **GREEN** — Run `jest ai-reports.service.spec` → passes.

### 9. Instrument remaining AI services (alerts, jobs, annual-plan, calibration, compliance)

- [ ] **RED** — For each service, write a minimal test asserting `AiQuotaService.checkAndConsume()` is called before AI generation. Run all → fail.
- [ ] **ACTION** — Inject `AiQuotaService` into each service. Add `checkAndConsume()` before AI calls and `logUsage()` after successful calls. Tag each with correct feature string.
- [ ] **GREEN** — Run full test suite `npm test` → all pass.

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
