# Permission System Testing Checklist

## Critical Endpoints to Test

### Invoices (`/invoices`)
| Role | GET (list) | POST (create) | PATCH (update) | DELETE |
|------|-----------|---------------|----------------|--------|
| system_admin | ✅ | ✅ | ✅ | ✅ |
| organization_admin | ✅ | ✅ | ✅ | ✅ |
| farm_manager | ✅ | ✅ | ✅ | ✅ |
| farm_worker | ❌ | ❌ | ❌ | ❌ |
| day_laborer | ❌ | ❌ | ❌ | ❌ |
| viewer | ✅ | ❌ | ❌ | ❌ |

### Payments (`/payments`)
| Role | GET (list) | POST (create) | PATCH (update) | DELETE |
|------|-----------|---------------|----------------|--------|
| system_admin | ✅ | ✅ | ✅ | ✅ |
| organization_admin | ✅ | ✅ | ✅ | ✅ |
| farm_manager | ✅ | ✅ | ✅ | ❌ |
| farm_worker | ❌ | ❌ | ❌ | ❌ |
| day_laborer | ❌ | ❌ | ❌ | ❌ |
| viewer | ✅ | ❌ | ❌ | ❌ |

### Journal Entries (`/journal-entries`)
| Role | GET (list) | POST (create) | PATCH (update) | POST /:id/post |
|------|-----------|---------------|----------------|---------------|
| system_admin | ✅ | ✅ | ✅ | ✅ |
| organization_admin | ✅ | ✅ | ✅ | ✅ |
| farm_manager | ✅ | ❌ | ❌ | ❌ |
| farm_worker | ❌ | ❌ | ❌ | ❌ |
| day_laborer | ❌ | ❌ | ❌ | ❌ |
| viewer | ✅ | ❌ | ❌ | ❌ |

### Accounts (`/accounts`)
| Role | GET | POST | PATCH | DELETE |
|------|-----|-----|-------|-------|
| system_admin | ✅ | ✅ | ✅ | ✅ |
| organization_admin | ✅ | ✅ | ✅ | ✅ |
| farm_manager | ✅ | ❌ | ❌ | ❌ |
| farm_worker | ❌ | ❌ | ❌ | ❌ |
| day_laborer | ❌ | ❌ | ❌ | ❌ |
| viewer | ✅ | ❌ | ❌ | ❌ |

### Workers (`/workers`)
| Role | GET | POST | PATCH | DELETE |
|------|-----|-----|-------|-------|
| system_admin | ✅ | ✅ | ✅ | ✅ |
| organization_admin | ✅ | ✅ | ✅ | ✅ |
| farm_manager | ✅ | ✅ | ✅ | ✅ |
| farm_worker | ✅ | ❌ | ❌ | ❌ |
| day_laborer | ❌ | ❌ | ❌ | ❌ |
| viewer | ✅ | ❌ | ❌ | ❌ |

### Tasks (`/tasks`)
| Role | GET | POST | PATCH | DELETE |
|------|-----|-----|-------|-------|
| system_admin | ✅ | ✅ | ✅ | ✅ |
| organization_admin | ✅ | ✅ | ✅ | ✅ |
| farm_manager | ✅ | ✅ | ✅ | ✅ |
| farm_worker | ✅ | ✅ | ✅ | ❌ |
| day_laborer | ✅ | ❌ | ✅ | ❌ |
| viewer | ✅ | ❌ | ❌ | ❌ |

## Testing Steps

### 1. Backend API Testing

Use curl or Postman to test endpoints with different user tokens:

```bash
# Get a token for a user
TOKEN="your-jwt-token"
ORG_ID="your-org-id"

# Test invoice list (should work for most roles)
curl -X GET http://localhost:3000/api/v1/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-organization-id: $ORG_ID"

# Test invoice creation (should fail for farm_worker, day_laborer, viewer)
curl -X POST http://localhost:3000/api/v1/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-organization-id: $ORG_ID" \
  -H "Content-Type: application/json" \
  -d '{"invoice_number": "TEST-001", "total_amount": 1000}'
```

### 2. Frontend UI Testing

1. **Login as each role type** and verify:
   - [ ] Dashboard displays correctly
   - [ ] Navigation menu shows only allowed items
   - [ ] Action buttons (Create, Edit, Delete) appear/disappear correctly

2. **Test specific pages**:
   - [ ] `/invoices` - View, create, edit, delete
   - [ ] `/payments` - View, create, allocate
   - [ ] `/journal-entries` - View only for farm_manager
   - [ ] `/workers` - Manage for managers, view for workers
   - [ ] `/tasks` - Full access for managers, limited for workers

3. **Test permission boundaries**:
   - [ ] Try accessing `/accounts` as farm_worker (should be blocked)
   - [ ] Try creating invoice as farm_worker (should be blocked)
   - [ ] Try deleting journal entry as farm_manager (should be blocked)

### 3. Console Log Verification

Enable console logging and check for permission denials:

```javascript
// In browser console, look for:
// - "[PoliciesGuard] Permission denied" messages
// - 403 Forbidden responses
```

### 4. Database Verification

Check that roles are correctly assigned:

```sql
-- Verify role assignments
SELECT
  u.email,
  r.name as role_name,
  r.level as role_level,
  ou.is_active
FROM organization_users ou
JOIN users u ON u.id = ou.user_id
JOIN roles r ON r.id = ou.role_id
WHERE ou.organization_id = 'your-org-id';
```

## Rollback Plan

If issues are found, rollback steps:

1. **Remove PoliciesGuard** from controllers temporarily:
   ```typescript
   @UseGuards(JwtAuthGuard, OrganizationGuard) // Remove PoliciesGuard
   ```

2. **Disable permission checking** in PoliciesGuard:
   ```typescript
   // In policies.guard.ts, temporarily return true
   async canActivate(context: ExecutionContext): Promise<boolean> {
     return true; // Temporary: disable permission checks
   }
   ```

3. **Restore frontend-only permissions** if needed

## Monitoring After Deployment

Watch for these errors in logs:

- `403 Forbidden` responses increasing
- `[PoliciesGuard] Permission denied` messages
- User complaints about missing access
- "Insufficient permissions" errors in frontend
