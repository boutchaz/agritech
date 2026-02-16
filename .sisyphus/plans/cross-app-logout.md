# Cross-App Logout: Dashboard ↔ Marketplace

## TL;DR

> **Quick Summary**: Add server-side logout via NestJS API so that logging out from either the dashboard (5173) or marketplace (3002) revokes the Supabase refresh token globally, causing the other app to lose auth on its next token refresh.
> 
> **Deliverables**:
> - New `POST /auth/logout` NestJS endpoint (server-side token revocation)
> - Updated dashboard `useSignOut` to call API before clearing local state
> - Updated marketplace `signOut()` to call API before clearing local state
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 → Task 2 + Task 3 (parallel)

---

## Context

### Original Request
"when i log out should logout on both" — When user logs out from either the dashboard or marketplace, both apps should be logged out.

### Interview Summary
**Key Discussions**:
- **Strategy**: User chose API-mediated logout (recommended) over redirect chains or BroadcastChannel
- **Timing**: "Within a few minutes is fine" — no immediate cross-app detection needed; natural token expiry after server-side revocation is acceptable
- **Approach**: New NestJS endpoint revokes Supabase refresh tokens server-side using admin API

**Research Findings**:
- Dashboard logout: `project/src/hooks/useAuthQueries.ts` → `useSignOut` mutation clears `authStore`, `organizationStore`, calls `supabase.auth.signOut()`, clears localStorage
- Marketplace logout: `marketplace-frontend/src/contexts/AuthContext.tsx` → `signOut()` calls `supabase.auth.signOut()`, clears local user/session state
- NestJS API: Already has `databaseService.getAdminClient()` with service_role key — no new infrastructure needed
- No logout endpoint currently exists in the API

### Metis Review
**Identified Gaps** (addressed):
- **CRITICAL — Wrong API signature**: Plan originally assumed `auth.admin.signOut(userId)` but actual Supabase v2 API is `auth.admin.signOut(jwt, 'global')`. Fixed: endpoint extracts raw JWT from Authorization header.
- **Race condition**: Dashboard's `useSignOut` clears `authStore` (which holds the token) before making API calls. Fixed: capture token BEFORE clearing state, call API first.
- **Marketplace 401 redirect**: Marketplace's `ApiClient` redirects to `/login` on 401. Fixed: use raw `fetch` for logout call to avoid redirect interception.
- **Token capture order**: Both clients must capture the access token before any local cleanup begins.

---

## Work Objectives

### Core Objective
When a user logs out from either app, their Supabase refresh token is revoked server-side, causing the other app's session to become invalid on its next token refresh (~5 min).

### Concrete Deliverables
- `agritech-api/src/modules/auth/auth.service.ts` — new `logout(jwt: string)` method
- `agritech-api/src/modules/auth/auth.controller.ts` — new `POST /auth/logout` endpoint
- `project/src/hooks/useAuthQueries.ts` — updated `useSignOut` mutation (call API before clearing state)
- `marketplace-frontend/src/contexts/AuthContext.tsx` — updated `signOut()` (call API before clearing state)

### Definition of Done
- [x] `POST /auth/logout` returns 401 without Bearer token
- [x] `POST /auth/logout` returns 200/204 with valid Bearer token
- [x] After calling logout endpoint, the revoked session's refresh token no longer works
- [x] Dashboard logout calls the API before clearing local state
- [x] Marketplace logout calls the API before clearing local state
- [x] `pnpm --filter agritech-api build` passes
- [x] `pnpm --filter agriprofy type-check` passes
- [x] `pnpm --filter marketplace-frontend build` passes

### Must Have
- Server-side refresh token revocation via Supabase admin API
- Both apps call the endpoint before local cleanup
- Fire-and-forget: local logout always completes even if API call fails
- `@UseGuards(JwtAuthGuard)` on the endpoint (same pattern as other auth endpoints)

### Must NOT Have (Guardrails)
- Do NOT create database tables or audit logging for logout
- Do NOT add a shared logout service abstraction or cross-app event bus
- Do NOT modify the login flow, token refresh, or exchange-code endpoints
- Do NOT change `JwtAuthGuard` or `jwt.strategy.ts`
- Do NOT add CORS changes (localhost:3002 already in CORS_ORIGIN)
- Do NOT touch the mobile app (`mobile/`) — out of scope
- Do NOT add error toasts on logout API failure — fire-and-forget
- Do NOT pass tokens in URL query params
- Do NOT use `as any` or `@ts-ignore`
- Do NOT add README updates or ADRs

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: YES (Jest in agritech-api, Vitest in project)
- **Automated tests**: NO — fire-and-forget logout is better verified via Agent-Executed QA
- **Framework**: N/A

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

> Every task includes ultra-detailed QA scenarios using curl, Playwright, or build commands.
> These are the PRIMARY verification method.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: NestJS API logout endpoint [no dependencies]

Wave 2 (After Wave 1):
├── Task 2: Dashboard useSignOut update [depends: 1]
└── Task 3: Marketplace signOut update [depends: 1]

Critical Path: Task 1 → Task 2 (or Task 3)
Parallel Speedup: ~33% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None (first) |
| 2 | 1 | None | 3 |
| 3 | 1 | None | 2 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | task(category="quick", load_skills=[], run_in_background=false) |
| 2 | 2, 3 | dispatch parallel after Wave 1 completes |

---

## TODOs

- [x] 1. Add `POST /auth/logout` Endpoint to NestJS API

  **What to do**:
  - Add `logout(jwt: string): Promise<void>` method to `auth.service.ts`:
    - Get admin client via `this.databaseService.getAdminClient()`
    - Call `adminClient.auth.admin.signOut(jwt, 'global')`
    - Catch and log errors but don't throw (the endpoint should return 200 even if Supabase revocation has issues — the token will expire naturally)
  - Add `POST /auth/logout` endpoint to `auth.controller.ts`:
    - Apply `@UseGuards(JwtAuthGuard)` and `@ApiBearerAuth()`
    - Add `@ApiTags('authentication')`, `@ApiOperation({ summary: 'Logout and revoke session globally' })`, `@ApiResponse({ status: 200, description: 'Logged out successfully' })`
    - Extract raw JWT from `req.headers.authorization` (substring after "Bearer ")
    - Call `this.authService.logout(rawToken)`
    - Return `{ message: 'Logged out successfully' }` with status 200

  **Must NOT do**:
  - Do NOT modify `JwtAuthGuard` or `jwt.strategy.ts`
  - Do NOT add database tables or audit logging
  - Do NOT change existing endpoints
  - Do NOT add new DTO classes — the endpoint takes no body, just the Bearer token

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file pair change (service + controller), follows existing patterns exactly
  - **Skills**: `[]`
    - No special skills needed — straightforward NestJS endpoint addition
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not a frontend task
    - `playwright`: No browser testing needed for API endpoint

  **Parallelization**:
  - **Can Run In Parallel**: NO (must complete first)
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References** (existing code to follow):
  - `agritech-api/src/modules/auth/auth.controller.ts:194-202` — `changePassword` endpoint: same guard pattern (`@UseGuards(JwtAuthGuard)`, `@ApiBearerAuth()`), same Swagger decorators, same `@Req() req` parameter extraction
  - `agritech-api/src/modules/auth/auth.controller.ts:237-251` — `exchangeCode` endpoints: reference for how auth endpoints are structured in this controller
  - `agritech-api/src/modules/auth/auth.service.ts:238-273` — `changePassword` service method: shows how `databaseService.getAdminClient()` is called for admin operations
  - `agritech-api/src/modules/database/database.service.ts:105-110` — `getAdminClient()`: creates Supabase client with `SUPABASE_SERVICE_KEY` (service_role)

  **API/Type References** (contracts):
  - `agritech-api/src/modules/auth/strategies/supabase-jwt.strategy.ts:31` — Shows how JWT is extracted and validated; the raw token comes from `Authorization` header
  - Supabase v2 admin API: `auth.admin.signOut(jwt: string, scope: 'global' | 'local' | 'others')` — scope `'global'` revokes all refresh tokens for the session

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] `pnpm --filter agritech-api build` → exit code 0
  - [ ] Endpoint rejects unauthenticated requests with 401
  - [ ] Endpoint accepts authenticated requests and returns 200

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Unauthenticated logout returns 401
    Tool: Bash (curl)
    Preconditions: NestJS API running on localhost:3001
    Steps:
      1. curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3001/api/v1/auth/logout
      2. Assert: HTTP status is 401
    Expected Result: Unauthorized response
    Evidence: HTTP status code captured

  Scenario: Authenticated logout returns 200
    Tool: Bash (curl)
    Preconditions: NestJS API running on localhost:3001, valid test user credentials
    Steps:
      1. Login to get token:
         TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
           -H "Content-Type: application/json" \
           -d '{"email":"test@example.com","password":"testpass"}' | jq -r '.access_token')
      2. Call logout:
         RESULT=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/api/v1/auth/logout \
           -H "Authorization: Bearer $TOKEN")
      3. Assert: HTTP status is 200
      4. Assert: Response contains "Logged out successfully"
    Expected Result: Successful logout response
    Evidence: Response body and status captured

  Scenario: Build verification
    Tool: Bash
    Steps:
      1. pnpm --filter agritech-api build
      2. Assert: exit code 0
    Expected Result: TypeScript compiles without errors
    Evidence: Build output captured
  ```

  **Commit**: YES
  - Message: `feat(auth): add POST /auth/logout endpoint for server-side session revocation`
  - Files: `agritech-api/src/modules/auth/auth.service.ts`, `agritech-api/src/modules/auth/auth.controller.ts`
  - Pre-commit: `pnpm --filter agritech-api build`

---

- [x] 2. Update Dashboard `useSignOut` to Call Logout API

  **What to do**:
  - Modify `useSignOut` mutation in `project/src/hooks/useAuthQueries.ts`:
    - **BEFORE** clearing `authStore` or calling `supabase.auth.signOut()`:
      1. Capture the current access token from `authStore.getState().access_token`
      2. If token exists, call `POST /auth/logout` with `Authorization: Bearer {token}` — fire-and-forget (wrap in try/catch, ignore errors)
    - Use the existing `apiRequest` utility from `project/src/lib/api-client.ts` BUT capture the token first since `authStore.getState().clearAuth()` wipes it
    - The API call should be a simple `fetch` to `${API_URL}/api/v1/auth/logout` with the captured token, since `apiRequest` reads from `authStore` which may be cleared
    - Keep ALL existing cleanup logic unchanged (clearAuth, clearOrganization, supabase.auth.signOut, localStorage removal, query removal)
    - The fire-and-forget call goes at the TOP of the mutation function, before any clearing

  **Must NOT do**:
  - Do NOT change the existing cleanup sequence (authStore.clear → organizationStore.clear → supabase.signOut → localStorage → queries)
  - Do NOT add error toasts or UI feedback for the API call
  - Do NOT block logout on the API response — fire-and-forget with `try/catch`
  - Do NOT import new dependencies — use native `fetch`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, ~10 lines added at top of existing function
  - **Skills**: `[]`
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not a visual change
    - `playwright`: Build verification is sufficient

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 3)
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: None
  - **Blocked By**: Task 1 (endpoint must exist)

  **References** (CRITICAL):

  **Pattern References**:
  - `project/src/hooks/useAuthQueries.ts:247-271` — Current `useSignOut` mutation: shows the exact function to modify. Key: `authStore.getState().clearAuth()` is called at line ~256, which wipes the token. The API call MUST happen before this line.
  - `project/src/stores/authStore.ts` — Zustand store: `access_token` field holds the JWT. `getState()` returns current state synchronously.

  **API/Type References**:
  - `project/src/lib/api-client.ts:147` — Shows how API requests are made with Bearer token. BUT since we need the token before clearing authStore, use raw `fetch` instead.
  - `project/.env` — `VITE_API_URL` environment variable for the API base URL (should already be `http://localhost:3001` or similar)

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] `pnpm --filter agriprofy type-check` → exit code 0
  - [ ] The `useSignOut` function captures the token before clearing auth state
  - [ ] The API call is wrapped in try/catch (fire-and-forget)
  - [ ] All existing cleanup logic remains unchanged

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Dashboard TypeScript compiles
    Tool: Bash
    Steps:
      1. pnpm --filter agriprofy type-check
      2. Assert: exit code 0
    Expected Result: No type errors
    Evidence: Build output captured

  Scenario: Token capture happens before state clearing
    Tool: Bash (grep)
    Preconditions: File has been modified
    Steps:
      1. Read project/src/hooks/useAuthQueries.ts
      2. Find the useSignOut mutation function
      3. Verify: `authStore.getState().access_token` or equivalent token capture appears BEFORE `clearAuth()` call
      4. Verify: `fetch` call to `/auth/logout` appears BEFORE `clearAuth()` call
      5. Verify: The fetch is wrapped in try/catch
    Expected Result: Token captured and API called before any state clearing
    Evidence: File content showing correct order
  ```

  **Commit**: YES (group with Task 3)
  - Message: `feat(auth): add server-side logout call to dashboard and marketplace`
  - Files: `project/src/hooks/useAuthQueries.ts`, `marketplace-frontend/src/contexts/AuthContext.tsx`
  - Pre-commit: `pnpm --filter agriprofy type-check && pnpm --filter marketplace-frontend build`

---

- [x] 3. Update Marketplace `signOut` to Call Logout API

  **What to do**:
  - Modify `signOut()` in `marketplace-frontend/src/contexts/AuthContext.tsx`:
    - **BEFORE** calling `supabase.auth.signOut()`:
      1. Get current session: `const { data: { session } } = await supabase.auth.getSession()`
      2. If session?.access_token exists, call `POST /auth/logout` with `Authorization: Bearer {token}` — fire-and-forget
    - Use raw `fetch` (NOT the `ApiClient` from `marketplace-frontend/src/lib/api.ts`) to avoid the 401-redirect behavior in `api.ts:124-131`
    - The API base URL should come from `process.env.NEXT_PUBLIC_API_URL` (already set to `http://localhost:3001` in `.env.local`)
    - Keep ALL existing cleanup logic unchanged (`supabase.auth.signOut()`, `setUser(null)`, `setSession(null)`)
    - The fire-and-forget call goes BEFORE `supabase.auth.signOut()`

  **Must NOT do**:
  - Do NOT use `ApiClient.request` — it redirects on 401
  - Do NOT add error handling UI — fire-and-forget
  - Do NOT change the existing signOut cleanup sequence
  - Do NOT modify the `AuthContext` provider structure or exports
  - Do NOT add new dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file, ~8 lines added at top of existing function
  - **Skills**: `[]`
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not a visual change
    - `playwright`: Build verification is sufficient

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 2)
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: None
  - **Blocked By**: Task 1 (endpoint must exist)

  **References** (CRITICAL):

  **Pattern References**:
  - `marketplace-frontend/src/contexts/AuthContext.tsx:58-63` — Current `signOut()` function: calls `supabase.auth.signOut()` then clears local state. The API call MUST happen before `supabase.auth.signOut()` since that clears the session.
  - `marketplace-frontend/src/contexts/AuthContext.tsx:28-37` — `supabase` client initialization: shows how the Supabase client is created and available in context scope

  **API/Type References**:
  - `marketplace-frontend/src/lib/api.ts:97-107` — Shows the ApiClient and its 401 handling at lines 124-131 (redirects to /login). This is WHY we use raw `fetch` instead.
  - `marketplace-frontend/.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:3001` — base URL for the API

  **Acceptance Criteria**:

  > **AGENT-EXECUTABLE VERIFICATION ONLY**

  - [ ] `pnpm --filter marketplace-frontend build` → exit code 0
  - [ ] The `signOut` function gets session token before calling supabase.auth.signOut()
  - [ ] The API call uses raw `fetch`, NOT `ApiClient`
  - [ ] The fetch is wrapped in try/catch (fire-and-forget)
  - [ ] All existing cleanup logic remains unchanged

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Marketplace builds successfully
    Tool: Bash
    Steps:
      1. pnpm --filter marketplace-frontend build
      2. Assert: exit code 0
    Expected Result: Next.js production build succeeds
    Evidence: Build output captured

  Scenario: Token capture happens before Supabase signOut
    Tool: Bash (grep)
    Preconditions: File has been modified
    Steps:
      1. Read marketplace-frontend/src/contexts/AuthContext.tsx
      2. Find the signOut function
      3. Verify: `supabase.auth.getSession()` or equivalent appears BEFORE `supabase.auth.signOut()`
      4. Verify: `fetch` call to `/auth/logout` appears BEFORE `supabase.auth.signOut()`
      5. Verify: raw `fetch` is used (NOT `ApiClient` or `apiClient`)
      6. Verify: try/catch wraps the fetch call
    Expected Result: Correct execution order with raw fetch
    Evidence: File content showing correct order

  Scenario: No ApiClient usage in signOut
    Tool: Bash (grep)
    Steps:
      1. Search for "ApiClient" or "apiClient" usage within the signOut function in AuthContext.tsx
      2. Assert: NOT found within the signOut function body
    Expected Result: Raw fetch used instead of ApiClient
    Evidence: Grep output
  ```

  **Commit**: YES (group with Task 2)
  - Message: `feat(auth): add server-side logout call to dashboard and marketplace`
  - Files: `project/src/hooks/useAuthQueries.ts`, `marketplace-frontend/src/contexts/AuthContext.tsx`
  - Pre-commit: `pnpm --filter agriprofy type-check && pnpm --filter marketplace-frontend build`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(auth): add POST /auth/logout endpoint for server-side session revocation` | `auth.service.ts`, `auth.controller.ts` | `pnpm --filter agritech-api build` |
| 2+3 | `feat(auth): add server-side logout call to dashboard and marketplace` | `useAuthQueries.ts`, `AuthContext.tsx` | `pnpm --filter agriprofy type-check && pnpm --filter marketplace-frontend build` |

---

## Success Criteria

### Verification Commands
```bash
pnpm --filter agritech-api build       # Expected: exit code 0
pnpm --filter agriprofy type-check     # Expected: exit code 0
pnpm --filter marketplace-frontend build # Expected: exit code 0
```

### Final Checklist
- [x] `POST /auth/logout` endpoint exists with JwtAuthGuard
- [x] Endpoint calls `auth.admin.signOut(jwt, 'global')` via admin client
- [x] Dashboard captures token before clearing authStore, calls API fire-and-forget
- [x] Marketplace captures session before supabase.auth.signOut(), calls API fire-and-forget with raw fetch
- [x] All three packages compile without errors
- [x] No `as any` or `@ts-ignore` in new code
- [x] No tokens passed in URLs
- [x] No database tables created
- [x] No modifications to JwtAuthGuard or jwt.strategy.ts
