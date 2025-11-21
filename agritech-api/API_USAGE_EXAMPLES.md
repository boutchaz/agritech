# API Usage Examples

Complete examples for calling the AgriTech multi-tenant API.

---

## 🔐 Authentication Required

**ALL endpoints (except `/health`) require:**
1. Valid Supabase JWT token
2. Organization ID

---

## 📋 Quick Reference

### Getting a Token

```javascript
// Frontend - Get token from Supabase
const { data } = await supabase.auth.getSession();
const token = data.session.access_token;
const userId = data.session.user.id;
```

### Getting Organization ID

```bash
curl -X GET http://localhost:3001/api/v1/auth/organizations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📝 Complete Examples

### Example 1: Generate Invoice Number

**Using Header (Recommended):**

```bash
curl -X POST http://localhost:3001/api/v1/sequences/invoice \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: 123e4567-e89b-12d3-a456-426614174000" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "invoiceNumber": "INV-2024-00001"
}
```

---

### Example 2: Generate Quote Number

```bash
curl -X POST http://localhost:3001/api/v1/sequences/quote \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Organization-Id: YOUR_ORG_ID"
```

**Response:**
```json
{
  "quoteNumber": "QUO-2024-00001"
}
```

---

### Example 3: Get User Profile

```bash
curl -X GET http://localhost:3001/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "organization_users": [
    {
      "organization_id": "org-uuid",
      "role_id": "role-uuid",
      "organizations": {
        "id": "org-uuid",
        "name": "My Farm",
        "subscription_plan": "pro"
      },
      "roles": {
        "id": "role-uuid",
        "name": "organization_admin",
        "level": 2
      }
    }
  ]
}
```

---

### Example 4: Get User Organizations

```bash
curl -X GET http://localhost:3001/api/v1/auth/organizations \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
[
  {
    "organization_id": "org-1-uuid",
    "role_id": "role-uuid",
    "is_active": true,
    "organizations": {
      "id": "org-1-uuid",
      "name": "Farm Alpha",
      "subscription_plan": "pro"
    },
    "roles": {
      "name": "organization_admin",
      "display_name": "Organization Admin"
    }
  },
  {
    "organization_id": "org-2-uuid",
    "role_id": "role-uuid",
    "is_active": true,
    "organizations": {
      "id": "org-2-uuid",
      "name": "Farm Beta",
      "subscription_plan": "basic"
    },
    "roles": {
      "name": "farm_manager",
      "display_name": "Farm Manager"
    }
  }
]
```

---

## 🌐 Frontend Integration

### React/TypeScript Example

```typescript
// lib/api-client.ts
import { supabase } from './supabase';

const API_BASE_URL = 'http://localhost:3001/api/v1';

interface ApiOptions extends RequestInit {
  organizationId?: string;
}

export async function callAPI<T = any>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  // Get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('Not authenticated. Please log in.');
  }

  // Get organization ID
  const orgId =
    options.organizationId ||
    localStorage.getItem('currentOrganizationId');

  if (!orgId) {
    throw new Error('No organization selected');
  }

  // Prepare headers
  const headers: HeadersInit = {
    'Authorization': `Bearer ${session.access_token}`,
    'X-Organization-Id': orgId,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Make request
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle errors
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));

    if (response.status === 401) {
      // Token expired - try refresh
      const { error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        throw new Error('Session expired. Please log in again.');
      }

      // Retry once
      return callAPI<T>(endpoint, options);
    }

    if (response.status === 403) {
      throw new Error(
        error.message || 'You do not have permission for this operation'
      );
    }

    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}

// Specific API functions
export const api = {
  // Sequences
  generateInvoiceNumber: () =>
    callAPI<{ invoiceNumber: string }>('/sequences/invoice', {
      method: 'POST',
    }),

  generateQuoteNumber: () =>
    callAPI<{ quoteNumber: string }>('/sequences/quote', {
      method: 'POST',
    }),

  // Auth
  getUserProfile: () => callAPI('/auth/me'),

  getOrganizations: () => callAPI('/auth/organizations'),
};
```

### Usage in Components

```typescript
// components/CreateInvoice.tsx
import { api } from '@/lib/api-client';
import { useState } from 'react';

export function CreateInvoice() {
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  async function handleCreate() {
    try {
      setLoading(true);

      // Generate invoice number
      const { invoiceNumber } = await api.generateInvoiceNumber();

      setInvoiceNumber(invoiceNumber);

      // Create invoice with this number...
      // await createInvoice({ number: invoiceNumber, ... });

    } catch (error) {
      console.error('Failed to generate invoice number:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleCreate} disabled={loading}>
        {loading ? 'Generating...' : 'Create Invoice'}
      </button>

      {invoiceNumber && (
        <p>Invoice Number: {invoiceNumber}</p>
      )}
    </div>
  );
}
```

---

## 🧪 Postman Collection

### Step 1: Set Up Environment

Create environment with:
```
baseUrl: http://localhost:3001/api/v1
token: {{YOUR_SUPABASE_TOKEN}}
orgId: {{YOUR_ORG_UUID}}
```

### Step 2: Configure Authorization

In Postman:
1. Authorization tab → Type: Bearer Token
2. Token: `{{token}}`

### Step 3: Add Organization Header

In Headers tab:
```
X-Organization-Id: {{orgId}}
```

### Step 4: Create Requests

**Get Organizations:**
```
GET {{baseUrl}}/auth/organizations
```

**Generate Invoice Number:**
```
POST {{baseUrl}}/sequences/invoice
```

---

## 🔧 Error Handling

### Handle All Error Cases

```typescript
async function callAPIWithErrorHandling<T>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  try {
    return await callAPI<T>(endpoint, options);
  } catch (error) {
    if (error.message.includes('Not authenticated')) {
      // Redirect to login
      window.location.href = '/login';
    } else if (error.message.includes('permission')) {
      // Show permission denied message
      toast.error('You do not have permission for this action');
    } else if (error.message.includes('organization')) {
      // Show organization selection
      toast.error('Please select an organization first');
    } else {
      // Generic error
      toast.error('Something went wrong. Please try again.');
    }

    throw error;
  }
}
```

---

## 📱 Mobile App Example (React Native)

```typescript
// services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const API_BASE = 'http://localhost:3001/api/v1';

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  // Get token
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Please log in');
  }

  // Get current org
  const orgId = await AsyncStorage.getItem('currentOrganizationId');

  if (!orgId) {
    throw new Error('No organization selected');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'X-Organization-Id': orgId,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}
```

---

## 🔄 Working with Multiple Organizations

### Switch Organization Context

```typescript
// Store current organization
localStorage.setItem('currentOrganizationId', selectedOrgId);

// Or pass per-request
await callAPI('/sequences/invoice', {
  method: 'POST',
  organizationId: specificOrgId, // Override default
});
```

### Organization Selector Component

```typescript
function OrganizationSelector() {
  const [orgs, setOrgs] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);

  useEffect(() => {
    async function loadOrgs() {
      const organizations = await api.getOrganizations();
      setOrgs(organizations);

      // Get current from localStorage
      const current = localStorage.getItem('currentOrganizationId');
      if (current) {
        setCurrentOrg(current);
      } else if (organizations.length > 0) {
        // Default to first org
        setCurrentOrg(organizations[0].organization_id);
        localStorage.setItem(
          'currentOrganizationId',
          organizations[0].organization_id
        );
      }
    }

    loadOrgs();
  }, []);

  function handleChange(orgId: string) {
    setCurrentOrg(orgId);
    localStorage.setItem('currentOrganizationId', orgId);

    // Reload page or notify components
    window.dispatchEvent(new Event('organizationChanged'));
  }

  return (
    <select value={currentOrg || ''} onChange={(e) => handleChange(e.target.value)}>
      {orgs.map((org) => (
        <option key={org.organization_id} value={org.organization_id}>
          {org.organizations.name} ({org.roles.display_name})
        </option>
      ))}
    </select>
  );
}
```

---

## ✅ Testing Checklist

- [ ] Can authenticate with Supabase JWT
- [ ] Can get user organizations
- [ ] Can switch between organizations
- [ ] API calls include X-Organization-Id header
- [ ] 401 errors handled (redirect to login)
- [ ] 403 errors handled (show permission denied)
- [ ] Token refresh works
- [ ] Multi-org users can access all their orgs
- [ ] Cannot access other organizations' data

---

## 📚 Related Documentation

- [MULTI_TENANT_SECURITY.md](MULTI_TENANT_SECURITY.md) - Security architecture
- [README.md](README.md) - Full API documentation
- [Swagger UI](http://localhost:3001/api/docs) - Interactive API testing

---

**Status**: ✅ **Multi-Tenant API Ready**

**Auth**: Required for all endpoints
**Organization**: Required in header/query/body
**Security**: Full multi-tenant isolation
