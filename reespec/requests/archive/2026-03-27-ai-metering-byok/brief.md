# AI Metering & BYOK System

## What
Add AI usage metering with per-tier monthly limits and Bring-Your-Own-Key (BYOK) support. Every AI call (chat, reports, alerts, jobs) is counted per organization. When limits are hit, orgs are soft-blocked with an upsell to upgrade or add their own API key.

## Why
- **Cost protection**: Without metering, one heavy org can run up unbounded AI costs on the system ZAI key
- **Upsell engine**: AI limits create a natural upgrade funnel — users hit the wall on something they already depend on
- **BYOK value**: Power users (Hassan, Fatima) get unlimited AI with their own keys; platform costs drop to zero for those orgs

## Goals
1. Track every AI request per org with feature attribution (chat, report, alert, job, annual-plan, calibration, compliance)
2. Enforce monthly request limits based on `agromindIaLevel` from subscription tier
3. BYOK orgs bypass system limits entirely (their key, their cost)
4. Soft-block with clear upsell UX when limit is reached
5. AI settings elevated to top-level settings page with usage bar + provider config

## Non-Goals
- Per-token billing (request counting only)
- Real-time usage dashboards for system admin (future)
- Automatic billing based on overages
- Changing existing subscription tiers or pricing

## Tier Limits (monthly requests)
| agromindIaLevel | Formula    | Limit | Persona     |
|-----------------|------------|-------|-------------|
| basic           | STARTER    | 50    | Ahmed (50ha)|
| advanced        | STANDARD   | 200   | Karim (300ha)|
| expert          | PREMIUM    | 500   | Hassan (5-15 farms)|
| enterprise      | ENTERPRISE | ∞     | Fatima (2000ha)|
| BYOK (any tier) | any        | ∞     | Self-funded |

## Impact
- Every AI-consuming module is affected (chat, ai-reports, ai-alerts, ai-jobs, annual-plan, calibration, compliance)
- New DB tables: `ai_usage_log`, `ai_quotas`
- New service: `AiQuotaService` (centralized check + log)
- Frontend: new AI settings page, usage bar component, soft-block modal
