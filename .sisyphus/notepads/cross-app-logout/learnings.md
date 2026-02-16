# Cross-App Logout - Learnings

## Task 2: Dashboard useSignOut Mutation Update

### Implementation Complete ✅

**File Modified:** `project/src/hooks/useAuthQueries.ts` (lines 246-290)

**Changes Made:**
1. Captured access token BEFORE clearing auth state: `const token = useAuthStore.getState().tokens?.access_token`
2. Added fire-and-forget API call to `POST /api/v1/auth/logout` with Bearer token
3. Wrapped in try-catch with `.catch(() => {})` for silent error handling
4. Preserved all existing cleanup logic unchanged (authStore, organizationStore, Supabase, localStorage)

**Key Pattern:**
- Token capture happens at line 256 (BEFORE clearAuth at line 275)
- API call uses `import.meta.env.VITE_API_URL` for base URL
- Fire-and-forget pattern: no await, no error toasts, no blocking
- Uses native `fetch` API (no new dependencies)

**Verification:**
- `pnpm --filter agriprofy type-check` ✅ PASSED (exit code 0)
- No TypeScript errors introduced
- Comments added for security/architectural clarity (necessary per guidelines)

### Architecture Notes
- The logout API endpoint (`POST /auth/logout`) was created in Task 1 (NestJS API)
- This task depends on Task 1 being complete
- Can run in parallel with Task 3 (Marketplace update)
- Token must be captured before state clearing to ensure valid Bearer token for API call

## Task 2: Marketplace AuthContext Update - COMPLETED

### Implementation Details
- **File**: `marketplace-frontend/src/contexts/AuthContext.tsx`
- **Function**: `signOut()` (lines 58-83)
- **Pattern**: Session capture → API call (fire-and-forget) → Supabase cleanup

### Key Implementation Points
1. **Session Capture**: `const { data: { session: currentSession } } = await supabase.auth.getSession()`
   - Must happen BEFORE `supabase.auth.signOut()` to preserve access token
   
2. **Raw Fetch Pattern**: Used `fetch()` directly, NOT `ApiClient`
   - Reason: ApiClient has 401 redirect behavior that would interfere
   - Fire-and-forget: `.catch(() => {})` suppresses errors intentionally
   
3. **API Endpoint**: `POST /api/v1/auth/logout`
   - Uses `process.env.NEXT_PUBLIC_API_URL` for base URL
   - Authorization header: `Bearer ${currentSession.access_token}`
   
4. **Execution Order**:
   - Get session
   - Call logout API (async, fire-and-forget)
   - Call `supabase.auth.signOut()`
   - Clear local state (`setUser(null)`, `setSession(null)`)

### Build Verification
- `pnpm --filter marketplace-frontend build` ✓ PASSED
- No TypeScript errors
- All routes compiled successfully

### Pattern Reusability
This fire-and-forget pattern with raw fetch is useful for:
- Logout operations (don't block on API response)
- Analytics/telemetry calls
- Non-critical cleanup operations

---

## Work Session Summary - 2026-02-15

### All Tasks Completed ✅

**Plan:** cross-app-logout  
**Completed:** 3/3 tasks  
**Commits:** 2 commits made  

### What Was Implemented

| Component | Change |
|-----------|--------|
| **NestJS API** | New `POST /auth/logout` endpoint that revokes Supabase refresh tokens globally using `auth.admin.signOut(jwt, 'global')` |
| **Dashboard** | `useSignOut` captures token BEFORE clearing state, calls logout API fire-and-forget |
| **Marketplace** | `signOut()` gets session BEFORE `supabase.auth.signOut()`, calls logout API fire-and-forget with raw `fetch` |

### Verification Results

| Package | Status |
|---------|--------|
| agritech-api | ✅ Build passes |
| agriprofy | ✅ Type-check passes |
| marketplace-frontend | ✅ Build passes |

### Key Technical Learnings

1. **Supabase Admin API**: `auth.admin.signOut(jwt, 'global')` takes JWT string, NOT userId
2. **Token Capture Order**: CRITICAL to capture before clearing local state
3. **Marketplace ApiClient**: Has 401 redirect — must use raw fetch for logout
4. **Fire-and-forget**: Ensures logout always completes even if API fails

### Guardrails Honored

- ✅ No modifications to JwtAuthGuard or jwt.strategy.ts
- ✅ No database tables created
- ✅ No `as any` or `@ts-ignore`
- ✅ No tokens in URLs
- ✅ Fire-and-forget pattern implemented correctly

### Commits

1. `feat(auth): add POST /auth/logout endpoint for server-side session revocation`
2. `feat(auth): add server-side logout call to dashboard and marketplace`
