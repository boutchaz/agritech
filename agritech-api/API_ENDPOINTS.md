# API Endpoints Reference

Quick reference for all available AgriTech API endpoints.

---

## Base URL

```
Production: https://agritech-api.thebzlab.online
Development: http://localhost:3001
```

**API Prefix:** `/api/v1`

**Swagger UI:** `{BASE_URL}/api/docs`

---

## Authentication Endpoints

### POST /api/v1/auth/signup

**Description:** User signup with automatic organization creation

**Auth Required:** No (Public endpoint)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+212612345678",
  "organizationName": "Green Acres Farm",
  "invitedToOrganization": "uuid",
  "invitedWithRole": "uuid"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe"
  },
  "organization": {
    "id": "uuid",
    "name": "Green Acres Farm",
    "slug": "green-acres-farm"
  },
  "session": {
    "access_token": "eyJhbG...",
    "refresh_token": "eyJhbG...",
    "expires_in": 3600
  }
}
```

**Errors:**
- `400` - Bad request (validation failed)
- `409` - Conflict (email already exists or slug collision)

---

### GET /api/v1/auth/me

**Description:** Get current user profile

**Auth Required:** Yes

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "organization_users": [
    {
      "organization_id": "uuid",
      "role_id": "uuid",
      "organizations": {
        "id": "uuid",
        "name": "My Farm",
        "subscription_plan": "pro"
      },
      "roles": {
        "id": "uuid",
        "name": "organization_admin",
        "level": 2
      }
    }
  ]
}
```

---

### GET /api/v1/auth/organizations

**Description:** Get user's organizations

**Auth Required:** Yes

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
[
  {
    "organization_id": "uuid",
    "role_id": "uuid",
    "is_active": true,
    "organizations": {
      "id": "uuid",
      "name": "Farm Alpha",
      "subscription_plan": "pro"
    },
    "roles": {
      "name": "organization_admin",
      "display_name": "Organization Admin"
    }
  }
]
```

---

## Sequences Endpoints

### POST /api/v1/sequences/invoice

**Description:** Generate next invoice number

**Auth Required:** Yes

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: {organization-uuid}
```

**Response (200):**
```json
{
  "invoiceNumber": "INV-2024-00001"
}
```

---

### POST /api/v1/sequences/quote

**Description:** Generate next quote number

**Auth Required:** Yes

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: {organization-uuid}
```

**Response (200):**
```json
{
  "quoteNumber": "QUO-2024-00001"
}
```

---

### POST /api/v1/sequences/purchase-order

**Description:** Generate next purchase order number

**Auth Required:** Yes

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: {organization-uuid}
```

**Response (200):**
```json
{
  "purchaseOrderNumber": "PO-2024-00001"
}
```

---

## Health Check Endpoints

### GET /

**Description:** Basic health check

**Auth Required:** No

**Response (200):**
```json
{
  "message": "AgriTech API is running",
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

---

### GET /health

**Description:** Detailed health check

**Auth Required:** No

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "uptime": 123456,
  "environment": "production"
}
```

---

## Common Request Headers

### Authentication
```
Authorization: Bearer {supabase-jwt-token}
```

### Organization Context
```
X-Organization-Id: {organization-uuid}
```

Can also be provided via:
- Query parameter: `?organizationId={uuid}`
- Request body: `{ "organizationId": "uuid" }`

**Priority:** Header > Query > Body

---

## Common Response Codes

### Success
- `200` - OK (GET, PATCH, DELETE)
- `201` - Created (POST)
- `204` - No Content (DELETE)

### Client Errors
- `400` - Bad Request (validation failed)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (not organization member or insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `422` - Unprocessable Entity (business logic error)

### Server Errors
- `500` - Internal Server Error
- `502` - Bad Gateway
- `503` - Service Unavailable

---

## Error Response Format

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

For validation errors:

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than 8 characters"
  ],
  "error": "Bad Request"
}
```

---

## Authentication Flow

### 1. Signup
```bash
POST /api/v1/auth/signup
# Returns: user + organization + session tokens
```

### 2. Store Tokens
```javascript
localStorage.setItem('access_token', data.session.access_token);
localStorage.setItem('refresh_token', data.session.refresh_token);
localStorage.setItem('currentOrganizationId', data.organization.id);
```

### 3. Make Authenticated Requests
```bash
GET /api/v1/auth/me
Authorization: Bearer {access_token}
```

### 4. Make Organization-Scoped Requests
```bash
POST /api/v1/sequences/invoice
Authorization: Bearer {access_token}
X-Organization-Id: {organization_id}
```

---

## Rate Limiting

**Current:** Not implemented

**Planned:**
- 5 signups per IP per 15 minutes
- 100 API calls per organization per minute
- 1000 API calls per organization per hour

---

## Swagger UI

**URL:** `{BASE_URL}/api/docs`

**Features:**
- Interactive API testing
- Request/response schemas
- Authentication (click "Authorize" button)
- Code generation

**To Use:**
1. Click "Authorize"
2. Enter JWT token: `Bearer {your-token}`
3. Enter Organization ID: `{your-org-uuid}`
4. Click endpoints to try them

---

## Postman Collection

### Setup Environment

```
baseUrl: https://agritech-api.thebzlab.online/api/v1
token: {your-jwt-token}
orgId: {your-org-uuid}
```

### Authorization

**Type:** Bearer Token
**Token:** `{{token}}`

### Headers

```
X-Organization-Id: {{orgId}}
Content-Type: application/json
```

---

## Client Examples

### JavaScript/TypeScript

```typescript
const API_BASE = 'https://agritech-api.thebzlab.online/api/v1';

async function callAPI(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Organization-Id': organizationId,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Usage
const result = await callAPI('/sequences/invoice', { method: 'POST' });
```

### cURL

```bash
# Signup
curl -X POST https://agritech-api.thebzlab.online/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "organizationName": "My Farm"
  }'

# Get profile
curl https://agritech-api.thebzlab.online/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Generate invoice number
curl -X POST https://agritech-api.thebzlab.online/api/v1/sequences/invoice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: YOUR_ORG_ID"
```

---

## Development

### Local Testing

```bash
# Start API
cd agritech-api
npm run dev

# API available at: http://localhost:3001
# Swagger UI: http://localhost:3001/api/docs
```

### Environment Variables

```env
PORT=3001
NODE_ENV=development
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
CORS_ORIGIN=http://localhost:5173
```

---

## Related Documentation

- **Multi-Tenant Security**: [MULTI_TENANT_SECURITY.md](MULTI_TENANT_SECURITY.md)
- **API Usage Examples**: [API_USAGE_EXAMPLES.md](API_USAGE_EXAMPLES.md)
- **Signup Migration**: [SIGNUP_MIGRATION.md](SIGNUP_MIGRATION.md)
- **NestJS Setup**: [NESTJS_SETUP_COMPLETE.md](NESTJS_SETUP_COMPLETE.md)

---

**Last Updated:** 2025-01-21

**API Version:** v1

**Status:** ✅ Production Ready
