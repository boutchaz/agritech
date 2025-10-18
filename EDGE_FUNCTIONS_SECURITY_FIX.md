# Edge Functions Security Audit & Fixes

## Critical Security Vulnerabilities Fixed

### 1. **Service Role Key Exposure Without Authentication**

**Vulnerability**: All Edge Functions were creating Supabase clients with the service role key without verifying caller identity or checking authorization.

**Impact**: Anyone on the internet could hit these endpoints with Access-Control-Allow-Origin: * and read or mutate tenant data using the service key.

**Affected Functions**:
- `irrigation-scheduling`
- `crop-planning`
- `yield-prediction`
- `farm-analytics`
- `task-assignment`
- `recommendations`
- `sensor-data`
- `generate-parcel-report`
- `generate-index-image`

### 2. **Insecure Fallback to Anon Key**

**Vulnerability**: `edge-functions-api.ts` silently fell back to the anon key when no session existed.

**Impact**: Made it trivial to exploit functions anonymously since functions ran with service role.

**Location**: `project/src/lib/edge-functions-api.ts:18-33`

### 3. **Missing User Context in Satellite API**

**Vulnerability**: `satellite-api.ts` called `generate-index-image` with anon key even when session was available.

**Impact**: Callers never carried user context, making it impossible to differentiate tenants once the function enforces auth.

**Location**: `project/src/lib/satellite-api.ts:488-509`

## Fixes Implemented

### 1. Created Authentication Middleware (`_shared/auth.ts`)

```typescript
export async function authenticateRequest(req: Request): Promise<AuthContext>
```

**Features**:
- Verifies JWT token from Authorization header
- Returns authenticated user context
- Throws error if authentication fails
- Creates Supabase client with user's token (not service role)

**Access Validation Functions**:
- `validateParcelAccess(supabase, userId, parcelId)` - Validates user access to parcel
- `validateFarmAccess(supabase, userId, farmId)` - Validates user access to farm
- `validateOrganizationAccess(supabase, userId, orgId)` - Validates user access to org
- `validateUserRole(supabase, userId, orgId, allowedRoles)` - Validates user role

### 2. Updated `edge-functions-api.ts`

**Changes**:
- Removed fallback to anon key
- Now requires authentication
- Throws error if user is not authenticated: `'Authentication required. Please sign in to use this feature.'`
- Only uses session access token for Edge Function calls

### 3. Updated `satellite-api.ts`

**Changes**:
- Uses `supabase.functions.invoke()` for proper authentication
- Sends user's JWT token in Authorization header
- Checks for active session before making request
- Throws error if not authenticated

### 4. Updated `irrigation-scheduling` Function

**Changes**:
```typescript
// Before
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// After
const { user, supabase } = await authenticateRequest(req);
const parcel = await validateParcelAccess(supabase, user.id, parcel_id);
```

**Security Improvements**:
- Authenticates user via JWT
- Validates user has access to parcel via RLS policies
- Uses user's token for all database queries
- Rejects unauthenticated requests

## Remaining Functions to Fix

The following functions still need to be updated with the same pattern:

1. ✅ `irrigation-scheduling` - FIXED
2. ⚠️ `crop-planning` - NEEDS FIX
3. ⚠️ `yield-prediction` - NEEDS FIX
4. ⚠️ `farm-analytics` - NEEDS FIX
5. ⚠️ `task-assignment` - NEEDS FIX
6. ⚠️ `recommendations` - NEEDS FIX
7. ⚠️ `sensor-data` - NEEDS FIX
8. ⚠️ `generate-parcel-report` - NEEDS FIX
9. ⚠️ `generate-index-image` - NEEDS FIX

## Implementation Pattern for Remaining Functions

### Step 1: Update Imports

```typescript
// Remove
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

// Add
import { authenticateRequest, validateParcelAccess, validateFarmAccess } from "../_shared/auth.ts";
```

### Step 2: Update Request Handler

```typescript
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const { user, supabase } = await authenticateRequest(req);

    // Parse request body
    const { parcel_id, farm_id, ...otherParams } = await req.json();

    // Validate access based on resource type
    if (parcel_id) {
      await validateParcelAccess(supabase, user.id, parcel_id);
    } else if (farm_id) {
      await validateFarmAccess(supabase, user.id, farm_id);
    }

    // Continue with business logic using authenticated supabase client
    // ...
```

### Step 3: Remove Service Role Client

```typescript
// DELETE THIS
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);
```

## Testing Checklist

- [ ] Test authenticated requests work correctly
- [ ] Test unauthenticated requests are rejected
- [ ] Test user can only access their own organization's data
- [ ] Test RLS policies are enforced
- [ ] Test cross-tenant data isolation
- [ ] Test error messages don't leak sensitive information
- [ ] Update CORS policy to restrict origins in production
- [ ] Remove or restrict `Access-Control-Allow-Origin: *` for production

## Production Hardening

### 1. Update CORS Headers

```typescript
// Development
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production'
    ? 'https://yourdomain.com'
    : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### 2. Add Rate Limiting

Consider implementing rate limiting at the Edge Function level or via Cloudflare/CDN.

### 3. Add Request Logging

Log all authenticated requests for security audit trail.

### 4. Implement Monitoring

Set up alerts for:
- Failed authentication attempts
- Unauthorized access attempts
- Unusual request patterns

## References

- [Supabase Edge Functions Auth](https://supabase.com/docs/guides/functions/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
