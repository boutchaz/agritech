## Exchange Code Endpoints Implementation (2026-02-15)

Successfully implemented NestJS API exchange code endpoints for secure cross-app authentication:

### Implementation Details
- **Service Methods** (`auth.service.ts`):
  - `generateExchangeCode(userId)`: Creates cryptographically random UUID code, stores in Map with timestamp
  - `redeemExchangeCode(code)`: Validates code, generates Supabase session via admin API
  - In-memory Map storage (no database persistence)
  - Automatic cleanup interval (60s) removes codes older than 30s

- **Controller Endpoints** (`auth.controller.ts`):
  - `POST /auth/exchange-code`: Guarded endpoint (requires JWT), returns code + expiresIn
  - `POST /auth/exchange-code/redeem`: Public endpoint, accepts code, returns session tokens

### Security Features
- **Cryptographic randomness**: Node.js `crypto.randomUUID()` for unpredictable codes
- **30-second expiry**: Codes expire after 30 seconds
- **Single-use**: Codes deleted from Map immediately after redemption
- **Automatic cleanup**: Background interval prevents memory leaks

### Session Creation Flow
1. Admin API `generateLink()` creates magic link for user's email
2. Fresh Supabase client `verifyOtp()` with hashed_token
3. Returns access_token, refresh_token, expires_in

### Build Status
- ✅ Build passes: `pnpm --filter agritech-api build`
- ✅ LSP diagnostics clean on both files
- ✅ No TypeScript errors

### Key Learnings
- Supabase admin API cannot directly create sessions - must use generateLink + verifyOtp pattern
- In-memory Map is appropriate for short-lived, high-security tokens
- setInterval cleanup prevents unbounded memory growth
- `@Public()` decorator bypasses JWT guard for redeem endpoint


## Task: Add VITE_MARKETPLACE_URL and marketplace-link.ts helper
**Status:** ✅ COMPLETED

### Changes Made:
1. **project/.env** - Added `VITE_MARKETPLACE_URL=http://localhost:3002` (line 18-19)
2. **project/src/config/sidebar-nav.ts** - Updated MARKETPLACE_EXTERNAL_URL to use env var with fallback (line 172)
3. **project/src/lib/marketplace-link.ts** - Created new helper with:
   - `getMarketplaceUrl(path)` - Exchanges session token for code via POST /auth/exchange-code, appends code to URL
   - `getMarketplaceBaseUrl()` - Returns marketplace base URL
   - Graceful fallback when not authenticated
   - Uses existing supabase client from ./supabase

### Verification:
- TypeScript compilation: ✅ PASSED (`pnpm --filter agriprofy type-check`)
- No tokens passed in URL - only exchange code
- Proper error handling with console.error fallback
- Uses VITE_API_URL from existing .env for API endpoint

## CodeExchanger Component & Middleware Implementation (COMPLETED)

### What Was Done
1. Created `marketplace-frontend/src/components/CodeExchanger.tsx` with:
   - `'use client'` directive for client-side execution
   - `useRef` guard (`redeemingRef`) to prevent double-redemption
   - Fetches `POST /api/v1/auth/exchange-code/redeem` with opaque code
   - Calls `supabase.auth.setSession()` with returned tokens
   - Strips `?code=` from URL after processing via `router.replace()`
   - Returns `null` (no UI rendering)

2. Updated `marketplace-frontend/src/lib/supabase/middleware.ts` with:
   - Server-side exchange code handling BEFORE `getUser()` call
   - Fetches same endpoint with opaque code
   - Sets session via `supabase.auth.setSession()`
   - Redirects to clean URL with session cookies
   - Preserves all existing cookie handling logic
   - Graceful error handling with console.warn fallback

### Key Design Decisions
- **Single-use code**: Only middleware OR CodeExchanger will succeed (first wins)
- **Middleware first**: Server-side handles initial request, cleaner UX
- **CodeExchanger fallback**: Client-side handles edge cases (SPA navigation)
- **No raw tokens**: Only opaque exchange code sent to API
- **Cookie preservation**: Middleware copies all Supabase cookies to redirect response

### Build Status
✅ `pnpm --filter marketplace-frontend build` - PASSED
✅ No TypeScript diagnostics on both files
✅ All requirements met

### Files Modified
- Created: `marketplace-frontend/src/components/CodeExchanger.tsx`
- Modified: `marketplace-frontend/src/lib/supabase/middleware.ts`

## Task: Replace Hardcoded Marketplace URLs (COMPLETED)

### Changes Made:
1. **Sidebar.tsx** (2 locations):
   - Line ~960: Replaced `<a href="https://marketplace.thebzlab.online">` with `<button onClick={async () => { const url = await getMarketplaceUrl('/'); window.open(url, '_blank', 'noopener,noreferrer'); }}>`
   - Line ~1010: Same replacement for expanded marketplace section
   - Added import: `import { getMarketplaceUrl } from '@/lib/marketplace-link';`

2. **OrganizationSettings.tsx** (1 location):
   - Line ~224: Replaced `<a href={`https://marketplace.thebzlab.online/sellers/${orgData.slug}`}>` with button using `getMarketplaceUrl(`/sellers/${orgData.slug}`)`
   - Added import: `import { getMarketplaceUrl } from '@/lib/marketplace-link';`

3. **LandingPage.tsx**:
   - ✓ UNCHANGED: Line 73 `sameAs: ['https://marketplace.thebzlab.online']` kept as-is (SEO metadata)

4. **marketplace-frontend/src/app/layout.tsx**:
   - Added imports: `import { Suspense } from 'react';` and `import { CodeExchanger } from '@/components/CodeExchanger';`
   - Wrapped CodeExchanger in Suspense inside AuthProvider (before CartProvider)

### Verification:
- ✓ Zero hardcoded marketplace URLs in Sidebar.tsx
- ✓ Zero hardcoded marketplace URLs in OrganizationSettings.tsx
- ✓ Both apps build successfully: `pnpm --filter agriprofy type-check` ✓ and `pnpm --filter marketplace-frontend build` ✓
- ✓ All window.open() calls use '_blank' with 'noopener,noreferrer'
- ✓ getMarketplaceUrl() helper properly integrated for dynamic URL generation
- ✓ CodeExchanger wired into marketplace layout with Suspense fallback

### Pattern Established:
- Use `getMarketplaceUrl()` for all marketplace navigation from main app
- Wrap CodeExchanger in Suspense with null fallback for seamless auth handoff
- Maintain SEO metadata URLs unchanged (LandingPage sameAs)
