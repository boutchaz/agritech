# Marketplace Production Overhaul

## TL;DR

> **Quick Summary**: Transform the AgriTech marketplace POC into a production-ready platform. Fix architectural foundations (auth, layouts, data fetching), add SSR/SEO for public pages, build server-side search with pagination, add seller order management in the main app, build quote requests UI in marketplace, add reviews system, and integrate notifications.
> 
> **Deliverables**:
> - Production-ready marketplace frontend with proper auth, shared layouts, SSR
> - Server-side search/filter/sort with API pagination
> - Seller order management in main AgriTech dashboard
> - Quote requests buyer UI in marketplace
> - Reviews & ratings system
> - Real-time notification integration
> 
> **Estimated Effort**: XL (~40-50 TODOs across 5 phases)
> **Parallel Execution**: YES - 3 waves per phase where possible
> **Critical Path**: Foundation → SSR → Search API → Features → Notifications

---

## Context

### Original Request
User has a marketplace POC and wants to invest significant effort to make it production-ready. The marketplace should work both as a standalone app for external buyers AND integrate with the main AgriTech dashboard for sellers.

### Interview Summary
**Key Discussions**:
- **Goal**: Both standalone + integrated marketplace
- **Priority features**: Everything — shared layout/auth, seller order mgmt, search/filtering, reviews, SSR/SEO, quote requests UI, notifications
- **Approach**: Full plan first, then execute phase by phase

**Research Findings**:
- Backend (NestJS) is solid — marketplace module has: products, cart, orders, sellers, quote requests services
- Frontend is POC quality — all client-side, no auth context, copy-paste layouts, no data fetching library
- Auth is actually Supabase JWT through NestJS — `@supabase/ssr` is installed but unused
- Main app already has a `/marketplace` page showing sales items from inventory
- `QuoteRequestsController` uses `@UseGuards(JwtAuthGuard)` properly; other controllers extract tokens manually — inconsistency
- No API pagination on products — `getPublicProducts()` returns ALL products
- Categories come from Strapi CMS with fallback hardcoded data
- Email notifications already work via `NotificationsService`; WebSocket gateway exists

### Local Dev Port Matrix (CANONICAL)

> All QA scenarios and dev commands MUST use these ports consistently.

| Service | Port | How Set |
|---------|------|---------|
| NestJS API | `localhost:3000` | `main.ts:402` — `configService.get('PORT', 3000)` |
| Marketplace Frontend | `localhost:3001` | Set in `package.json`: `"dev": "next dev --port 3001"` |
| Main App (Vite) | `localhost:5173` | Vite default |
| Strapi CMS | `localhost:1337` | Strapi default |

**IMPORTANT**: Task 1 or Task 2 must update `marketplace-frontend/package.json` scripts:
```json
"dev": "next dev --port 3001"
```

### Codex Review Resolutions (Post-Review Fixes Applied)

| Issue | Severity | Resolution |
|-------|----------|------------|
| Signup bypasses backend provisioning | P0 | **Fixed**: Task 2 keeps `POST /auth/signup` for provisioning, only switches login/session to Supabase SSR cookies |
| Port collision (API + frontend both on 3000) | P0 | **Fixed**: Port matrix defined. Marketplace runs on `localhost:3001`. All QA URLs updated. |
| `req.user.organizationId` not populated | P1 | **Fixed**: Task 3 now includes JwtStrategy enhancement to resolve org from `organization_users` table |
| API contract contradiction (array vs paginated) | P1 | **Fixed**: Task 13 returns array when no params (backwards-compat), paginated object when params present |
| Dual-source pagination algorithm incorrect | P1 | **Fixed**: Task 13 uses fetch-all + in-memory pagination (correct), not per-source `.range()` |
| NotificationsGateway token verification | P1 | **Mitigated**: Task 22 includes verification step and fallback to `authService.validateToken()` |
| No test fixtures for QA scenarios | P2 | **Fixed**: Added Test Data Setup section to Verification Strategy |
| Middleware missing `/quote-requests/*` | P2 | **Fixed**: Task 2 middleware now protects `/quote-requests/*` |

### Metis Review
**Identified Gaps** (addressed):
- Auth inconsistency across controllers → Phase 0 standardizes all guards
- No pagination/search API → Phase 2 adds backend params before frontend
- Dual product sources (marketplace_listings + items) → Document transform, keep as-is
- Token expiry without refresh → `@supabase/ssr` handles automatically
- 200+ hardcoded French strings → i18n infrastructure in Phase 0, extract incrementally
- Reviews need order verification → Backend enforces buyer-has-purchased check

---

## Work Objectives

### Core Objective
Transform the marketplace POC into a production-grade platform that works standalone for buyers and integrates with the main app for sellers, with proper auth, SSR, search, and all critical marketplace features.

### Concrete Deliverables
- `marketplace-frontend/`: Refactored with shared layouts, `@supabase/ssr` auth, React Query, SSR public pages
- `agritech-api/src/modules/marketplace/`: Paginated search API, standardized auth guards, reviews endpoints
- `project/src/routes/_authenticated/(misc)/marketplace/`: Seller order management page

### Definition of Done
- [x] `pnpm --filter marketplace-frontend build` succeeds
- [x] `pnpm --filter agritech-api build` succeeds
- [x] `pnpm --filter agriprofy build` succeeds
- [x] All marketplace public pages return server-rendered HTML (curl test)
- [x] Auth flow works: signup → login → cart → checkout → order
- [x] Seller can manage orders from main app dashboard

### Must Have
- `@supabase/ssr` cookie-based auth replacing localStorage
- Shared layout components (no more copy-paste nav/footer)
- React Query (TanStack Query) for all data fetching
- SSR for product pages (crawlable by Google)
- Paginated, searchable product API
- Seller order management in main app
- Quote requests UI for buyers

### Must NOT Have (Guardrails)
- NO `as any` or `@ts-ignore` in new code
- NO iframe integration between apps
- NO Stripe payment — use COD + virement for Morocco
- NO Arabic/RTL — French-only with i18n infrastructure
- NO custom NestJS session system — Supabase JWT only
- NO SSR conversion for `/cart`, `/checkout`, `/dashboard/*` (keep client-side)
- NO micro-frontend architecture
- NO separate auth system for marketplace

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks are verified by the agent using tools. No manual testing.

### Test Decision
- **Infrastructure exists**: NO (marketplace has zero tests)
- **Automated tests**: Tests-after for critical API endpoints
- **Framework**: Vitest for marketplace-frontend, Jest for agritech-api (already configured)

### Test Data Setup (MANDATORY for QA Scenarios)

> Many QA scenarios require preconditions like "test user exists", "product exists", "pending order exists".
> These MUST be created programmatically — not assumed to exist.

**Before any QA scenario runs, the executing agent must ensure:**
1. **Test user**: Create via `POST /auth/signup` to API (provisions user + org + role)
2. **Test products**: Create via `POST /marketplace/listings` with test user's auth token
3. **Test orders**: Create via cart → checkout flow using Playwright or curl
4. **Tokens**: Obtain valid Supabase JWT by logging in via `supabase.auth.signInWithPassword()`

**Fixture Setup Approaches (per-task):**
- **Curl-based**: For API tasks, create fixtures via curl before running assertions
- **Playwright-based**: For UI tasks, run the prerequisite flow (signup → create listing → etc.) as setup steps
- **Shared state**: Tasks in the same wave can share fixtures created by the first task to complete

**Each QA scenario's "Preconditions" section must specify HOW to create the required state, not just WHAT state is needed.**

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Marketplace Frontend** | Playwright | Navigate, interact, assert DOM, screenshot |
| **NestJS API** | Bash (curl) | Send requests, parse responses, assert fields |
| **Main App Pages** | Playwright | Navigate, interact, assert DOM, screenshot |
| **SSR Verification** | Bash (curl) | Check raw HTML contains rendered content |
| **Build Verification** | Bash | Run build commands, check exit codes |

---

## Execution Strategy

### Parallel Execution Waves

```
PHASE 0 — Foundation (MUST complete before anything else):
Wave 0.1 (Start Immediately):
├── Task 1: Shared Layout Components
├── Task 2: Auth System (@supabase/ssr)
└── Task 3: Backend Auth Guard Standardization

Wave 0.2 (After Wave 0.1):
├── Task 4: React Query Setup + Data Fetching Hooks
├── Task 5: i18n Infrastructure (next-intl)
└── Task 6: Refactor existing pages to use layouts + auth + hooks

PHASE 1 — SSR & SEO (After Phase 0):
Wave 1.1 (Start):
├── Task 7: Product Detail SSR (/products/[id])
├── Task 8: Products Listing SSR (/products)
└── Task 9: Categories SSR (/categories, /categories/[slug])

Wave 1.2 (After 1.1):
├── Task 10: Sellers SSR (/sellers, /sellers/[slug])
├── Task 11: Homepage SSR (/)
└── Task 12: SEO Meta + JSON-LD + Sitemap

PHASE 2 — Search & Filtering (After Phase 1):
Wave 2.1 (Backend first):
└── Task 13: Paginated Search API (NestJS)

Wave 2.2 (After 2.1):
├── Task 14: Frontend Search UI + Filters
└── Task 15: Pagination Component

PHASE 3 — Features (After Phase 2, can parallelize):
Wave 3.1 (Parallel):
├── Task 16: Seller Order Management (Main App)
├── Task 17: Quote Requests Buyer UI (Marketplace)
└── Task 18: Reviews Backend API

Wave 3.2 (After 3.1):
├── Task 19: Reviews Frontend UI
├── Task 20: Quote Requests Polish
└── Task 21: Seller Dashboard Enhancement

PHASE 4 — Notifications (After Phase 3):
Wave 4.1:
├── Task 22: Notification Bell Component
└── Task 23: Email Notification Templates

Wave 4.2:
└── Task 24: Final Integration Testing & Polish
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4, 6, 7-12 | 2, 3 |
| 2 | None | 4, 6, 7-12 | 1, 3 |
| 3 | None | 13, 16, 18 | 1, 2 |
| 4 | 1, 2 | 7-12 | 5, 6 |
| 5 | 1 | 6 | 4, 6 |
| 6 | 1, 2, 4 | 7-12 | 5 |
| 7 | 4, 6 | 12 | 8, 9 |
| 8 | 4, 6 | 14 | 7, 9 |
| 9 | 4, 6 | None | 7, 8 |
| 10 | 4, 6 | None | 11, 12 |
| 11 | 4, 6 | None | 10, 12 |
| 12 | 7 | None | 10, 11 |
| 13 | 3 | 14, 15 | None |
| 14 | 8, 13 | None | 15 |
| 15 | 13 | None | 14 |
| 16 | 3 | None | 17, 18 |
| 17 | 2, 4 | 20 | 16, 18 |
| 18 | 3 | 19 | 16, 17 |
| 19 | 18, 4 | None | 20, 21 |
| 20 | 17 | None | 19, 21 |
| 21 | 16, 4 | None | 19, 20 |
| 22 | 2, 4 | None | 23 |
| 23 | None | None | 22 |
| 24 | All | None | None |

---

## TODOs

---

### PHASE 0: FOUNDATION

---

- [x] 1. Shared Layout Components

  **What to do**:
  - Create `marketplace-frontend/src/components/layout/Navbar.tsx` — extract the repeated nav from `(public)/page.tsx`
  - Create `marketplace-frontend/src/components/layout/Footer.tsx` — extract the repeated footer
  - Create `marketplace-frontend/src/components/layout/DashboardSidebar.tsx` — for auth pages
  - Update `marketplace-frontend/src/app/(public)/layout.tsx` — wrap children with Navbar + Footer
  - Update `marketplace-frontend/src/app/(auth)/layout.tsx` — wrap with DashboardSidebar + Navbar
  - Remove all inline nav/footer HTML from every page file
  - Navbar should be responsive with mobile hamburger menu (already designed, just extract)
  - Navbar must show auth state: "Connexion" when logged out, user menu when logged in
  - Navbar must include CartIcon component (already exists at `src/components/CartIcon.tsx`)

  **Must NOT do**:
  - Do NOT install a component library (shadcn, etc.) — keep Tailwind-only for marketplace
  - Do NOT change the visual design — preserve current emerald green theme exactly
  - Do NOT create a design system — this is extraction, not redesign

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component extraction with layout architecture
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Layout architecture and responsive design

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0.1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5, 6, 7-12
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `marketplace-frontend/src/app/(public)/page.tsx:84-159` — Current nav implementation to extract (lines 84-159 for nav, 346-397 for footer)
  - `marketplace-frontend/src/app/(public)/products/page.tsx:97-172` — Duplicate nav showing exact copy-paste pattern
  - `marketplace-frontend/src/components/CartIcon.tsx` — Cart icon component to include in nav

  **API/Type References**:
  - `marketplace-frontend/src/app/layout.tsx` — Root layout showing CartProvider wrapper pattern
  - `marketplace-frontend/src/app/(public)/page.tsx:84` — Nav links: `/products`, `/categories`, dashboard external link, `/login`, `/signup`

  **Acceptance Criteria**:

  - [ ] `marketplace-frontend/src/components/layout/Navbar.tsx` exists and exports Navbar component
  - [ ] `marketplace-frontend/src/components/layout/Footer.tsx` exists and exports Footer component
  - [ ] `marketplace-frontend/src/app/(public)/layout.tsx` uses Navbar + Footer wrapping `{children}`
  - [ ] `marketplace-frontend/src/app/(auth)/layout.tsx` uses Navbar wrapping `{children}`
  - [ ] Zero inline nav/footer HTML in any page.tsx file (grep confirms no nav class duplication)
  - [ ] `pnpm --filter marketplace-frontend build` succeeds

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Public pages share consistent navigation
    Tool: Playwright (playwright skill)
    Preconditions: Marketplace dev server running on localhost:3001, API on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3001/
      2. Assert: nav element visible with AgriTech logo
      3. Assert: nav contains links to /products, /categories
      4. Navigate to: http://localhost:3001/products
      5. Assert: same nav element structure present
      6. Assert: footer with "© 2025 AgriTech" visible
      7. Navigate to: http://localhost:3001/categories
      8. Assert: same nav and footer present
      9. Screenshot: .sisyphus/evidence/task-1-shared-layout.png
    Expected Result: All pages share identical nav/footer from layout
    Evidence: .sisyphus/evidence/task-1-shared-layout.png

  Scenario: Mobile navigation hamburger menu works
    Tool: Playwright (playwright skill)
    Preconditions: Marketplace dev server on localhost:3001, viewport set to 375x667
    Steps:
      1. Navigate to: http://localhost:3001/
      2. Assert: hamburger menu button visible (md:hidden)
      3. Click: hamburger menu button
      4. Assert: mobile menu overlay visible with Produits, Catégories links
      5. Click: X close button
      6. Assert: mobile menu hidden
      7. Screenshot: .sisyphus/evidence/task-1-mobile-nav.png
    Expected Result: Mobile hamburger menu opens and closes correctly
    Evidence: .sisyphus/evidence/task-1-mobile-nav.png
  ```

  **Commit**: YES
  - Message: `refactor(marketplace): extract shared layout components from page files`
  - Files: `marketplace-frontend/src/components/layout/*, marketplace-frontend/src/app/(public)/layout.tsx, marketplace-frontend/src/app/(auth)/layout.tsx, marketplace-frontend/src/app/(public)/page.tsx, marketplace-frontend/src/app/(public)/products/page.tsx, marketplace-frontend/src/app/(public)/categories/page.tsx, marketplace-frontend/src/app/(public)/sellers/page.tsx, marketplace-frontend/src/app/(auth)/dashboard/page.tsx`
  - Pre-commit: `pnpm --filter marketplace-frontend build`

---

- [x] 2. Auth System — @supabase/ssr Cookie-Based Auth

  **What to do**:
  - Create `marketplace-frontend/src/lib/supabase/server.ts` — `createServerClient()` using `@supabase/ssr` with cookies
  - Create `marketplace-frontend/src/lib/supabase/client.ts` — `createBrowserClient()` using `@supabase/ssr`
  - Create `marketplace-frontend/src/lib/supabase/middleware.ts` — session refresh logic for Next.js middleware
  - Create `marketplace-frontend/src/middleware.ts` — Next.js middleware that refreshes Supabase session via cookies, protects `/dashboard/*`, `/orders/*`, `/checkout`, `/quote-requests/*`
  - Create `marketplace-frontend/src/contexts/AuthContext.tsx` — AuthProvider with user state, loading, login, logout, signup methods
  - Refactor `marketplace-frontend/src/lib/api.ts` — `ApiClient` should get token from Supabase session (not localStorage), use `getAuthenticatedSupabase()` for token extraction
  - Refactor `marketplace-frontend/src/contexts/CartContext.tsx` — replace `localStorage.getItem('auth_token')` check with `useAuth()` hook
  - Update login page (`src/app/(public)/login/page.tsx`) to use `supabase.auth.signInWithPassword()` which sets cookies
  - Update signup page (`src/app/(public)/signup/page.tsx`) — **CRITICAL: keep calling `POST /auth/signup` via ApiClient** (backend provisions user profile + organization + role links via `auth.service.ts:332-527`). On success (returns `requiresLogin: true`), call `supabase.auth.signInWithPassword()` to establish cookie-based session. Do NOT use `supabase.auth.signUp()` directly — that would bypass all backend provisioning and create users without org wiring.
  - Remove all direct `localStorage.getItem('auth_token')` / `localStorage.setItem('auth_token')` calls
  - Update `marketplace-frontend/src/app/layout.tsx` to wrap with AuthProvider (inside CartProvider)
  - Ensure token refresh happens automatically via middleware on every request

  **Must NOT do**:
  - Do NOT create a separate NestJS session system
  - Do NOT change the NestJS JWT validation — it already validates Supabase JWTs correctly
  - Do NOT remove `@supabase/supabase-js` — keep it alongside `@supabase/ssr`
  - Do NOT change `marketplace-frontend/.env` structure (keep NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Auth architecture is security-critical, requires deep understanding of Supabase SSR cookie flow + Next.js middleware
  - **Skills**: [`supabase-skill`]
    - `supabase-skill`: Supabase auth patterns, SSR client creation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0.1 (with Tasks 1, 3)
  - **Blocks**: Tasks 4, 6, 7-12, 17, 22
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `marketplace-frontend/src/lib/supabase.ts` — Current Supabase client (to be replaced)
  - `marketplace-frontend/src/lib/api.ts:77-80` — Current localStorage token extraction
  - `marketplace-frontend/src/lib/api.ts:130-141` — Login storing token in localStorage
  - `marketplace-frontend/src/contexts/CartContext.tsx:28` — localStorage auth check pattern to replace
  - `marketplace-frontend/src/app/(public)/checkout/page.tsx:51` — localStorage auth redirect pattern

  **API/Type References**:
  - `marketplace-frontend/package.json:12-13` — `@supabase/ssr: ^0.8.0` already installed
  - `agritech-api/src/modules/auth/strategies/jwt.strategy.ts` — NestJS validates Supabase JWTs (RS256)

  **External References**:
  - Official docs: `https://supabase.com/docs/guides/auth/server-side/nextjs` — @supabase/ssr setup for Next.js App Router

  **Acceptance Criteria**:

  - [ ] `marketplace-frontend/src/lib/supabase/server.ts` exports `createServerSupabaseClient()`
  - [ ] `marketplace-frontend/src/lib/supabase/client.ts` exports `createBrowserSupabaseClient()`
  - [ ] `marketplace-frontend/src/middleware.ts` exists and refreshes session
  - [ ] `marketplace-frontend/src/contexts/AuthContext.tsx` exports `AuthProvider` and `useAuth()`
  - [ ] Zero occurrences of `localStorage.getItem('auth_token')` in codebase (grep confirms)
  - [ ] Zero occurrences of `localStorage.setItem('auth_token')` in codebase
  - [ ] Signup still calls `POST /auth/signup` (not `supabase.auth.signUp()`) — verify with grep for `ApiClient.signup` or `/auth/signup`
  - [ ] After signup, user has profile record + organization record + organization_users role link in Supabase
  - [ ] `pnpm --filter marketplace-frontend build` succeeds

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Login sets Supabase session cookies (not localStorage)
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3001, API on localhost:3000, test user exists in Supabase
    Steps:
      1. Navigate to: http://localhost:3001/login
      2. Fill: input[name="email"] → test user email
      3. Fill: input[name="password"] → test user password
      4. Click: submit button
      5. Wait for: navigation to /dashboard (timeout: 10s)
      6. Execute JS: document.cookie → assert contains 'sb-' prefixed cookies
      7. Execute JS: localStorage.getItem('auth_token') → assert returns null
      8. Screenshot: .sisyphus/evidence/task-2-login-cookies.png
    Expected Result: Session stored in cookies, not localStorage
    Evidence: .sisyphus/evidence/task-2-login-cookies.png

  Scenario: Signup provisions backend resources then establishes cookie session
    Tool: Playwright (playwright skill)
    Preconditions: Dev server on localhost:3001, API on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3001/signup
      2. Fill signup form with unique test email, password, display name, seller type
      3. Click: submit button
      4. Wait for: navigation to /dashboard (timeout: 15s)
      5. Verify backend provisioning via API: curl -s http://localhost:3000/api/v1/auth/me (with cookie) → assert response contains organizationId
      6. Execute JS: document.cookie → assert contains 'sb-' prefixed cookies (session via signInWithPassword after signup)
      7. Screenshot: .sisyphus/evidence/task-2-signup-provision.png
    Expected Result: User created with profile + org via backend, then session established via Supabase cookies
    Evidence: .sisyphus/evidence/task-2-signup-provision.png

  Scenario: Protected route redirects to login when unauthenticated
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:3001, no active session
    Steps:
      1. Clear all cookies
      2. Navigate to: http://localhost:3001/dashboard
      3. Wait for: navigation to /login (timeout: 5s)
      4. Assert: URL contains /login
      5. Navigate to: http://localhost:3001/quote-requests
      6. Wait for: navigation to /login (timeout: 5s)
      7. Assert: URL contains /login
      8. Screenshot: .sisyphus/evidence/task-2-auth-redirect.png
    Expected Result: Unauthenticated user redirected to login for all protected routes
    Evidence: .sisyphus/evidence/task-2-auth-redirect.png
  ```

  **Commit**: YES
  - Message: `feat(marketplace): replace localStorage auth with @supabase/ssr cookie-based auth`
  - Files: `marketplace-frontend/src/lib/supabase/*, marketplace-frontend/src/middleware.ts, marketplace-frontend/src/contexts/AuthContext.tsx, marketplace-frontend/src/contexts/CartContext.tsx, marketplace-frontend/src/lib/api.ts, marketplace-frontend/src/app/(public)/login/page.tsx, marketplace-frontend/src/app/(public)/signup/page.tsx, marketplace-frontend/src/app/layout.tsx`
  - Pre-commit: `pnpm --filter marketplace-frontend build`

---

- [x] 3. Backend Auth Guard Standardization

  **What to do**:
  - Refactor `agritech-api/src/modules/marketplace/marketplace.controller.ts` — replace all manual `request.headers.authorization` extraction with `@UseGuards(JwtAuthGuard)` + `@Request() req` pattern
  - Refactor `agritech-api/src/modules/marketplace/orders.controller.ts` — replace `extractToken()` private method with `@UseGuards(JwtAuthGuard)` + `@Request() req`
  - Refactor `agritech-api/src/modules/marketplace/cart.controller.ts` — same pattern
  - Keep `QuoteRequestsController` as-is — it's already correct
  - Keep `SellersController` as-is — it's public (no auth needed for browsing sellers)
  - For endpoints that are public (GET products, GET categories), keep them without guards
  - For endpoints that require auth (POST listings, GET my-listings, cart operations, order operations), add `@UseGuards(JwtAuthGuard)`
  - Update services to accept `req.user` object instead of raw token where possible, OR keep passing token to services that use `getClientWithAuth(token)` — the token comes from `req.user.token` or `req.headers.authorization`
  - **CRITICAL FIX**: `req.user` does NOT currently contain `organizationId`. The `JwtStrategy` (`jwt.strategy.ts:44`) only attaches the Supabase User object (id, email, user_metadata) plus a `userId` alias. It does NOT resolve org context. **Must enhance `JwtStrategy.canActivate()`** to:
    1. After `validateToken()` succeeds, query `organization_users` table to get the user's active organization: `SELECT organization_id FROM organization_users WHERE user_id = $userId AND is_active = true LIMIT 1`
    2. Attach `organizationId` to `request.user` alongside existing fields
    3. This is required because `QuoteRequestsController` (and soon all standardized controllers) reads `req.user?.organizationId`
  - Keep `QuoteRequestsController` as-is — it's the correct target pattern, but it currently fails silently (returns 400 "Organization not found") because `organizationId` is missing. This fix makes it work.

  **Must NOT do**:
  - Do NOT change public endpoints (GET products, GET categories, GET sellers) to require auth
  - Do NOT change the JwtStrategy itself — it works correctly
  - Do NOT remove the `extractToken` pattern from services — controllers can still pass tokens to services

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical refactor — replace manual token extraction with decorator pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0.1 (with Tasks 1, 2)
  - **Blocks**: Tasks 13, 16, 18
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `agritech-api/src/modules/marketplace/quote-requests.controller.ts:26-38` — CORRECT pattern to follow: `@UseGuards(JwtAuthGuard)` + `@Request() req` + `req.user?.organizationId`
  - `agritech-api/src/modules/marketplace/marketplace.controller.ts:59-71` — INCORRECT pattern: manual `request.headers.authorization` extraction
  - `agritech-api/src/modules/marketplace/orders.controller.ts:21-27` — INCORRECT: `extractToken()` helper

  **API/Type References**:
  - `agritech-api/src/modules/auth/guards/jwt-auth.guard.ts` — JwtAuthGuard class (delegates to JwtStrategy)
  - `agritech-api/src/modules/auth/strategies/jwt.strategy.ts:16-61` — Currently populates `req.user` with Supabase User + `userId` alias only. **Must be enhanced to also resolve `organizationId`** from `organization_users` table.
  - `agritech-api/src/modules/auth/auth.service.ts:85-135` — `validateToken()` returns raw Supabase User (id, email, user_metadata — no org context)
  - `agritech-api/src/modules/database/database.service.ts` — `getAdminClient()` needed for org lookup query

  **Acceptance Criteria**:

  - [ ] `JwtStrategy.canActivate()` resolves `organizationId` from `organization_users` and attaches to `req.user`
  - [ ] `marketplace.controller.ts` uses `@UseGuards(JwtAuthGuard)` on all auth-required endpoints
  - [ ] `orders.controller.ts` uses `@UseGuards(JwtAuthGuard)` — no more `extractToken()` method
  - [ ] `cart.controller.ts` uses `@UseGuards(JwtAuthGuard)` on all endpoints
  - [ ] `sellers.controller.ts` remains guard-free (public endpoints)
  - [ ] `req.user.organizationId` is populated on all auth-guarded requests (verify via curl with valid token)
  - [ ] `pnpm --filter agritech-api build` succeeds
  - [ ] `pnpm --filter agritech-api test` passes (if tests exist)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Protected endpoint returns 401 without token
    Tool: Bash (curl)
    Preconditions: API server running on localhost:3000
    Steps:
      1. curl -s -w "\n%{http_code}" http://localhost:3000/api/v1/marketplace/my-listings
      2. Assert: HTTP status is 401
      3. curl -s -w "\n%{http_code}" http://localhost:3000/api/v1/marketplace/cart
      4. Assert: HTTP status is 401
    Expected Result: All auth-required endpoints return 401 without Bearer token
    Evidence: Response status codes captured

  Scenario: Public endpoints work without auth
    Tool: Bash (curl)
    Preconditions: API server running on localhost:3000
    Steps:
      1. curl -s -w "\n%{http_code}" http://localhost:3000/api/v1/marketplace/products
      2. Assert: HTTP status is 200
      3. curl -s -w "\n%{http_code}" http://localhost:3000/api/v1/marketplace/categories
      4. Assert: HTTP status is 200
    Expected Result: Public endpoints accessible without auth
    Evidence: Response status codes captured

  Scenario: Authenticated request includes organizationId in req.user
    Tool: Bash (curl)
    Preconditions: API server running on localhost:3000, valid Supabase JWT token for user with organization
    Steps:
      1. curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/marketplace/quote-requests/sent
      2. Assert: HTTP status is 200 (not 400 "Organization not found")
      3. curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/marketplace/cart
      4. Assert: HTTP status is 200 or 404 (not 400 "Organization not found")
    Expected Result: organizationId is resolved and available on req.user
    Evidence: Response status codes and bodies captured
  ```

  **Commit**: YES
  - Message: `fix(api): standardize auth guards across all marketplace controllers`
  - Files: `agritech-api/src/modules/marketplace/marketplace.controller.ts, agritech-api/src/modules/marketplace/orders.controller.ts, agritech-api/src/modules/marketplace/cart.controller.ts`
  - Pre-commit: `pnpm --filter agritech-api build`

---

- [x] 4. React Query Setup + Data Fetching Hooks

  **What to do**:
  - Install TanStack Query: `pnpm --filter marketplace-frontend add @tanstack/react-query`
  - Create `marketplace-frontend/src/lib/query-client.ts` — configure QueryClient with defaults (staleTime: 5min)
  - Create `marketplace-frontend/src/providers/QueryProvider.tsx` — QueryClientProvider wrapper
  - Update `marketplace-frontend/src/app/layout.tsx` — add QueryProvider wrapper
  - Create data fetching hooks:
    - `src/hooks/useProducts.ts` — `useProducts(category?)`, `useProduct(id)`
    - `src/hooks/useCategories.ts` — `useCategories()`, `useFeaturedCategories()`
    - `src/hooks/useSellers.ts` — `useSellers(params)`, `useSeller(slug)`, `useSellerProducts(slug)`, `useSellerReviews(slug)`
    - `src/hooks/useOrders.ts` — `useOrders()`, `useOrder(id)`, `useCancelOrder()`, `useCreateOrder()`
    - `src/hooks/useListings.ts` — `useMyListings()`, `useCreateListing()`, `useUpdateListing()`, `useDeleteListing()`
    - `src/hooks/useAuth.ts` — `useCurrentUser()`, `useLogin()`, `useSignup()`, `useLogout()`
  - All hooks must use `queryKey` arrays for proper cache invalidation
  - Mutations must invalidate related queries on success
  - All hooks must follow pattern: `staleTime: 5 * 60 * 1000`, `enabled` guards for conditional fetching

  **Must NOT do**:
  - Do NOT remove `ApiClient` class — hooks will call ApiClient methods internally
  - Do NOT change API response shapes — hooks wrap existing ApiClient
  - Do NOT use `suspense: true` in query options (keep loading states in components)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Systematic hook creation following patterns from main app
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0.2 (with Tasks 5, 6)
  - **Blocks**: Tasks 7-12, 14, 15, 17, 19, 22
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - `project/src/routes/_authenticated/(misc)/marketplace.tsx:53-65` — Main app React Query pattern to follow (queryKey, queryFn, enabled, staleTime)
  - `marketplace-frontend/src/lib/api.ts:173-176` — ApiClient.getProducts() to wrap in hook
  - `marketplace-frontend/src/contexts/CartContext.tsx` — Current useEffect+useState to migrate to React Query

  **External References**:
  - Official docs: `https://tanstack.com/query/latest/docs/react/overview` — TanStack Query setup

  **Acceptance Criteria**:

  - [ ] `@tanstack/react-query` installed in marketplace-frontend package.json
  - [ ] QueryProvider wraps app in layout.tsx
  - [ ] Hooks exist: useProducts, useCategories, useSellers, useOrders, useListings
  - [ ] All hooks use `staleTime: 5 * 60 * 1000`
  - [ ] Mutation hooks invalidate related queries
  - [ ] `pnpm --filter marketplace-frontend build` succeeds

  **Commit**: YES
  - Message: `feat(marketplace): add React Query with data fetching hooks`
  - Files: `marketplace-frontend/package.json, marketplace-frontend/src/lib/query-client.ts, marketplace-frontend/src/providers/QueryProvider.tsx, marketplace-frontend/src/hooks/*, marketplace-frontend/src/app/layout.tsx`
  - Pre-commit: `pnpm --filter marketplace-frontend build`

---

- [x] 5. i18n Infrastructure (next-intl)

  **What to do**:
  - Install: `pnpm --filter marketplace-frontend add next-intl`
  - Create `marketplace-frontend/src/i18n/request.ts` — next-intl config
  - Create `marketplace-frontend/src/i18n/messages/fr.json` — French translations extracted from current hardcoded strings
  - Create `marketplace-frontend/src/i18n/messages/en.json` — English translations (can be empty stubs initially)
  - Update `marketplace-frontend/next.config.ts` — add next-intl plugin
  - Create `marketplace-frontend/src/i18n/navigation.ts` — localized navigation helpers
  - DO NOT restructure routes for locale prefix yet — keep single-locale for now
  - Extract strings from Navbar and Footer components (since they're being created in Task 1)
  - Mark remaining pages for incremental extraction (add `// TODO: i18n` comments)

  **Must NOT do**:
  - Do NOT add route-level locale prefixes (`/fr/products`) — keep URLs clean for now
  - Do NOT add Arabic — French only with English stubs
  - Do NOT extract ALL 200+ strings now — extract layout components only, mark rest as TODO

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Infrastructure setup, not full translation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 0.2 (with Tasks 4, 6)
  - **Blocks**: Task 6
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `project/src/locales/fr/` — Main app's i18n structure (for consistency)
  - `marketplace-frontend/src/app/(public)/page.tsx:166-209` — Hardcoded French strings to extract

  **External References**:
  - Official docs: `https://next-intl.dev/docs/getting-started/app-router` — next-intl setup for App Router

  **Acceptance Criteria**:

  - [ ] `next-intl` installed in marketplace-frontend
  - [ ] `src/i18n/messages/fr.json` exists with at least Navbar/Footer translations
  - [ ] Navbar and Footer use `useTranslations()` instead of hardcoded strings
  - [ ] `pnpm --filter marketplace-frontend build` succeeds

  **Commit**: YES
  - Message: `feat(marketplace): add next-intl i18n infrastructure with French translations`
  - Files: `marketplace-frontend/package.json, marketplace-frontend/src/i18n/*, marketplace-frontend/next.config.ts, marketplace-frontend/src/components/layout/Navbar.tsx, marketplace-frontend/src/components/layout/Footer.tsx`
  - Pre-commit: `pnpm --filter marketplace-frontend build`

---

- [x] 6. Refactor Existing Pages to Use Layouts + Auth + Hooks

  **What to do**:
  - Refactor ALL page files to remove inline nav/footer (should use layout.tsx now)
  - Refactor all pages to use `useAuth()` instead of `localStorage` checks
  - Refactor data fetching in existing pages to use React Query hooks from Task 4
  - Pages to refactor:
    - `src/app/(public)/page.tsx` — use `useProducts()`, `useCategories()`, remove nav/footer
    - `src/app/(public)/products/page.tsx` — use `useProducts(category)`, remove nav/footer
    - `src/app/(public)/products/[id]/page.tsx` — use `useProduct(id)`, remove nav/footer
    - `src/app/(public)/categories/page.tsx` — use `useCategories()`, remove nav/footer
    - `src/app/(public)/categories/[slug]/page.tsx` — use hooks
    - `src/app/(public)/sellers/page.tsx` — use `useSellers()`, remove nav/footer
    - `src/app/(public)/sellers/[slug]/page.tsx` — use `useSeller(slug)`
    - `src/app/(public)/cart/page.tsx` — already uses CartContext, remove nav if present
    - `src/app/(public)/checkout/page.tsx` — use `useAuth()` for auth check
    - `src/app/(auth)/dashboard/page.tsx` — use `useAuth()`, hooks
    - `src/app/(auth)/dashboard/listings/page.tsx` — use `useMyListings()`
    - `src/app/(auth)/orders/page.tsx` — use `useOrders()`

  **Must NOT do**:
  - Do NOT change visual design or add new features
  - Do NOT convert to SSR yet — keep `'use client'` for now (SSR is Phase 1)
  - Do NOT fix bugs — only refactor to use new infrastructure

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Touching 12+ files, mechanical but large refactor
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Understanding component architecture

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after Wave 0.1 + Tasks 4, 5)
  - **Blocks**: Tasks 7-12
  - **Blocked By**: Tasks 1, 2, 4, 5

  **References**:

  **Pattern References**:
  - `marketplace-frontend/src/app/(public)/page.tsx` — Current page to refactor (largest)
  - `marketplace-frontend/src/app/(public)/products/page.tsx` — Products page with filter state
  - `marketplace-frontend/src/app/(auth)/orders/page.tsx` — Orders with auth check pattern

  **Acceptance Criteria**:

  - [ ] Zero `useEffect(() => { fetch... })` patterns in any page — all use React Query hooks
  - [ ] Zero `localStorage.getItem('auth_token')` in any page
  - [ ] Zero inline nav/footer in any page.tsx (only in layout.tsx)
  - [ ] `pnpm --filter marketplace-frontend build` succeeds
  - [ ] All existing pages render correctly (visual regression check)

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: All public pages render without errors
    Tool: Playwright (playwright skill)
    Preconditions: Marketplace dev server on localhost:3001, API on localhost:3000
    Steps:
      1. Navigate to: http://localhost:3001/ → Assert no error overlay
      2. Navigate to: http://localhost:3001/products → Assert no error overlay
      3. Navigate to: http://localhost:3001/categories → Assert no error overlay
      4. Navigate to: http://localhost:3001/sellers → Assert no error overlay
      5. Screenshot each page for visual regression
    Expected Result: All pages render without React errors
    Evidence: .sisyphus/evidence/task-6-pages-*.png
  ```

  **Commit**: YES
  - Message: `refactor(marketplace): migrate all pages to shared layouts, auth context, and React Query hooks`
  - Files: All page.tsx files in marketplace-frontend/src/app/
  - Pre-commit: `pnpm --filter marketplace-frontend build`

---

### PHASE 1: SSR & SEO

---

- [x] 7. Product Detail Page SSR (/products/[id])

  **What to do**:
  - Convert `marketplace-frontend/src/app/(public)/products/[id]/page.tsx` from `'use client'` to server component
  - Fetch product data on server using `createServerSupabaseClient()` or direct API call via `fetch()` to NestJS
  - Add `generateMetadata()` function for dynamic title, description, og:image from product data
  - Add JSON-LD structured data (Product schema: name, description, price, currency, availability, seller)
  - Create client island component for interactive parts: "Add to Cart" button, quantity selector
  - Add proper OpenGraph tags: `og:title`, `og:description`, `og:image`, `og:type=product`
  - Add `twitter:card=summary_large_image` meta tags

  **Must NOT do**:
  - Do NOT SSR the cart/add-to-cart interactions — those stay client-side
  - Do NOT add structured data for reviews yet (Phase 4)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: SSR conversion with SEO metadata requires understanding of Next.js server/client boundary
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.1 (with Tasks 8, 9)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 4, 6

  **References**:

  **Pattern References**:
  - `marketplace-frontend/src/app/(public)/products/[id]/page.tsx` — Current client-side implementation
  - `marketplace-frontend/src/lib/api.ts:178-180` — `getProduct(id)` API call

  **API/Type References**:
  - `agritech-api/src/modules/marketplace/marketplace.service.ts:138-239` — Product data shape returned by API

  **External References**:
  - `https://nextjs.org/docs/app/building-your-application/optimizing/metadata` — Next.js metadata API
  - `https://schema.org/Product` — JSON-LD Product schema

  **Acceptance Criteria**:

  - [ ] Product page renders on server (no `'use client'` at top of page.tsx)
  - [ ] `generateMetadata()` returns product-specific title, description, og:image
  - [ ] JSON-LD script tag present in page HTML with Product schema
  - [ ] `pnpm --filter marketplace-frontend build` succeeds

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Product page HTML contains server-rendered content
    Tool: Bash (curl)
    Preconditions: Marketplace on localhost:3001, API on localhost:3000, at least one product exists (see Test Data Setup)
    Steps:
      1. Get product ID from: curl -s http://localhost:3000/api/v1/marketplace/products | jq '.[0].id'
      2. curl -s http://localhost:3001/products/{id} | grep -c 'product-title'
      3. Assert: count > 0 (content is in initial HTML)
      4. curl -s http://localhost:3001/products/{id} | grep -c 'application/ld+json'
      5. Assert: count > 0 (JSON-LD present)
    Expected Result: Server-rendered HTML with SEO content
    Evidence: Raw HTML output captured
  ```

  **Commit**: YES
  - Message: `feat(marketplace): SSR product detail page with metadata and JSON-LD`
  - Files: `marketplace-frontend/src/app/(public)/products/[id]/page.tsx, marketplace-frontend/src/app/(public)/products/[id]/ProductActions.tsx`
  - Pre-commit: `pnpm --filter marketplace-frontend build`

---

- [x] 8. Products Listing Page SSR (/products)

  **What to do**:
  - Convert `marketplace-frontend/src/app/(public)/products/page.tsx` — server component with client filter island
  - Server: fetch initial products and categories via `fetch()` to NestJS API
  - Client island: `ProductsGrid.tsx` — handles search input, category filter, sort (receives initial data as props)
  - Add `generateMetadata()` for products listing page
  - Pass `searchParams` from page to server fetch for category pre-filtering

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.1 (with Tasks 7, 9)
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 4, 6

  **References**:

  - `marketplace-frontend/src/app/(public)/products/page.tsx` — Current 464-line client component to split

  **Acceptance Criteria**:

  - [ ] Products page server-renders initial product list
  - [ ] Category filter still works (client-side interaction)
  - [ ] `curl -s http://localhost:3001/products | grep -c 'product-card'` returns > 0
  - [ ] `pnpm --filter marketplace-frontend build` succeeds

  **Commit**: YES
  - Message: `feat(marketplace): SSR products listing with client-side filter island`
  - Files: `marketplace-frontend/src/app/(public)/products/page.tsx, marketplace-frontend/src/app/(public)/products/ProductsGrid.tsx`
  - Pre-commit: `pnpm --filter marketplace-frontend build`

---

- [x] 9. Categories Pages SSR

  **What to do**:
  - Convert `/categories` and `/categories/[slug]` to server components
  - Fetch categories from API on server
  - Add `generateMetadata()` for each

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.1 (with Tasks 7, 8)
  - **Blocked By**: Tasks 4, 6

  **References**:
  - `marketplace-frontend/src/app/(public)/categories/page.tsx`
  - `marketplace-frontend/src/app/(public)/categories/[slug]/page.tsx`

  **Acceptance Criteria**:
  - [ ] Categories pages server-render content
  - [ ] `pnpm --filter marketplace-frontend build` succeeds

  **Commit**: YES (groups with Task 10)
  - Message: `feat(marketplace): SSR categories and sellers pages`

---

- [x] 10. Sellers Pages SSR

  **What to do**:
  - Convert `/sellers` and `/sellers/[slug]` to server components
  - Server-render seller profiles with their products
  - Add `generateMetadata()` with seller name, description

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.2 (with Tasks 11, 12)
  - **Blocked By**: Tasks 4, 6

  **References**:
  - `marketplace-frontend/src/app/(public)/sellers/page.tsx`
  - `marketplace-frontend/src/app/(public)/sellers/[slug]/page.tsx`
  - `agritech-api/src/modules/marketplace/sellers.controller.ts` — Sellers API

  **Acceptance Criteria**:
  - [ ] Seller profile contains server-rendered content
  - [ ] `pnpm --filter marketplace-frontend build` succeeds

  **Commit**: YES (groups with Task 9)

---

- [x] 11. Homepage SSR

  **What to do**:
  - Convert homepage to server component with featured products/categories fetched on server
  - Keep search bar and mobile menu as client islands
  - Add homepage metadata + JSON-LD Organization schema

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.2 (with Tasks 10, 12)
  - **Blocked By**: Tasks 4, 6

  **References**:
  - `marketplace-frontend/src/app/(public)/page.tsx` — 401-line homepage

  **Acceptance Criteria**:
  - [ ] Homepage renders featured products in initial HTML
  - [ ] `pnpm --filter marketplace-frontend build` succeeds

  **Commit**: YES
  - Message: `feat(marketplace): SSR homepage with featured products and categories`

---

- [x] 12. SEO Meta + JSON-LD + Sitemap

  **What to do**:
  - Create `marketplace-frontend/src/app/sitemap.ts` — dynamic sitemap fetching all products, categories, sellers
  - Create `marketplace-frontend/src/app/robots.ts` — robots.txt configuration
  - Add canonical URLs to all pages
  - Verify all SSR pages have proper OG tags
  - Add `hreflang` tags (fr only for now, infrastructure for future)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1.2 (with Tasks 10, 11)
  - **Blocked By**: Task 7

  **References**:
  - `https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap`

  **Acceptance Criteria**:
  - [ ] `curl http://localhost:3001/sitemap.xml` returns valid XML with product URLs
  - [ ] `curl http://localhost:3001/robots.txt` returns valid robots.txt

  **Commit**: YES
  - Message: `feat(marketplace): add dynamic sitemap, robots.txt, and canonical URLs`

---

### PHASE 2: SEARCH & FILTERING

---

- [x] 13. Paginated Search API (NestJS Backend)

  **What to do**:
  - Refactor `agritech-api/src/modules/marketplace/marketplace.service.ts` → `getPublicProducts()` method:
    - Add parameters: `page` (default 1), `limit` (default 20), `search` (string), `sort` (newest/price_asc/price_desc/popular), `min_price`, `max_price`, `category` (by slug, not just ID)
    - **Paginated response shape** (when `page` or `limit` params present): `{ data: Product[], total: number, page: number, limit: number, totalPages: number }`
    - **Backwards-compatible response** (when NO pagination params): return raw `Product[]` array — identical to current behavior. This prevents breaking existing frontend `getProducts()` which expects `any[]` (see `api.ts:173-175`).
    - Search: ilike on title + description for both marketplace_listings and items
    - Sort: created_at desc (default), price asc/desc
    - **Pagination algorithm** (CRITICAL — dual-source correctness): Do NOT use per-source `.range()` then combine — this produces incorrect results across two sources. Instead:
      1. Fetch ALL matching records from both `marketplace_listings` and `items` (with search/category/price filters applied at DB level)
      2. Combine and sort in memory (current approach, already works at `marketplace.service.ts:120-128`)
      3. Apply pagination in memory: `combinedProducts.slice((page-1)*limit, page*limit)`
      4. Return total from `combinedProducts.length`
      5. **Scaling note**: This approach works well for <5K total products. If scale exceeds this, migrate to a Supabase database view that unions both sources for server-side pagination.
    - Category filtering: support both category ID and Strapi slug
  - Update `marketplace.controller.ts` → `getProducts()` to accept new query params
  - Create DTO: `GetProductsQueryDto` with validation
  - **Update `marketplace-frontend/src/lib/api.ts:173-175`**: Update `getProducts()` to handle both array (no params) and paginated object (with params) responses. Add `getProductsPaginated()` method that always returns paginated shape.

  **Must NOT do**:
  - Do NOT use per-source `.range(from, to)` then combine — algorithmically incorrect for global ordering
  - Do NOT add full-text search (Supabase FTS) — simple ilike is sufficient for now
  - Do NOT add Elasticsearch or external search — keep it in Supabase

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Core API change affecting data contract
  - **Skills**: [`supabase-skill`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (Wave 2.1 — backend must complete before frontend)
  - **Blocks**: Tasks 14, 15
  - **Blocked By**: Task 3

  **References**:

  - `agritech-api/src/modules/marketplace/marketplace.service.ts:17-131` — Current `getPublicProducts()` to refactor
  - `agritech-api/src/modules/marketplace/sellers.service.ts` — Sellers service already has pagination pattern to follow

  **Acceptance Criteria**:

  - [ ] `GET /marketplace/products?page=1&limit=5` returns `{ data: [...], total: N, page: 1, limit: 5, totalPages: M }`
  - [ ] `GET /marketplace/products?search=tomate` returns filtered results (paginated shape)
  - [ ] `GET /marketplace/products?sort=price_asc` returns price-sorted results
  - [ ] `GET /marketplace/products?min_price=10&max_price=100` returns price-range filtered results
  - [ ] `GET /marketplace/products` (no params) returns raw `Product[]` array — **backwards compatible** with existing frontend `ApiClient.getProducts()`
  - [ ] `marketplace-frontend/src/lib/api.ts` has updated `getProductsPaginated()` method for new shape
  - [ ] `pnpm --filter agritech-api build` succeeds

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Paginated products API returns correct shape
    Tool: Bash (curl)
    Steps:
      1. curl -s http://localhost:3000/api/v1/marketplace/products?page=1&limit=2 | jq '.data | length'
      2. Assert: returns 2 or less
      3. curl -s http://localhost:3000/api/v1/marketplace/products?page=1&limit=2 | jq '.total'
      4. Assert: returns a number
      5. curl -s http://localhost:3000/api/v1/marketplace/products?page=1&limit=2 | jq '.totalPages'
      6. Assert: returns a number > 0
    Expected Result: Paginated response with correct structure

  Scenario: Search filters results
    Tool: Bash (curl)
    Steps:
      1. curl -s "http://localhost:3000/api/v1/marketplace/products?search=nonexistent_xyz" | jq '.total'
      2. Assert: returns 0
    Expected Result: Search returns 0 for non-matching query
  ```

  **Commit**: YES
  - Message: `feat(api): add pagination, search, sort, and price filtering to marketplace products API`
  - Files: `agritech-api/src/modules/marketplace/marketplace.service.ts, agritech-api/src/modules/marketplace/marketplace.controller.ts, agritech-api/src/modules/marketplace/dto/get-products-query.dto.ts`
  - Pre-commit: `pnpm --filter agritech-api build`

---

- [x] 14. Frontend Search UI + Filters

  **What to do**:
  - Update `useProducts` hook to accept pagination/search/sort/filter params
  - Update products page client island (`ProductsGrid.tsx`) to use URL search params for all filters
  - Implement working sort dropdown (newest, price_asc, price_desc)
  - Add price range filter (min/max inputs)
  - Server-side search via API (replace client-side `products.filter()`)
  - Debounced search input (300ms)
  - URL-based state: `?search=tomate&sort=price_asc&min_price=10&page=2` — shareable, bookmarkable

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2.2 (with Task 15)
  - **Blocked By**: Tasks 8, 13

  **References**:
  - `marketplace-frontend/src/app/(public)/products/page.tsx:320-326` — Current non-functional sort dropdown
  - `marketplace-frontend/src/app/(public)/products/page.tsx:87-92` — Current client-side filter to replace

  **Acceptance Criteria**:
  - [ ] Sort dropdown changes API call and re-fetches products
  - [ ] Search input debounces and triggers API search
  - [ ] URL params update with filter state — shareable links work
  - [ ] `pnpm --filter marketplace-frontend build` succeeds

  **Commit**: YES
  - Message: `feat(marketplace): implement server-side search, sort, and price filtering`

---

- [x] 15. Pagination Component

  **What to do**:
  - Create `marketplace-frontend/src/components/Pagination.tsx` — reusable pagination with page numbers, prev/next
  - Integrate with products page — changes URL `?page=N` param
  - Show "Showing X-Y of Z products"
  - Handle edge cases: single page, last page, first page

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2.2 (with Task 14)
  - **Blocked By**: Task 13

  **Acceptance Criteria**:
  - [ ] Pagination shows correct page numbers
  - [ ] Clicking page 2 updates URL to `?page=2` and fetches new data
  - [ ] "Showing 1-20 of 45 products" text updates correctly

  **Commit**: YES (groups with Task 14)

---

### PHASE 3: FEATURES

---

- [x] 16. Seller Order Management (Main App)

  **What to do**:
  - Create `project/src/routes/_authenticated/(misc)/marketplace/orders.tsx` — seller order management page
  - Show orders received by seller's organization with status filters (pending, confirmed, shipped, delivered)
  - Add action buttons: Confirm Order, Mark as Shipped, Mark as Delivered
  - Actions call `PATCH /marketplace/orders/:id/status` via NestJS API
  - Show order details: buyer info, items, shipping address, total, payment method
  - Add real-time count badge on marketplace nav for pending orders
  - Follow main app patterns: TanStack Router, React Query, i18n, CASL permissions, shadcn UI components

  **Must NOT do**:
  - Do NOT build this in marketplace-frontend — it goes in the main app
  - Do NOT create new API endpoints — `orders.controller.ts` already has `updateOrderStatus`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Full page in main app following existing patterns
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.1 (with Tasks 17, 18)
  - **Blocks**: Task 21
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `project/src/routes/_authenticated/(misc)/marketplace.tsx` — Existing marketplace page to extend
  - `agritech-api/src/modules/marketplace/orders.controller.ts:62-70` — `updateOrderStatus` endpoint
  - `agritech-api/src/modules/marketplace/dto/create-order.dto.ts` — `UpdateOrderStatusDto` type

  **API/Type References**:
  - `marketplace-frontend/src/lib/api.ts:410-431` — Order interface shape
  - `marketplace-frontend/src/app/(auth)/orders/page.tsx:21-28` — Status config to reuse

  **Acceptance Criteria**:

  - [ ] `/marketplace/orders` route exists in main app
  - [ ] Seller sees orders with their organization as `seller_organization_id`
  - [ ] "Confirm" button changes order status from pending → confirmed
  - [ ] "Ship" button changes status from confirmed → shipped
  - [ ] `pnpm --filter agriprofy build` succeeds

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Seller can view and confirm orders
    Tool: Playwright (playwright skill)
    Preconditions: Main app running on localhost:5173, API on localhost:3000, seller logged in, pending order exists (create via marketplace checkout flow first)
    Steps:
      1. Navigate to: http://localhost:5173/marketplace/orders
      2. Assert: order card visible with "En attente" badge
      3. Click: "Confirmer" button on first order
      4. Wait for: badge changes to "Confirmée" (timeout: 5s)
      5. Screenshot: .sisyphus/evidence/task-16-order-confirm.png
    Expected Result: Order status updated to confirmed
    Evidence: .sisyphus/evidence/task-16-order-confirm.png
  ```

  **Commit**: YES
  - Message: `feat(app): add seller order management page to marketplace section`
  - Files: `project/src/routes/_authenticated/(misc)/marketplace/orders.tsx`
  - Pre-commit: `pnpm --filter agriprofy build`

---

- [x] 17. Quote Requests Buyer UI (Marketplace)

  **What to do**:
  - Create `marketplace-frontend/src/app/(public)/products/[id]/QuoteRequestButton.tsx` — "Demander un devis" button on product detail pages
  - Create `marketplace-frontend/src/app/(auth)/quote-requests/page.tsx` — "My Quote Requests" page showing sent requests with statuses
  - Create quote request form modal: product info (pre-filled), quantity, message, contact details
  - Integrate with existing `QuoteRequestsApi` client (`marketplace-frontend/src/lib/quote-requests-api.ts`)
  - Show quote request statuses: pending → viewed → quoted → accepted/cancelled
  - Add link in Navbar: "Mes devis" (visible when logged in)
  - Add hooks: `useQuoteRequests()`, `useCreateQuoteRequest()`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.1 (with Tasks 16, 18)
  - **Blocks**: Task 20
  - **Blocked By**: Tasks 2, 4

  **References**:
  - `marketplace-frontend/src/lib/quote-requests-api.ts` — Full API client already built
  - `agritech-api/src/modules/marketplace/quote-requests.controller.ts` — Backend fully implemented

  **Acceptance Criteria**:
  - [ ] "Demander un devis" button visible on product detail page
  - [ ] Quote request form submits successfully
  - [ ] "Mes devis" page shows sent quote requests with statuses
  - [ ] `pnpm --filter marketplace-frontend build` succeeds

  **Commit**: YES
  - Message: `feat(marketplace): add quote request UI for buyers`

---

- [x] 18. Reviews Backend API

  **What to do**:
  - Create `agritech-api/src/modules/marketplace/reviews.service.ts`
  - Create `agritech-api/src/modules/marketplace/reviews.controller.ts`
  - Create `agritech-api/src/modules/marketplace/dto/create-review.dto.ts`
  - Endpoints:
    - `POST /marketplace/reviews` — create review (validate: buyer has a delivered order from this seller)
    - `GET /marketplace/sellers/:slug/reviews` — already exists in SellersController, verify it works
    - `GET /marketplace/reviews/can-review/:sellerId` — check if current user can review this seller
  - Register in `marketplace.module.ts`
  - Review schema: rating (1-5), comment (optional), reviewer_organization_id, seller_organization_id, order_id
  - Ensure table `marketplace_reviews` exists or create migration

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [`supabase-skill`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.1 (with Tasks 16, 17)
  - **Blocks**: Task 19
  - **Blocked By**: Task 3

  **References**:
  - `agritech-api/src/modules/marketplace/sellers.service.ts` — Already has `getSellerReviews()` method
  - `agritech-api/src/modules/marketplace/quote-requests.controller.ts` — Auth guard pattern to follow

  **Acceptance Criteria**:
  - [ ] `POST /marketplace/reviews` with valid order + rating creates review
  - [ ] `POST /marketplace/reviews` without delivered order returns 403
  - [ ] `GET /marketplace/reviews/can-review/{sellerId}` returns `{ canReview: true/false }`
  - [ ] `pnpm --filter agritech-api build` succeeds

  **Commit**: YES
  - Message: `feat(api): add marketplace reviews API with order verification`

---

- [x] 19. Reviews Frontend UI

  **What to do**:
  - Create `marketplace-frontend/src/components/ReviewForm.tsx` — star rating + comment form
  - Create `marketplace-frontend/src/components/ReviewsList.tsx` — display reviews with stars, avatar, date
  - Add review form to order detail page (`/orders/[id]`) — show after order is delivered
  - Display reviews on seller profile page (`/sellers/[slug]`) — already has data from `getSellerReviews()`
  - Show average rating on ProductCard and seller cards
  - Create hooks: `useCreateReview()`, `useCanReview(sellerId)`

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.2 (with Tasks 20, 21)
  - **Blocked By**: Tasks 18, 4

  **Acceptance Criteria**:
  - [ ] Star rating component renders 1-5 clickable stars
  - [ ] Review form submits successfully on delivered order
  - [ ] Seller profile shows reviews list
  - [ ] ProductCard shows average rating stars

  **Commit**: YES
  - Message: `feat(marketplace): add reviews and ratings UI`

---

- [x] 20. Quote Requests Polish

  **What to do**:
  - Add real-time status updates for quote requests
  - Add quote price display when seller responds
  - Add "Accept Quote" and "Decline Quote" actions for buyer
  - Ensure quote request notifications work (if seller quotes, buyer gets notified)
  - Polish the form UX: loading states, success toast, validation

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.2
  - **Blocked By**: Task 17

  **Acceptance Criteria**:
  - [ ] Buyer can accept/decline a quoted request
  - [ ] Quote price displays correctly in MAD format

  **Commit**: YES
  - Message: `feat(marketplace): polish quote requests with accept/decline and price display`

---

- [x] 21. Seller Dashboard Enhancement

  **What to do**:
  - Add link from marketplace-frontend seller dashboard to main app orders page
  - Update marketplace dashboard stats to show real data (pending orders count, revenue)
  - Add "View on Marketplace" link for each product (links to marketplace-frontend product page)
  - Improve the listing management page with better status indicators and bulk actions

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3.2
  - **Blocked By**: Tasks 16, 4

  **Acceptance Criteria**:
  - [ ] Dashboard shows accurate pending orders count
  - [ ] "Gérer les commandes" links to main app `/marketplace/orders`
  - [ ] `pnpm --filter marketplace-frontend build` succeeds

  **Commit**: YES
  - Message: `feat(marketplace): enhance seller dashboard with real stats and order management link`

---

### PHASE 4: NOTIFICATIONS

---

- [x] 22. Notification Bell Component

  **What to do**:
  - Create `marketplace-frontend/src/components/NotificationBell.tsx` — bell icon with unread count badge
  - Create `marketplace-frontend/src/hooks/useNotifications.ts` — connects to WebSocket `NotificationsGateway`
  - Show notifications dropdown: order placed, order status changed, quote received, new review
  - Mark notifications as read on click
  - Add NotificationBell to Navbar (visible when logged in)
  - Use existing NestJS `NotificationsGateway` WebSocket connection
  - **IMPORTANT — Token verification mismatch risk**: The `NotificationsGateway` (`notifications.gateway.ts:224-234`) verifies tokens using `jwtService.verify()` with `SUPABASE_JWT_SECRET` (local HS256 verification), while the HTTP auth path uses `authService.validateToken()` (Supabase API call). These are different verification paths. **Before building the UI, first verify WebSocket auth works**:
    1. Check that `SUPABASE_JWT_SECRET` env var is set and matches the Supabase project's JWT secret
    2. Test WebSocket connection with a real Supabase session token using a simple script
    3. If verification fails, update `NotificationsGateway.verifyToken()` to use `authService.validateToken()` instead of local JWT verification

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4.1 (with Task 23)
  - **Blocked By**: Tasks 2, 4

  **References**:
  - `agritech-api/src/modules/notifications/notifications.gateway.ts` — Existing gateway, see `verifyToken()` at line 224 and `extractToken()` at line 208
  - `agritech-api/src/modules/notifications/notifications.gateway.ts:23-38` — WebSocket CORS config and namespace `/notifications`
  - `agritech-api/src/modules/auth/auth.service.ts:85-135` — `validateToken()` as alternative verification path

  **Acceptance Criteria**:
  - [ ] WebSocket connection to `/notifications` namespace succeeds with Supabase session token
  - [ ] Bell icon visible in navbar when logged in
  - [ ] Red badge shows unread count
  - [ ] Clicking opens dropdown with notification list
  - [ ] `pnpm --filter marketplace-frontend build` succeeds

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: WebSocket auth works with Supabase session token
    Tool: Bash (node script)
    Preconditions: API on localhost:3000, valid Supabase token available
    Steps:
      1. Create temp script that connects to ws://localhost:3000/notifications with token as query param
      2. Assert: receives 'connected' event with userId
      3. Assert: no disconnect within 5 seconds
    Expected Result: WebSocket connection established and maintained
    Evidence: Connection event logged

  Scenario: Notification bell shows real-time updates
    Tool: Playwright (playwright skill)
    Preconditions: Marketplace on localhost:3001, user logged in
    Steps:
      1. Navigate to http://localhost:3001/dashboard
      2. Assert: notification bell icon visible in navbar
      3. Assert: bell renders without errors
      4. Screenshot: .sisyphus/evidence/task-22-notification-bell.png
    Expected Result: Bell component renders and connects to WebSocket
    Evidence: .sisyphus/evidence/task-22-notification-bell.png
  ```

  **Commit**: YES
  - Message: `feat(marketplace): add real-time notification bell with WebSocket`

---

- [x] 23. Email Notification Templates

  **What to do**:
  - Verify/enhance email templates for marketplace events:
    - Order placed (to seller): "Nouvelle commande de {buyer}"
    - Order confirmed (to buyer): "Votre commande #{id} a été confirmée"
    - Order shipped (to buyer): "Votre commande est en route"
    - Quote request received (to seller): "Nouvelle demande de devis"
    - Quote responded (to buyer): "Le vendeur a répondu à votre demande"
    - New review (to seller): "Nouvel avis sur votre profil"
  - Use existing `NotificationsService.sendEmail()` — just verify templates exist and add missing ones
  - Ensure emails are in French

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4.1 (with Task 22)
  - **Blocked By**: None

  **Acceptance Criteria**:
  - [ ] Email templates exist for all 6 marketplace events
  - [ ] `pnpm --filter agritech-api build` succeeds

  **Commit**: YES
  - Message: `feat(api): add email notification templates for marketplace events`

---

- [x] 24. Final Integration Testing & Polish

  **What to do**:
  - Full end-to-end flow test: browse → add to cart → checkout → order → seller confirms → buyer reviews
  - Cross-app flow: buyer places order in marketplace → seller manages in main app → buyer gets notification
  - Fix any remaining visual inconsistencies
  - Ensure all builds pass: marketplace-frontend, agritech-api, agriprofy
  - Verify SSR works for all public pages via curl
  - Performance check: ensure no N+1 queries in paginated API

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration testing requires understanding full system flow
  - **Skills**: [`playwright`, `frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Final (Wave 4.2)
  - **Blocks**: None
  - **Blocked By**: All previous tasks

  **Acceptance Criteria**:

  - [ ] `pnpm --filter marketplace-frontend build` succeeds
  - [ ] `pnpm --filter agritech-api build` succeeds
  - [ ] `pnpm --filter agriprofy build` succeeds
  - [ ] Full buyer flow works end-to-end
  - [ ] All SSR pages return rendered HTML

  **Agent-Executed QA Scenarios**:

  ```
  Scenario: Full buyer journey end-to-end
    Tool: Playwright (playwright skill)
    Preconditions: Marketplace on localhost:3001, API on localhost:3000, Main app on localhost:5173, test user + products created via fixture setup
    Steps:
      1. Navigate to http://localhost:3001/ → search for a product
      2. Click product → verify SSR content
      3. Add to cart → verify cart count updates
      4. Go to cart → proceed to checkout
      5. Fill shipping details → confirm order (COD)
      6. Verify order confirmation page
      7. Navigate to /orders → verify order appears with "pending" status
      8. Screenshot each step
    Expected Result: Complete buyer flow works without errors
    Evidence: .sisyphus/evidence/task-24-e2e-*.png
  ```

  **Commit**: YES
  - Message: `chore(marketplace): final integration testing and polish`

---

## Commit Strategy

| After Task(s) | Message | Verification |
|------------|---------|--------------|
| 1 | `refactor(marketplace): extract shared layout components` | `pnpm --filter marketplace-frontend build` |
| 2 | `feat(marketplace): replace localStorage auth with @supabase/ssr` | `pnpm --filter marketplace-frontend build` |
| 3 | `fix(api): standardize auth guards across marketplace controllers` | `pnpm --filter agritech-api build` |
| 4 | `feat(marketplace): add React Query with data fetching hooks` | `pnpm --filter marketplace-frontend build` |
| 5 | `feat(marketplace): add next-intl i18n infrastructure` | `pnpm --filter marketplace-frontend build` |
| 6 | `refactor(marketplace): migrate pages to layouts, auth, hooks` | `pnpm --filter marketplace-frontend build` |
| 7 | `feat(marketplace): SSR product detail with metadata and JSON-LD` | `pnpm --filter marketplace-frontend build` |
| 8 | `feat(marketplace): SSR products listing with filter island` | `pnpm --filter marketplace-frontend build` |
| 9, 10 | `feat(marketplace): SSR categories and sellers pages` | `pnpm --filter marketplace-frontend build` |
| 11 | `feat(marketplace): SSR homepage` | `pnpm --filter marketplace-frontend build` |
| 12 | `feat(marketplace): add sitemap, robots.txt, canonical URLs` | `pnpm --filter marketplace-frontend build` |
| 13 | `feat(api): add pagination, search, sort to products API` | `pnpm --filter agritech-api build` |
| 14, 15 | `feat(marketplace): server-side search, filters, pagination` | `pnpm --filter marketplace-frontend build` |
| 16 | `feat(app): add seller order management` | `pnpm --filter agriprofy build` |
| 17 | `feat(marketplace): add quote request UI for buyers` | `pnpm --filter marketplace-frontend build` |
| 18 | `feat(api): add reviews API with order verification` | `pnpm --filter agritech-api build` |
| 19 | `feat(marketplace): add reviews and ratings UI` | `pnpm --filter marketplace-frontend build` |
| 20, 21 | `feat(marketplace): polish quote requests and seller dashboard` | `pnpm --filter marketplace-frontend build` |
| 22, 23 | `feat(marketplace): add notifications (bell + email templates)` | Both builds pass |
| 24 | `chore(marketplace): final integration testing` | All 3 builds pass |

---

## Success Criteria

### Verification Commands
```bash
pnpm --filter marketplace-frontend build  # Expected: Build succeeds
pnpm --filter agritech-api build          # Expected: Build succeeds
pnpm --filter agriprofy build             # Expected: Build succeeds

# SSR verification (marketplace frontend on port 3001)
curl -s http://localhost:3001/products | grep -c 'product-card'  # Expected: > 0
curl -s http://localhost:3001/sitemap.xml | head -5              # Expected: XML header

# API pagination (NestJS API on port 3000)
curl -s "http://localhost:3000/api/v1/marketplace/products?page=1&limit=5" | jq '.totalPages'  # Expected: number > 0

# Auth guard (NestJS API on port 3000)
curl -s -w "%{http_code}" http://localhost:3000/api/v1/marketplace/my-listings  # Expected: 401
```

### Final Checklist
- [x] All "Must Have" present (auth, layouts, SSR, search, orders, quotes)
- [x] All "Must NOT Have" absent (no `as any`, no iframe, no Stripe, no Arabic)
- [x] All 3 packages build successfully
- [x] SSR pages return server-rendered HTML
- [x] Auth uses cookies, not localStorage
- [x] Products API is paginated
- [x] Seller manages orders from main app
- [x] Buyer can request quotes and leave reviews
