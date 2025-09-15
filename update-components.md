# Component Updates for Multi-Tenant Authentication

## Files to Update

### 1. EmployeeManagement.tsx
```typescript
// Replace imports
import { supabase, DEFAULT_FARM_ID } from '../lib/supabase';
// With:
import { supabase } from '../lib/supabase';
import { useAuth } from './MultiTenantAuthProvider';

// Add in component:
const { currentOrganization, currentFarm } = useAuth();

// Replace all DEFAULT_FARM_ID references with currentOrganization.id
// Add organization_id to all database operations
```

### 2. DayLaborerManagement.tsx
- Same pattern as EmployeeManagement.tsx
- Update imports
- Add useAuth hook
- Replace DEFAULT_FARM_ID with organization context

### 3. InfrastructureManagement.tsx
- Same pattern as above
- Focus on organization-level data

### 4. UtilitiesManagement.tsx
- Same pattern as above
- Organization-scoped utilities

### 5. ModuleView.tsx
- Update to use organization context instead of hardcoded farm references

## Key Changes for Each Component:

1. **Import useAuth hook**
2. **Get current organization and farm from context**
3. **Replace DEFAULT_FARM_ID with organization_id**
4. **Add null checks for organization**
5. **Update useEffect dependencies**

## Database Query Pattern:
```typescript
// Old:
.eq('farm_id', DEFAULT_FARM_ID)

// New:
.eq('organization_id', currentOrganization.id)

// For farm-specific data:
.eq('farm_id', currentFarm?.id)
```

## Error Handling:
```typescript
if (!currentOrganization) {
  setLoading(false);
  return;
}
```

This ensures all components work with the new multi-tenant architecture.