# Quota Enforcement Spec

## Capability: AI quota is checked and enforced before every AI call

### Scenario: Org within quota, no BYOK
- **GIVEN** org "farm-a" is on STANDARD plan (limit=200), current_count=50, no BYOK keys
- **WHEN** an AI call is made for feature "chat"
- **THEN** call proceeds using system ZAI key, current_count increments to 51, usage is logged

### Scenario: Org at quota limit, no BYOK
- **GIVEN** org "farm-a" is on STARTER plan (limit=50), current_count=50, no BYOK keys
- **WHEN** an AI call is made for feature "report"
- **THEN** call is rejected with error code `AI_QUOTA_EXCEEDED`, response includes `{ limit: 50, used: 50, resetDate }`

### Scenario: Org over quota but has BYOK
- **GIVEN** org "farm-a" is on STARTER plan (limit=50), current_count=50, has enabled OpenAI BYOK key
- **WHEN** an AI call is made for feature "chat"
- **THEN** call proceeds using org's OpenAI key, usage is logged with `is_byok=true`, current_count is NOT incremented

### Scenario: BYOK org never counts against system quota
- **GIVEN** org "farm-a" has enabled Gemini BYOK key, current_count=0
- **WHEN** an AI call is made for feature "report"
- **THEN** call uses org's Gemini key, current_count stays 0, usage logged with `is_byok=true`

### Scenario: Enterprise plan has unlimited quota
- **GIVEN** org "farm-a" is on ENTERPRISE plan
- **WHEN** an AI call is made
- **THEN** call proceeds, usage is logged, no quota check (monthly_limit = -1 means unlimited)

### Scenario: Quota period expired, lazy reset
- **GIVEN** org "farm-a" has quota with period_end = 2026-02-28, current date = 2026-03-15
- **WHEN** an AI call is made
- **THEN** quota is reset: current_count=0, new period_start=2026-03-01, period_end=2026-03-31, then call proceeds

### Scenario: First AI call ever, lazy quota creation
- **GIVEN** org "farm-a" is on STANDARD plan, no row in ai_quotas
- **WHEN** an AI call is made
- **THEN** quota row is created with monthly_limit=200, current_count=0, period covering current month, then call proceeds
