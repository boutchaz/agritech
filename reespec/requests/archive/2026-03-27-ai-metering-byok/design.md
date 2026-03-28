# AI Metering & BYOK — Design

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI CALL FLOW                          │
│                                                          │
│  ChatService / AiReportsService / AiAlertsService / ... │
│                         │                                │
│                         ▼                                │
│              ┌─────────────────────┐                     │
│              │   AiQuotaService    │                     │
│              │                     │                     │
│              │ 1. checkQuota(org)  │                     │
│              │    → allowed?       │                     │
│              │    → which key?     │                     │
│              │                     │                     │
│              │ 2. logUsage(org,    │                     │
│              │    feature, tokens) │                     │
│              └─────────┬──────────┘                     │
│                        │                                 │
│              ┌─────────▼──────────┐                     │
│              │   Provider Layer   │                     │
│              │  (ZAI / OpenAI /   │                     │
│              │   Gemini / Groq)   │                     │
│              └────────────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

## Decision 1: Quota check as service, not guard/middleware

**Chosen**: Inject `AiQuotaService` into each AI-consuming service. Call `checkAndConsume()` before the AI generation call.

**Rejected**: NestJS guard/interceptor approach — AI calls happen deep in service logic (not at controller boundary), and some endpoints do multiple AI calls or conditional AI calls. A guard can't know whether a given request will actually invoke AI.

**Tradeoff**: More call sites to update, but accurate counting and correct error handling per feature.

## Decision 2: Request counting, not token counting

**Chosen**: Count each AI call as 1 request regardless of token usage.

**Why**: Simple to implement, simple to explain to users ("50 requêtes/mois"), and token counting requires parsing provider responses which varies per provider. Token data is still logged for future analytics but not used for limits.

## Decision 3: Soft block, not hard block

**Chosen**: When quota is exhausted and no BYOK key exists:
- Return a specific error (`AI_QUOTA_EXCEEDED`)
- Frontend shows upsell modal with two CTAs: "Upgrade plan" / "Add your own AI key"
- The AI feature appears visually available but returns the quota error on use

**Rejected**: Hiding AI features entirely when quota is exhausted — users wouldn't know what they're missing.

## Decision 4: Monthly reset via `period_start` / `period_end`

**Chosen**: `ai_quotas` table has `period_start` and `period_end` timestamps. A quota row is created/reset when:
- First AI call of the month (lazy creation)
- The current period has expired (lazy reset)

**Rejected**: Cron job for monthly reset — adds infrastructure complexity for no benefit since lazy reset works fine.

## Decision 5: BYOK bypasses all system limits

**Chosen**: If an org has at least one enabled BYOK provider, their AI calls use that key with no request limit. Usage is still logged for analytics.

**Why**: It's their money. Rate limiting their own key adds complexity with no benefit.

## Decision 6: Provider resolution order

```
1. Org has BYOK key enabled? → Use org key (unlimited)
2. Org within system quota?  → Use system ZAI key
3. Quota exceeded?           → Return AI_QUOTA_EXCEEDED error
```

This modifies the existing `resolveProvider()` in `ai-reports.service.ts` to check quota first.

## Database Design

### `ai_usage_log` — append-only audit trail

```sql
CREATE TABLE ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  feature VARCHAR(50) NOT NULL,        -- 'chat', 'report', 'alert', 'job', 'annual_plan', 'calibration', 'compliance'
  provider VARCHAR(50) NOT NULL,       -- 'zai', 'openai', 'gemini', 'groq'
  model VARCHAR(100),
  tokens_used INTEGER,                 -- nullable, for future analytics
  is_byok BOOLEAN DEFAULT false,       -- was this an org-provided key?
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `ai_quotas` — current period usage per org

```sql
CREATE TABLE ai_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) UNIQUE,
  monthly_limit INTEGER NOT NULL,       -- from subscription tier
  current_count INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## AI Call Sites to Instrument

| Service | File | Method(s) | Feature tag |
|---------|------|-----------|-------------|
| ChatService | `chat/chat.service.ts` | `generate()`, `generateStream()`, internal AI calls | `chat` |
| AiReportsService | `ai-reports/ai-reports.service.ts` | `generate()`, report generation | `report` |
| AiAlertsService | `ai-alerts/ai-alerts.service.ts` | alert generation | `alert` |
| AiJobsService | `ai-jobs/ai-jobs.service.ts` | job processing | `job` |
| AnnualPlanService | `annual-plan/annual-plan.service.ts` | plan generation | `annual_plan` |
| CalibrationService | `calibration/calibration.service.ts` | AI-assisted calibration | `calibration` |
| ComplianceService | `compliance/compliance-reports.service.ts` | report generation | `compliance` |

## Frontend Changes

### New settings route: `/settings/ai`
- Top-level sidebar item in "Organization" section
- Usage bar: "142 / 200 requêtes ce mois" with progress bar
- Provider cards (same as current `AIProvidersSettings` but standalone)
- System provider info: "AgromindIA utilise notre IA intégrée par défaut"
- BYOK section: "Connectez votre propre clé pour un usage illimité"

### Soft-block modal component
- Triggered when any AI call returns `AI_QUOTA_EXCEEDED`
- Shows current usage / limit
- Two CTAs: upgrade plan, add BYOK key
- Reusable across chat, reports, etc.

### New API hooks
- `useAiQuota(orgId)` — fetch current usage/limit
- Modify existing AI mutation hooks to handle `AI_QUOTA_EXCEEDED` error

## Risks
- **Migration risk**: Adding quota checks to 7+ services — must not break existing AI flows if quota service is down (fail-open for launch?)
- **Race condition**: Two simultaneous AI calls could both pass quota check. Acceptable — we're not billing, just soft-limiting.
- **BYOK key rotation**: If org's BYOK key is invalid, should fall back to system key (counting against quota) or error? → Error with clear message to fix their key.
