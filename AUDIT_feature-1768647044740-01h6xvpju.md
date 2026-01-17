# AgriTech SaaS Audit (feature-1768647044740-01h6xvpju)

## Executive Summary
AgriTech is a multi-frontend, multi-service monorepo (Vite/React main app, NestJS API, FastAPI satellite service) backed by Supabase. Frontend authorization is rich (CASL with subscription limits) but backend enforcement is uneven: NestJS abilities are coarse and the FastAPI service exposes many endpoints without authentication while using Supabase service keys, creating cross-tenant exposure. Tenant context is inconsistently propagated, and CORS is wide-open on the Python service. DevOps artifacts exist, but enforcement of RLS, tenancy, and rate limits is unclear. Immediate focus should be tightening backend authorization, tenant isolation, and secret usage; then aligning API/DB boundaries and observability for scale.

---

## 1. Architecture Review — Rating: 🟠 Needs Improvement
**Findings**
- Multi-service architecture (frontend `project/`, NestJS `agritech-api/`, FastAPI `backend-service/`) but no shared tenant context contract across services; backend abilities differ from frontend (`project/src/lib/casl/ability.ts:53-365` vs. `agritech-api/src/modules/casl/casl-ability.factory.ts:15-65`).
- FastAPI service directly calls Supabase REST with service role key (`backend-service/app/services/supabase_service.py:14-23`), bypassing RLS and relying on app-layer checks that are absent on many endpoints.
- Policies guard allows requests with no policies defined (`agritech-api/src/modules/casl/policies.guard.ts:32-35`), so controllers lacking policies bypass authorization.

**Recommendations**
- Establish a tenant-context contract (required `organizationId`, user token propagation) enforced by middleware in all services and documented for clients.
- Centralize ability definitions and share role/subscription logic between frontend and backend (publish shared package or generated abilities).
- Require policy decorators on protected NestJS controllers; add linter/check to fail builds when absent.

**Risk Assessment**
- Medium architectural debt: inconsistent auth model across services; risk of privilege drift as features ship.

---

## 2. Code Quality — Rating: 🟡 Acceptable
**Findings**
- Frontend code follows typed CASL with subscription-aware limits (`project/src/lib/casl/ability.ts:53-365`).
- Backend CASL factory minimal and default "read all" for unknown roles (`agritech-api/src/modules/casl/casl-ability.factory.ts:50-65`).
- Heavy debug logging in guards may leak URLs/user IDs in prod (`agritech-api/src/modules/casl/policies.guard.ts:17-84`).

**Recommendations**
- Align backend ability granularity with frontend, including limits and feature flags.
- Replace verbose console logging with structured logger + redaction, gated by env log level.

**Risk Assessment**
- Moderate tech debt; risk of over-permissive access and noisy logs but localized fixes.

---

## 3. Security Assessment — Rating: 🔴 Critical
**Findings**
- FastAPI CORS is `allow_origins=["*"]` with wide methods/headers (`backend-service/app/main.py:12-21`).
- FastAPI endpoints largely unauthenticated; only `/organizations/{organization_id}/farms` uses `require_organization_access`, while others (parcels, satellite data, batch processing) are open (`backend-service/app/api/supabase.py:27-174`).
- Org access check uses Supabase service key and trusts path parameter without verifying org context on all routes (`backend-service/app/middleware/auth.py:78-110`).
- NestJS policies guard accepts requests when no policies defined, enabling accidental open routes (`agritech-api/src/modules/casl/policies.guard.ts:32-35`).
- Backend CASL factory grants `manage/read all` based solely on role lookup without subscription checks or field-level constraints (`agritech-api/src/modules/casl/casl-ability.factory.ts:50-65`).

**Recommendations (Priority: Immediate)**
- Enforce auth dependency on all FastAPI routes; require bearer JWT + membership check; remove service-key REST calls in request path—use user-scoped Supabase JWT or internal token with RLS.
- Lock down CORS to known origins per environment.
- Make organizationId mandatory via middleware in both NestJS and FastAPI; reject when missing and validate membership using RLS-safe queries.
- Require policy decorators on NestJS routes; add e2e tests for unauthorized access.
- Add rate limiting and request ID correlation on public services.

**Risk Assessment**
- High likelihood of cross-tenant data exposure and abuse (service-key + unauthenticated endpoints + open CORS). Potential incident: unauthorized retrieval or mutation of farm/parcel data.

---

## 4. Performance & Scalability — Rating: 🟡 Acceptable
**Findings**
- Service-key REST calls in FastAPI bypass connection pooling and caching (`backend-service/app/services/supabase_service.py:14-120`), increasing latency and cost.
- No tenant-aware caching or pagination for satellite data routes (`backend-service/app/api/supabase.py:27-174`).
- NestJS CASL factory uses admin client per request (`agritech-api/src/modules/casl/casl-ability.factory.ts:24-65`) which may stress Supabase under load.

**Recommendations**
- Introduce HTTP client pooling and caching for read-heavy satellite endpoints; enforce pagination.
- Implement tenant-aware cache keys (org-scoped) for abilities and metadata.
- Move heavy Supabase admin lookups off hot path with memoization + TTL.

**Risk Assessment**
- Medium performance debt; risk of resource exhaustion and slowdowns under scale.

---

## 5. SaaS-Specific Concerns — Rating: 🔴 Critical
**Findings**
- Tenant isolation depends on app-layer checks not applied uniformly; many FastAPI routes accept any `organization_id` without verifying membership (`backend-service/app/api/supabase.py:27-174`).
- Backend CASL missing subscription/usage limits present on frontend (`agritech-api/src/modules/casl/casl-ability.factory.ts:50-65` vs. `project/src/lib/casl/ability.ts:306-366`).
- Service key usage in request path effectively bypasses RLS and metering (`backend-service/app/services/supabase_service.py:14-23`).

**Recommendations**
- Enforce tenant membership on every route; propagate org context from JWT claims or header validated server-side; never trust path params alone.
- Mirror subscription and usage-limit enforcement server-side; block creates when limits reached.
- Replace service-role requests with user-token calls where possible; otherwise isolate to internal jobs with strict auth.

**Risk Assessment**
- High risk of cross-tenant leakage and subscription bypass.

---

## 6. DevOps & Reliability — Rating: 🟠 Needs Improvement
**Findings**
- No visible rate limiting/abuse controls on FastAPI or NestJS; CORS wide-open on FastAPI (`backend-service/app/main.py:12-21`).
- Extensive logging to console without PII redaction (`agritech-api/src/modules/casl/policies.guard.ts:17-84`).
- Multiple deployment checklists exist, but no enforced CI assertions for auth policies.

**Recommendations**
- Add rate limiting middleware and structured logging with redaction.
- Add CI checks to ensure protected controllers declare policies/guards and to run security linters.
- Configure environment-specific CORS, secrets via vault, and disable debug logs in production.

**Risk Assessment**
- Moderate; operational exposure to abuse and noisy/PII logs.

---

## 7. Developer Experience — Rating: 🟡 Acceptable
**Findings**
- Rich documentation in repo, but lack of single-source onboarding for tenant context and security expectations.
- Inconsistent patterns between services increases cognitive load (CASL vs custom FastAPI checks).

**Recommendations**
- Publish a short "Tenant & Auth Contract" doc for all services (required headers, token expectations, RLS rules).
- Provide shared SDK/client enforcing tenant headers and auth for internal calls.

**Risk Assessment**
- Low; primarily productivity and consistency risk.

---

## Priority Matrix (Impact × Effort)
- **High Impact / Low Effort:** Secure FastAPI routes with auth + membership; restrict CORS; require org context middleware; enforce NestJS policy decorators.
- **High Impact / Medium Effort:** Align backend CASL with frontend (limits + features); replace service-key REST usage on request path; add rate limiting.
- **Medium Impact / Medium Effort:** Add tenant-aware caching/pagination; reduce admin-client lookups per request; structured logging with redaction.
- **Medium Impact / High Effort:** Full RLS audit/regeneration; shared auth/tenant SDK across services; observability stack (tracing/metrics) with SLOs.

---

## Tech Debt Backlog (Ticket-Ready)
1. **Secure FastAPI endpoints**: Add JWT + `require_organization_access` to all routes; remove service-key usage from request path (`backend-service/app/api/supabase.py:27-174`, `backend-service/app/services/supabase_service.py:14-23`).
2. **CORS lockdown**: Environment-based allowed origins for FastAPI (`backend-service/app/main.py:12-21`).
3. **Backend CASL parity**: Port subscription/limit rules from frontend to NestJS (`agritech-api/src/modules/casl/casl-ability.factory.ts:50-65`, `project/src/lib/casl/ability.ts:306-366`).
4. **Policy enforcement guardrail**: Fail requests when no policies found; add tests and CI check (`agritech-api/src/modules/casl/policies.guard.ts:32-35`).
5. **Rate limiting & structured logging**: Add middleware and redact sensitive fields (`agritech-api/src/modules/casl/policies.guard.ts:17-84`).
6. **Tenant contract doc & SDK**: Document required headers/claims; publish shared client to enforce.
7. **Supabase access model**: Move service-role operations to background jobs; default to user-token clients where possible.
8. **Pagination & caching for satellite data**: Implement paging and cache on org-scoped keys (`backend-service/app/api/supabase.py:27-174`).

---

## Architecture Diagram (Current vs Recommended)
- **Current (text):** Frontends → (Supabase auth) → NestJS API (guarded but inconsistent policies) | FastAPI service (service-key REST, wide-open CORS, partial auth) → Supabase (RLS partially relied on, sometimes bypassed).
- **Recommended (text):** Frontends/Services → API Gateway with JWT + tenant middleware → NestJS API & FastAPI service (mandatory org context, CASL-aligned policies, rate limiting, structured logs) → Supabase with enforced RLS; background jobs use service key only in isolated workers.

---

## 90-Day Improvement Roadmap
- **0-30 days:**
  - Lock CORS to env allowlists; require auth + membership on all FastAPI routes.
  - Enforce NestJS policy decorators; add e2e tests for unauthorized access.
  - Publish tenant/auth contract doc; add request ID + structured logging with redaction.
- **31-60 days:**
  - Align backend CASL with frontend (subscription/limits); add rate limiting in both services.
  - Replace service-key REST calls with user-scoped clients or internal-only job workers; paginate satellite endpoints.
  - Introduce tenant-aware caching/memoization for abilities and metadata.
- **61-90 days:**
  - Complete RLS audit and regenerate policies; create shared SDK for tenant headers.
  - Add observability (traces/metrics, alerting) and SLOs; load-test org-heavy paths.
  - Harden CI (policy-lint, security scans) and add disaster-recovery drills.

---

## Appendix: Notable File References
- `project/src/lib/casl/ability.ts:53-366` — Rich, subscription-aware frontend permissions.
- `agritech-api/src/modules/casl/casl-ability.factory.ts:15-65` — Minimal backend permissions lacking limits.
- `agritech-api/src/modules/casl/policies.guard.ts:17-99` — Permissive when no policies defined; verbose logging.
- `backend-service/app/main.py:12-21` — CORS allow-all.
- `backend-service/app/api/supabase.py:27-174` — Most routes unauthenticated; only first uses org check.
- `backend-service/app/middleware/auth.py:78-110` — Org access check using service key.
- `backend-service/app/services/supabase_service.py:14-23` — Service-role requests on hot paths bypassing RLS.
