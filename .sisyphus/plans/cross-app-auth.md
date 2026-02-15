# Cross-App Auth: Secure Token Exchange Between Dashboard & Marketplace

## TL;DR

> **Quick Summary**: Implement a secure one-time exchange code flow (OAuth authorization code pattern) for seamless auth between the dashboard (Vite, port 5173) and marketplace (Next.js, port 3002). Replace all hardcoded `https://marketplace.thebzlab.online` URLs with a configurable env variable.
> 
> **Deliverables**:
> - New NestJS endpoint: `POST /auth/exchange-code` (generate) + `POST /auth/exchange-code/redeem` (redeem)
> - `VITE_MARKETPLACE_URL` env var in main app
> - Token handoff helper in main app that generates exchange code and passes it in URL
> - Token receiver in marketplace that redeems the code for a Supabase session
> - All 4 hardcoded marketplace URLs replaced
> 
> **Estimated Effort**: Short-Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Tasks 3,4 (parallel) → Task 5

---

## Context

### The Problem
1. **Hardcoded production URLs** — Sidebar and OrganizationSettings link to `https://marketplace.thebzlab.online`, unreachable locally.
2. **No session sharing** — `localhost:5173` and `localhost:3002` are different origins. Browsers isolate cookies and localStorage per origin.
3. **Different auth storage** — Main app uses `@supabase/supabase-js` (localStorage). Marketplace uses `@supabase/ssr` (cookies).

### Why NOT URL Tokens
Passing `access_token` and `refresh_token` as URL query params is insecure:
- **Browser history** — URL logged before tokens can be stripped
- **Refresh token exposure** — Long-lived token visible in logs, history, Referer headers
- **Server/proxy logs** — Full URL captured by Next.js, nginx, CDN logs

### Solution: One-Time Exchange Code (OAuth Authorization Code Pattern)
This is the industry-standard approach used by OAuth 2.0, Supabase SSO, and every major auth provider.

**Flow:**
```
Dashboard (5173)                    NestJS API (3001)                Marketplace (3002)
────────────────                    ────────────────                 ─────────────────
User clicks "Voir la marketplace"
    │
    ├─ POST /auth/exchange-code
    │  (with Bearer token)
    │                               ├─ Validate JWT
    │                               ├─ Generate random code (UUID)
    │                               ├─ Store: { code, userId, expiresAt: now+30s }
    │                               └─ Return { code }
    │
    ├─ Open: http://localhost:3002?code=abc123
    │
    └──────────────────────────────────────────────►  Marketplace receives ?code=abc123
                                                      │
                                                      ├─ POST /auth/exchange-code/redeem
                                                      │  { code: "abc123" }
                                                      │
                                    ├─ Lookup code     │
                                    ├─ Verify not expired (30s)
                                    ├─ Verify not already used
                                    ├─ Delete code (single-use)
                                    ├─ Generate Supabase session for userId
                                    └─ Return { access_token, refresh_token }
                                                      │
                                                      ├─ supabase.auth.setSession()
                                                      ├─ Strip ?code from URL
                                                      └─ User is authenticated ✅
```

**Security properties:**
- ✅ **No tokens in URL** — Only a random opaque code (reveals nothing if leaked)
- ✅ **Single-use** — Code is deleted after first redemption (replay-proof)
- ✅ **Short-lived** — 30-second expiry (limits exposure window)
- ✅ **Server-validated** — API verifies code ownership, not the client
- ✅ **No Referer leaking** — Opaque code is useless to third parties
- ✅ **No browser history risk** — Code is a random UUID, not a credential

### Files Affected

**NestJS API (agritech-api/src/modules/auth/):**
- `auth.service.ts` — Add `generateExchangeCode()` and `redeemExchangeCode()`
- `auth.controller.ts` — Add `POST /exchange-code` and `POST /exchange-code/redeem`

**Main App (project/src/):**
- `.env` — Add `VITE_MARKETPLACE_URL`
- `config/sidebar-nav.ts` — Make `MARKETPLACE_EXTERNAL_URL` dynamic
- NEW: `lib/marketplace-link.ts` — Helper to generate exchange code + marketplace URL
- `components/Sidebar.tsx` — Replace hardcoded links
- `components/OrganizationSettings.tsx` — Replace hardcoded link

**Marketplace (marketplace-frontend/src/):**
- NEW: `components/CodeExchanger.tsx` — Client component that redeems exchange code
- `app/layout.tsx` — Wire CodeExchanger
- `lib/supabase/middleware.ts` — Handle ?code param server-side

---

## Work Objectives

### Must Have
- Exchange code endpoint on NestJS API (generate + redeem)
- Codes are single-use, expire in 30 seconds, stored in-memory (Map)
- Dashboard generates code and passes it as `?code=` in URL
- Marketplace redeems code, sets Supabase session, strips code from URL
- `VITE_MARKETPLACE_URL` env var replaces all hardcoded URLs
- Works locally (5173→3002) and in production

### Must NOT Have (Guardrails)
- Do NOT pass `access_token` or `refresh_token` in URLs
- Do NOT use a database table for exchange codes — in-memory Map is fine (codes expire in 30s, server restart clears them, no persistence needed)
- Do NOT implement shared cookies, iframe auth, or custom session stores
- Do NOT change how either app authenticates internally
- Do NOT change `LandingPage.tsx` sameAs URL (SEO metadata, always production)
- Do NOT modify the marketplace production `.env`

---

## Verification Strategy

### Test Decision
- **Automated tests**: YES (tests-after) — Unit test for exchange code generation/redemption
- **Agent-Executed QA**: Build verification + grep checks

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: NestJS exchange code endpoints (API)

Wave 2 (After Wave 1):
├── Task 2: Dashboard env var + marketplace-link helper
└── Task 3: Marketplace CodeExchanger component + middleware

Wave 3 (After Wave 2):
└── Task 4: Replace hardcoded URLs in Sidebar + OrganizationSettings
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 4 | 3 |
| 3 | 1 | 4 | 2 |
| 4 | 2, 3 | None | None |

---

## TODOs

- [ ] 1. NestJS API: Exchange code endpoints

  **What to do**:

  **Step A: Add exchange code logic to `auth.service.ts`**

  Add a private in-memory store and two methods:

  ```typescript
  // In-memory store for exchange codes
  // Key: code (UUID string)
  // Value: { userId, createdAt }
  private exchangeCodes = new Map<string, { userId: string; createdAt: number }>();

  // Clean expired codes every 60 seconds
  private cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [code, data] of this.exchangeCodes) {
      if (now - data.createdAt > 30_000) { // 30 second expiry
        this.exchangeCodes.delete(code);
      }
    }
  }, 60_000);

  /**
   * Generate a one-time exchange code for cross-app auth handoff.
   * Code expires in 30 seconds and can only be used once.
   */
  async generateExchangeCode(userId: string): Promise<{ code: string; expiresIn: number }> {
    // Generate cryptographically random code
    const { randomUUID } = await import('crypto');
    const code = randomUUID();
    
    this.exchangeCodes.set(code, {
      userId,
      createdAt: Date.now(),
    });

    this.logger.log(`Exchange code generated for user ${userId}`);
    return { code, expiresIn: 30 };
  }

  /**
   * Redeem an exchange code for a Supabase session.
   * Code is deleted after use (single-use).
   */
  async redeemExchangeCode(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const entry = this.exchangeCodes.get(code);
    
    if (!entry) {
      throw new UnauthorizedException('Invalid or expired exchange code');
    }

    // Check expiry (30 seconds)
    if (Date.now() - entry.createdAt > 30_000) {
      this.exchangeCodes.delete(code);
      throw new UnauthorizedException('Exchange code expired');
    }

    // Delete immediately (single-use)
    this.exchangeCodes.delete(code);

    // Generate a fresh Supabase session for this user
    const adminClient = this.databaseService.getAdminClient();
    
    // Use admin API to generate a magic link or session
    // Since we can't directly create sessions via admin API,
    // we'll use generateLink to create a one-time login link
    // and extract the tokens
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: (await adminClient.auth.admin.getUserById(entry.userId)).data.user.email,
    });

    if (error || !data) {
      this.logger.error(`Failed to generate session for exchange code: ${error?.message}`);
      throw new UnauthorizedException('Failed to create session');
    }

    // The generateLink returns hashed_token which we can use to verify the OTP
    // and get a proper session
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    
    const freshClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sessionData, error: sessionError } = await freshClient.auth.verifyOtp({
      token_hash: data.properties.hashed_token,
      type: 'magiclink',
    });

    if (sessionError || !sessionData.session) {
      this.logger.error(`Failed to verify OTP for exchange code: ${sessionError?.message}`);
      throw new UnauthorizedException('Failed to create session');
    }

    this.logger.log(`Exchange code redeemed successfully for user ${entry.userId}`);
    
    return {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_in: sessionData.session.expires_in,
    };
  }
  ```

  **Step B: Add endpoints to `auth.controller.ts`**

  ```typescript
  @Post('exchange-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate one-time exchange code for cross-app auth' })
  @ApiResponse({ status: 201, description: 'Exchange code generated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async generateExchangeCode(@Request() req) {
    return this.authService.generateExchangeCode(req.user.id);
  }

  @Post('exchange-code/redeem')
  @Public()
  @ApiOperation({ summary: 'Redeem exchange code for session tokens' })
  @ApiResponse({ status: 200, description: 'Session tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired code' })
  async redeemExchangeCode(@Body() body: { code: string }) {
    return this.authService.redeemExchangeCode(body.code);
  }
  ```

  **Important implementation notes:**
  - The `generateExchangeCode` endpoint REQUIRES auth (JwtAuthGuard) — only authenticated users can generate codes
  - The `redeemExchangeCode` endpoint is PUBLIC (@Public decorator) — the marketplace needs to call it before having a session
  - Use `randomUUID()` from Node.js `crypto` module for cryptographically secure codes
  - The `generateLink` + `verifyOtp` approach is the recommended Supabase way to create sessions server-side without knowing the user's password

  **Must NOT do**:
  - Do NOT store codes in the database — in-memory Map is sufficient
  - Do NOT use predictable code generation (no timestamp-based, no sequential)
  - Do NOT allow code reuse — delete from Map before processing
  - Do NOT change existing auth endpoints

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (alone)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None

  **References**:
  - `agritech-api/src/modules/auth/auth.service.ts` — Full file. Add `exchangeCodes` Map and two methods. The `databaseService.getAdminClient()` pattern at line 141 shows how to get the admin Supabase client. The `createClient` pattern at lines 40-48 shows how to create fresh Supabase clients.
  - `agritech-api/src/modules/auth/auth.controller.ts` — Full file. Add two endpoints. Follow existing patterns: `@Public()` decorator at line 12 import, `@UseGuards(JwtAuthGuard)` pattern at line 95, `@Request() req` pattern for getting `req.user.id` at line 100.
  - `agritech-api/src/modules/auth/guards/jwt-auth.guard.ts` — JwtAuthGuard import path
  - `agritech-api/src/modules/auth/decorators/public.decorator.ts` — @Public() import path
  - `agritech-api/src/modules/database/database.service.ts` — `getAdminClient()` method
  - Supabase docs: `auth.admin.generateLink()` — generates a magic link for a user without email delivery
  - Supabase docs: `auth.verifyOtp()` — verifies a token hash and returns session

  **Acceptance Criteria**:
  - [ ] `auth.service.ts` has `generateExchangeCode()` and `redeemExchangeCode()` methods
  - [ ] `auth.controller.ts` has `POST /auth/exchange-code` (guarded) and `POST /auth/exchange-code/redeem` (public)
  - [ ] Exchange codes are UUIDs (cryptographically random)
  - [ ] Codes expire after 30 seconds
  - [ ] Codes are single-use (deleted from Map on redemption)
  - [ ] Cleanup interval removes expired codes
  - [ ] Build passes: `pnpm --filter agritech-api build`

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: API builds successfully with new endpoints
    Tool: Bash
    Steps:
      1. pnpm --filter agritech-api build
      2. Assert: exit code 0
    Expected Result: Clean build
    Evidence: Build output

  Scenario: Exchange code methods exist in service
    Tool: Bash (grep)
    Steps:
      1. grep "generateExchangeCode" agritech-api/src/modules/auth/auth.service.ts
      2. Assert: found
      3. grep "redeemExchangeCode" agritech-api/src/modules/auth/auth.service.ts
      4. Assert: found
      5. grep "exchangeCodes" agritech-api/src/modules/auth/auth.service.ts
      6. Assert: found (Map declaration)
      7. grep "randomUUID" agritech-api/src/modules/auth/auth.service.ts
      8. Assert: found
    Expected Result: All exchange code logic present
    Evidence: grep output

  Scenario: Controller endpoints exist with correct decorators
    Tool: Bash (grep)
    Steps:
      1. grep -A2 "exchange-code" agritech-api/src/modules/auth/auth.controller.ts
      2. Assert: contains "@Post" and "@UseGuards" for generate
      3. Assert: contains "@Public" for redeem
    Expected Result: Both endpoints with correct auth decorators
    Evidence: grep output
  ```

  **Commit**: YES (groups with 2, 3, 4)
  - Message: `feat(auth): add secure cross-app exchange code auth between dashboard and marketplace`
  - Files: `agritech-api/src/modules/auth/auth.service.ts`, `agritech-api/src/modules/auth/auth.controller.ts`

---

- [ ] 2. Dashboard: Env var + marketplace-link helper

  **What to do**:

  **Step A: Add env var to `project/.env`**
  - Add line: `VITE_MARKETPLACE_URL=http://localhost:3002`

  **Step B: Update `config/sidebar-nav.ts`**
  - Replace hardcoded constant:
    ```typescript
    // BEFORE:
    export const MARKETPLACE_EXTERNAL_URL = 'https://marketplace.thebzlab.online';
    // AFTER:
    export const MARKETPLACE_EXTERNAL_URL = import.meta.env.VITE_MARKETPLACE_URL || 'https://marketplace.thebzlab.online';
    ```

  **Step C: Create `lib/marketplace-link.ts`**
  ```typescript
  import { supabase } from './supabase';

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const MARKETPLACE_URL = import.meta.env.VITE_MARKETPLACE_URL || 'https://marketplace.thebzlab.online';

  /**
   * Generate a marketplace URL with a secure one-time exchange code.
   * 
   * Flow:
   * 1. Calls API to generate a single-use exchange code (30s expiry)
   * 2. Appends code to marketplace URL as ?code=xxx
   * 3. Marketplace redeems code for a Supabase session
   * 
   * If user is not authenticated or code generation fails,
   * returns the plain marketplace URL (user will need to log in there).
   */
  export async function getMarketplaceUrl(path: string = '/'): Promise<string> {
    const baseUrl = MARKETPLACE_URL.replace(/\/$/, '');
    const url = new URL(path, baseUrl);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // Call API to generate exchange code
        const response = await fetch(`${API_URL}/api/v1/auth/exchange-code`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const { code } = await response.json();
          url.searchParams.set('code', code);
        }
      }
    } catch (error) {
      console.error('Failed to generate exchange code:', error);
      // Fall through — navigate without code (user will need to log in on marketplace)
    }

    return url.toString();
  }

  /**
   * Get the marketplace base URL without exchange code (for non-auth contexts like SEO).
   */
  export function getMarketplaceBaseUrl(): string {
    return MARKETPLACE_URL;
  }
  ```

  **Must NOT do**:
  - Do NOT pass tokens directly in URL — only the exchange code
  - Do NOT change supabase.ts or auth-supabase.ts
  - Do NOT add loading states for the async URL generation

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:
  - `project/.env` — Add `VITE_MARKETPLACE_URL=http://localhost:3002` (also has `VITE_API_URL` at line 16 for API base URL)
  - `project/src/config/sidebar-nav.ts:172` — `MARKETPLACE_EXTERNAL_URL` to make dynamic
  - `project/src/lib/supabase.ts` — Exports `supabase` client to import
  - `project/src/lib/api-client-axios.ts:164-171` — Pattern for getting session token: `supabase.auth.getSession()` → `session.access_token`

  **Acceptance Criteria**:
  - [ ] `project/.env` contains `VITE_MARKETPLACE_URL=http://localhost:3002`
  - [ ] `sidebar-nav.ts` uses `import.meta.env.VITE_MARKETPLACE_URL` with fallback
  - [ ] `lib/marketplace-link.ts` exists with `getMarketplaceUrl()` and `getMarketplaceBaseUrl()`
  - [ ] `getMarketplaceUrl()` calls `POST /auth/exchange-code` and appends `?code=` (not tokens)
  - [ ] Falls back gracefully when not authenticated
  - [ ] TypeScript compiles: `pnpm --filter agriprofy type-check` passes

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: Helper file exists with correct implementation
    Tool: Bash (grep)
    Steps:
      1. test -f project/src/lib/marketplace-link.ts
      2. Assert: file exists
      3. grep "exchange-code" project/src/lib/marketplace-link.ts
      4. Assert: found (calls the API endpoint)
      5. grep "access_token" project/src/lib/marketplace-link.ts
      6. Assert: NOT found as URL param (only in Authorization header)
      7. grep "url.searchParams.set.*code" project/src/lib/marketplace-link.ts
      8. Assert: found (sets ?code= param)
    Expected Result: Uses exchange code, not raw tokens
    Evidence: grep output
  ```

  **Commit**: YES (groups with 1, 3, 4)
  - Message: `feat(auth): add secure cross-app exchange code auth between dashboard and marketplace`
  - Files: `project/.env`, `project/src/config/sidebar-nav.ts`, `project/src/lib/marketplace-link.ts`

---

- [ ] 3. Marketplace: CodeExchanger component + middleware

  **What to do**:

  **Step A: Create `components/CodeExchanger.tsx`**
  
  Client component that redeems exchange code on page load:

  ```typescript
  'use client';

  import { useEffect, useRef } from 'react';
  import { useRouter, useSearchParams, usePathname } from 'next/navigation';
  import { createBrowserSupabaseClient } from '@/lib/supabase/client';

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  /**
   * CodeExchanger handles cross-app auth handoff using secure exchange codes.
   * 
   * When the dashboard navigates to the marketplace with ?code=xxx,
   * this component redeems the code for a Supabase session via the API.
   * The code is single-use and expires in 30 seconds.
   */
  export function CodeExchanger() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const redeemingRef = useRef(false); // Prevent double-redemption in StrictMode

    useEffect(() => {
      const code = searchParams.get('code');
      if (!code || redeemingRef.current) return;

      redeemingRef.current = true;

      const redeemCode = async () => {
        try {
          // Redeem exchange code for session tokens
          const response = await fetch(`${API_URL}/api/v1/auth/exchange-code/redeem`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          if (response.ok) {
            const { access_token, refresh_token } = await response.json();

            // Set Supabase session
            const supabase = createBrowserSupabaseClient();
            await supabase.auth.setSession({ access_token, refresh_token });
          } else {
            console.warn('[CodeExchanger] Failed to redeem code:', response.status);
          }
        } catch (error) {
          console.error('[CodeExchanger] Error redeeming code:', error);
        } finally {
          // Strip code from URL regardless of success/failure
          const params = new URLSearchParams(searchParams.toString());
          params.delete('code');
          const cleanUrl = params.toString()
            ? `${pathname}?${params.toString()}`
            : pathname;
          router.replace(cleanUrl);
          redeemingRef.current = false;
        }
      };

      redeemCode();
    }, [searchParams, pathname, router]);

    return null; // Renders nothing
  }
  ```

  **Step B: Update `lib/supabase/middleware.ts` for server-side code handling**

  Add exchange code handling BEFORE the `getUser()` call:

  ```typescript
  // Handle cross-app auth exchange code
  const exchangeCode = request.nextUrl.searchParams.get('code');
  
  if (exchangeCode) {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/v1/auth/exchange-code/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: exchangeCode }),
      });

      if (response.ok) {
        const { access_token, refresh_token } = await response.json();
        
        // Set session on the server-side Supabase client (sets cookies)
        await supabase.auth.setSession({ access_token, refresh_token });
        
        // Redirect to clean URL (without code param)
        const cleanUrl = request.nextUrl.clone();
        cleanUrl.searchParams.delete('code');
        
        const redirectResponse = NextResponse.redirect(cleanUrl);
        // Copy session cookies to redirect response
        supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
        });
        return redirectResponse;
      }
    } catch (error) {
      // If code redemption fails, continue without auth
      // The code was likely expired or already used
      console.warn('[middleware] Exchange code redemption failed:', error);
    }
  }
  ```

  This server-side handling means:
  - Protected routes work on the FIRST request (no redirect loop)
  - Code is redeemed before the page loads
  - Cookies are set server-side (proper Next.js SSR auth)
  - Client-side `CodeExchanger` is a fallback (e.g., client-side navigation)

  **Important**: Since the code is single-use, only ONE of middleware or CodeExchanger will successfully redeem it. The other will get a 401 and gracefully fail. This is correct behavior — belt and suspenders.

  **Must NOT do**:
  - Do NOT pass raw tokens — only the opaque exchange code
  - Do NOT remove existing `getUser()` logic
  - Do NOT change the protected routes list

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 2)
  - **Blocks**: Task 4
  - **Blocked By**: Task 1

  **References**:
  - `marketplace-frontend/src/lib/supabase/client.ts` — `createBrowserSupabaseClient()` to import in CodeExchanger
  - `marketplace-frontend/src/lib/supabase/middleware.ts` — Add exchange code handling BEFORE line 35 (`getUser()` call). The `supabase` variable (line 9) and `supabaseResponse` variable (line 5) are already available.
  - `marketplace-frontend/src/contexts/AuthContext.tsx:42-48` — `onAuthStateChange` listener will automatically detect the new session from `setSession()`
  - `marketplace-frontend/src/lib/api.ts:88-91` — Shows `NEXT_PUBLIC_API_URL` env var usage pattern

  **Acceptance Criteria**:
  - [ ] `components/CodeExchanger.tsx` exists with `'use client'` directive
  - [ ] CodeExchanger calls `POST /auth/exchange-code/redeem` with the code
  - [ ] CodeExchanger calls `supabase.auth.setSession()` with returned tokens
  - [ ] CodeExchanger strips `?code=` from URL after processing
  - [ ] CodeExchanger has `useRef` guard against double-redemption in StrictMode
  - [ ] Middleware handles `?code=` param server-side before `getUser()`
  - [ ] Middleware redirects to clean URL with session cookies
  - [ ] Build passes: `pnpm --filter marketplace-frontend build`

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: CodeExchanger uses exchange code endpoint, not raw tokens
    Tool: Bash (grep)
    Steps:
      1. grep "access_token" marketplace-frontend/src/components/CodeExchanger.tsx
      2. Assert: NOT found as URL param; only as API response field
      3. grep "exchange-code/redeem" marketplace-frontend/src/components/CodeExchanger.tsx
      4. Assert: found
      5. grep "exchange-code/redeem" marketplace-frontend/src/lib/supabase/middleware.ts
      6. Assert: found
    Expected Result: Uses exchange code API, not URL tokens
    Evidence: grep output

  Scenario: Build succeeds
    Tool: Bash
    Steps:
      1. pnpm --filter marketplace-frontend build
      2. Assert: exit code 0
    Expected Result: Clean build
    Evidence: Build output
  ```

  **Commit**: YES (groups with 1, 2, 4)
  - Message: `feat(auth): add secure cross-app exchange code auth between dashboard and marketplace`
  - Files: `marketplace-frontend/src/components/CodeExchanger.tsx`, `marketplace-frontend/src/lib/supabase/middleware.ts`

---

- [ ] 4. Replace hardcoded marketplace URLs + wire CodeExchanger

  **What to do**:

  **Step A: Update `components/Sidebar.tsx`**

  Replace both `<a href="https://marketplace.thebzlab.online">` tags (lines ~958 and ~1007) with click handlers:

  ```typescript
  // Import at top of file:
  import { getMarketplaceUrl } from '@/lib/marketplace-link';

  // Replace each <a href="https://marketplace.thebzlab.online" target="_blank" ...>
  // with:
  <button
    onClick={async () => {
      const url = await getMarketplaceUrl('/');
      window.open(url, '_blank', 'noopener,noreferrer');
    }}
    className="block w-full text-left"
  >
    {/* Keep existing Button content inside */}
  </button>
  ```

  Two locations to replace:
  - **Line ~958** (collapsed sidebar popover)
  - **Line ~1007** (expanded sidebar)

  **Step B: Update `components/OrganizationSettings.tsx`**

  Replace line 222 hardcoded link with click handler:
  ```typescript
  import { getMarketplaceUrl } from '@/lib/marketplace-link';

  <button
    onClick={async () => {
      const url = await getMarketplaceUrl(`/sellers/${orgData.slug}`);
      window.open(url, '_blank', 'noopener,noreferrer');
    }}
    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
  >
    <ExternalLink className="h-4 w-4" />
    <span className="hidden sm:inline">Preview on Marketplace</span>
    <span className="sm:hidden">Preview</span>
  </button>
  ```

  **Step C: Wire CodeExchanger into marketplace `layout.tsx`**

  ```typescript
  import { Suspense } from 'react';
  import { CodeExchanger } from '@/components/CodeExchanger';

  // Inside JSX, add after AuthProvider:
  <AuthProvider>
    <Suspense fallback={null}>
      <CodeExchanger />
    </Suspense>
    <CartProvider>
      {children}
    </CartProvider>
  </AuthProvider>
  ```

  **Step D: Do NOT change `LandingPage.tsx`**
  - Line 73 `sameAs: ['https://marketplace.thebzlab.online']` is SEO metadata — always production URL.

  **Must NOT do**:
  - Do NOT change LandingPage.tsx sameAs URL
  - Do NOT remove `target="_blank"` behavior (marketplace opens in new tab)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (alone — final integration)
  - **Blocks**: None
  - **Blocked By**: Tasks 2, 3

  **References**:
  - `project/src/components/Sidebar.tsx:948-1025` — Marketplace section, two `<a>` tags to replace
  - `project/src/components/OrganizationSettings.tsx:221-230` — Preview link to replace
  - `project/src/components/LandingPage.tsx:73` — SEO sameAs URL — DO NOT CHANGE
  - `project/src/lib/marketplace-link.ts` — Import `getMarketplaceUrl` (from Task 2)
  - `marketplace-frontend/src/app/layout.tsx` — Root layout, add CodeExchanger between AuthProvider and CartProvider (lines 43-44)
  - `marketplace-frontend/src/components/CodeExchanger.tsx` — Component from Task 3

  **Acceptance Criteria**:
  - [ ] Zero occurrences of `href="https://marketplace.thebzlab.online"` in Sidebar.tsx
  - [ ] Zero occurrences of `https://marketplace.thebzlab.online` in OrganizationSettings.tsx
  - [ ] Both Sidebar links use `getMarketplaceUrl()` with `window.open()`
  - [ ] OrganizationSettings uses `getMarketplaceUrl('/sellers/${slug}')`
  - [ ] `LandingPage.tsx` sameAs URL UNCHANGED
  - [ ] `layout.tsx` imports and renders `<CodeExchanger />` inside `<Suspense>`
  - [ ] Both apps build: `pnpm --filter agriprofy type-check && pnpm --filter marketplace-frontend build`

  **Agent-Executed QA Scenarios**:
  ```
  Scenario: No hardcoded marketplace URLs in navigation components
    Tool: Bash (grep)
    Steps:
      1. grep -c "https://marketplace.thebzlab.online" project/src/components/Sidebar.tsx
      2. Assert: 0 occurrences
      3. grep -c "https://marketplace.thebzlab.online" project/src/components/OrganizationSettings.tsx
      4. Assert: 0 occurrences
      5. grep "getMarketplaceUrl" project/src/components/Sidebar.tsx
      6. Assert: found (at least 2 occurrences)
    Expected Result: All links use dynamic helper
    Evidence: grep output

  Scenario: CodeExchanger wired in layout
    Tool: Bash (grep)
    Steps:
      1. grep "CodeExchanger" marketplace-frontend/src/app/layout.tsx
      2. Assert: found
      3. grep "Suspense" marketplace-frontend/src/app/layout.tsx
      4. Assert: found
    Expected Result: CodeExchanger in layout with Suspense
    Evidence: grep output

  Scenario: LandingPage SEO preserved
    Tool: Bash (grep)
    Steps:
      1. grep "marketplace.thebzlab.online" project/src/components/LandingPage.tsx
      2. Assert: found (sameAs still production)
    Expected Result: SEO URL unchanged
    Evidence: grep output

  Scenario: All builds pass
    Tool: Bash
    Steps:
      1. pnpm --filter agriprofy type-check
      2. Assert: exit code 0
      3. pnpm --filter marketplace-frontend build
      4. Assert: exit code 0
      5. pnpm --filter agritech-api build
      6. Assert: exit code 0
    Expected Result: All 3 apps build
    Evidence: Build output
  ```

  **Commit**: YES (groups with 1, 2, 3)
  - Message: `feat(auth): add secure cross-app exchange code auth between dashboard and marketplace`
  - Files: `project/src/components/Sidebar.tsx`, `project/src/components/OrganizationSettings.tsx`, `marketplace-frontend/src/app/layout.tsx`

---

## Commit Strategy

| After Tasks | Message | Files | Verification |
|-------------|---------|-------|--------------|
| 1-4 (all) | `feat(auth): add secure cross-app exchange code auth between dashboard and marketplace` | All modified files | `pnpm --filter agritech-api build && pnpm --filter agriprofy type-check && pnpm --filter marketplace-frontend build` |

---

## Success Criteria

### Verification Commands
```bash
# All 3 apps build
pnpm --filter agritech-api build           # Expected: passes
pnpm --filter agriprofy type-check         # Expected: passes
pnpm --filter marketplace-frontend build   # Expected: passes

# No tokens in URLs (only exchange codes)
grep -r "access_token" project/src/lib/marketplace-link.ts  # Expected: only in auth header, NOT in URL
grep "url.searchParams.set.*code" project/src/lib/marketplace-link.ts  # Expected: found (exchange code)

# No hardcoded marketplace URLs in nav components
grep "https://marketplace.thebzlab.online" project/src/components/Sidebar.tsx  # Expected: 0 matches
grep "https://marketplace.thebzlab.online" project/src/components/OrganizationSettings.tsx  # Expected: 0 matches

# Exchange code endpoints exist
grep "exchange-code" agritech-api/src/modules/auth/auth.controller.ts  # Expected: found
grep "randomUUID" agritech-api/src/modules/auth/auth.service.ts  # Expected: found
```

### Final Checklist
- [ ] Exchange codes are cryptographically random UUIDs
- [ ] Exchange codes expire in 30 seconds
- [ ] Exchange codes are single-use (deleted on redemption)
- [ ] No tokens (access_token, refresh_token) appear in any URL
- [ ] Only opaque exchange code appears as `?code=` parameter
- [ ] Marketplace middleware handles code server-side (before page load)
- [ ] Marketplace CodeExchanger handles code client-side (fallback)
- [ ] Dashboard links use `getMarketplaceUrl()` via `window.open()`
- [ ] `VITE_MARKETPLACE_URL` env var configurable per environment
- [ ] LandingPage.tsx SEO sameAs URL unchanged
- [ ] All 3 apps build successfully
