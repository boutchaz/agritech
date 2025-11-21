# Multi-Tenant Security & Authentication

## 🔐 Security Architecture

The AgriTech API implements **strict multi-tenant security** with **mandatory authentication** for all endpoints.

---

## ✅ YES - All APIs Require Authentication

**Every endpoint (except health checks) requires:**

1. ✅ **Valid JWT Token** (from Supabase Auth)
2. ✅ **Organization ID** (in header, query, or body)
3. ✅ **Organization Membership** (user must belong to the organization)
4. ✅ **Appropriate Role** (optional, for sensitive operations)

---

## 🛡️ Multi-Layered Security

### Layer 1: JWT Authentication (`JwtAuthGuard`)

All requests must include a valid Supabase JWT token:

```http
Authorization: Bearer <supabase_jwt_token>
```

**What it validates:**
- Token signature (using Supabase JWT secret)
- Token expiration
- User identity

### Layer 2: Organization Validation (`OrganizationGuard`)

All requests must include an organization ID and prove membership:

```http
X-Organization-Id: uuid-of-organization
```

**What it validates:**
- Organization ID is provided
- User is an active member of the organization
- User has required role level (if specified)

### Layer 3: Role-Based Access Control (Optional)

Sensitive endpoints can require minimum role levels:

```typescript
@RequireRole(RoleLevel.ORGANIZATION_ADMIN)
@Post('create-user')
createUser() { ... }
```

**Role Hierarchy** (lower number = more power):
```
1 = system_admin      (Full access)
2 = organization_admin (Manage organization)
3 = farm_manager      (Manage farms)
4 = farm_worker       (Farm operations)
5 = day_laborer       (Limited access)
6 = viewer            (Read-only)
```

---

## 📝 How to Call Protected Endpoints

### Method 1: Using Header (Recommended)

```bash
curl -X POST http://localhost:3001/api/v1/sequences/invoice \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -H "X-Organization-Id: your-org-uuid-here" \
  -H "Content-Type: application/json"
```

### Method 2: Using Query Parameter

```bash
curl -X POST "http://localhost:3001/api/v1/sequences/invoice?organizationId=your-org-uuid" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Method 3: In Request Body

```bash
curl -X POST http://localhost:3001/api/v1/sequences/invoice \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "your-org-uuid"
  }'
```

**Priority Order:**
1. `X-Organization-Id` header (checked first)
2. `?organizationId=` query parameter
3. `organizationId` in request body

---

## 🚫 What Happens Without Proper Auth?

### No JWT Token
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### No Organization ID
```json
{
  "statusCode": 400,
  "message": "Organization ID is required. Provide it via X-Organization-Id header, query param, or request body."
}
```

### Not a Member of Organization
```json
{
  "statusCode": 403,
  "message": "You do not have access to this organization"
}
```

### Insufficient Role/Permissions
```json
{
  "statusCode": 403,
  "message": "You do not have sufficient permissions for this operation"
}
```

---

## 🌐 Public Endpoints (No Auth Required)

Only these endpoints are public:

- `GET /` - Basic health check
- `GET /health` - Detailed health check

**All other endpoints require authentication!**

---

## 🔧 Implementation Details

### Guard Stack

Every protected controller uses:

```typescript
@Controller('endpoint')
@UseGuards(JwtAuthGuard, OrganizationGuard)  // Both guards required
@ApiBearerAuth()                               // Swagger auth button
@ApiHeader({
  name: 'X-Organization-Id',
  description: 'Organization ID',
  required: true,
})
export class MyController {
  // Protected endpoints
}
```

### Extracting Organization ID in Controllers

Use the `@OrganizationId()` decorator:

```typescript
@Post('create')
async create(@OrganizationId() organizationId: string) {
  // organizationId is automatically extracted and validated
  // User membership is already verified by OrganizationGuard
}
```

### Requiring Specific Roles

```typescript
import { RequireRole, RoleLevel } from '@/common/decorators/require-role.decorator';

@Post('delete-organization')
@RequireRole(RoleLevel.ORGANIZATION_ADMIN)  // Only org admins
async deleteOrg(@OrganizationId() orgId: string) {
  // Only organization_admin (level 2) or system_admin (level 1) can access
}
```

---

## 📊 Flow Diagram

```
Request → JWT Token?
          ├─ No  → 401 Unauthorized
          └─ Yes → Verify signature
                   ├─ Invalid → 401 Unauthorized
                   └─ Valid   → Extract user
                                └─ Organization ID?
                                   ├─ No  → 400 Bad Request
                                   └─ Yes → Check membership
                                            ├─ Not member → 403 Forbidden
                                            └─ Is member  → Check role (if required)
                                                            ├─ Insufficient → 403 Forbidden
                                                            └─ Sufficient   → ✅ Allow request
```

---

## 🧪 Testing Multi-Tenant Security

### Step 1: Get Supabase Token

```javascript
// In your frontend or Postman
const { data } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

const token = data.session.access_token;
```

### Step 2: Get Your Organization ID

```bash
curl -X GET http://localhost:3001/api/v1/auth/organizations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
[
  {
    "organization_id": "uuid-here",
    "organizations": {
      "id": "uuid-here",
      "name": "My Farm",
      ...
    }
  }
]
```

### Step 3: Call Protected Endpoint

```bash
curl -X POST http://localhost:3001/api/v1/sequences/invoice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: uuid-from-step-2"
```

---

## 🔒 Best Practices

### For Frontend Developers

1. **Store token securely** (Supabase handles this)
2. **Include X-Organization-Id header** in all API calls
3. **Handle 401/403 errors** by redirecting to login
4. **Refresh tokens** before expiry

```typescript
// Example API client
import { supabase } from './supabase';

async function callAPI(endpoint: string, options: RequestInit = {}) {
  // Get current session
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  // Get current organization
  const currentOrgId = localStorage.getItem('currentOrganizationId');

  if (!currentOrgId) {
    throw new Error('No organization selected');
  }

  // Make request
  const response = await fetch(`${API_BASE}/api/v1${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'X-Organization-Id': currentOrgId,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    // Token expired, refresh or redirect to login
    await supabase.auth.refreshSession();
    // Retry request...
  }

  if (response.status === 403) {
    // Not a member or insufficient permissions
    throw new Error('Access denied');
  }

  return response.json();
}

// Usage
const result = await callAPI('/sequences/invoice', {
  method: 'POST',
});
```

### For Backend Developers

1. **Always use both guards** on controllers:
   ```typescript
   @UseGuards(JwtAuthGuard, OrganizationGuard)
   ```

2. **Use @OrganizationId() decorator** instead of manual extraction:
   ```typescript
   async myMethod(@OrganizationId() orgId: string) { ... }
   ```

3. **Add role requirements** for sensitive operations:
   ```typescript
   @RequireRole(RoleLevel.ORGANIZATION_ADMIN)
   ```

4. **Mark public endpoints** explicitly:
   ```typescript
   @Public()
   @Get('some-public-endpoint')
   ```

---

## 🔐 Security Checklist

- [x] All endpoints require JWT authentication
- [x] All endpoints require organization membership
- [x] Organization membership is verified in database
- [x] Role-based access control available
- [x] Public endpoints explicitly marked
- [x] Swagger UI shows auth requirements
- [x] Clear error messages for auth failures
- [x] Token expiration handled
- [x] Multi-tenant data isolation enforced

---

## 📚 Related Documentation

- **Guards**: [src/common/guards/organization.guard.ts](src/common/guards/organization.guard.ts)
- **Decorators**: [src/common/decorators/](src/common/decorators/)
- **Auth Module**: [src/modules/auth/](src/modules/auth/)
- **Example Controller**: [src/modules/sequences/sequences.controller.ts](src/modules/sequences/sequences.controller.ts)

---

## ❓ FAQ

**Q: Can I disable authentication for development?**
A: No. Authentication is core to multi-tenancy. Use `@Public()` decorator for specific endpoints only.

**Q: What if a user belongs to multiple organizations?**
A: They must specify which organization context they're operating in via `X-Organization-Id`.

**Q: Can I use API keys instead of JWT?**
A: Not recommended. JWT tokens are more secure and integrate with Supabase Auth.

**Q: How do I test with Postman?**
A:
1. Get JWT token from Supabase Auth
2. Add to Postman: Authorization → Bearer Token
3. Add header: `X-Organization-Id: your-uuid`

**Q: What about rate limiting?**
A: Coming soon. Will be per-organization, not per-user.

---

**Status**: ✅ **Multi-Tenant Security Active**

**Auth**: ✅ Required for all APIs (except health)
**Organization**: ✅ Required and validated
**Roles**: ✅ Supported with `@RequireRole()`
