---
description: Guide for debugging and fixing bugs in the AgriTech platform
---

# Bug Fix Workflow

Follow this systematic approach to identify, fix, and verify bug fixes.

## 1. Reproduce the Bug

### Gather Information
- What is the expected behavior?
- What is the actual behavior?
- What steps reproduce the issue?
- Does it happen consistently or intermittently?
- Which user role(s) are affected?
- Which browser/device?

### Reproduce Locally
```bash
# Ensure local environment is up to date
npm install
npm run db:reset  # If database-related

# Start dev server
npm run dev

# Follow reproduction steps
```

## 2. Identify Root Cause

### Check Browser Console
- Open DevTools → Console
- Look for JavaScript errors
- Check Network tab for failed API calls

### Check Logs
```bash
# Frontend logs (in terminal running npm run dev)
# Check Vite dev server output

# Backend logs (if satellite service)
# Check uvicorn logs in satellite-indices-service

# Database logs (if query-related)
# Check Supabase dashboard logs
```

### Common Issue Categories

**RLS (Row Level Security) Issues**
- User can't see data they should have access to
- Check: User's organization membership, role assignments
- Debug query: Run in Supabase SQL editor with `SELECT * FROM table WHERE ...`

**Permission Issues**
- Feature blocked unexpectedly
- Check: `src/lib/casl/defineAbilityFor.ts`
- Check: User's subscription plan and limits
- Debug: Log `ability.can('action', 'Resource')` result

**Form Validation Issues**
- Form not submitting
- Check: Zod schema in `src/schemas/`
- Check: Form error messages with `console.log(form.formState.errors)`

**Data Fetching Issues**
- Data not loading or stale
- Check: TanStack Query DevTools (automatically enabled in dev)
- Check: Query keys, `enabled` flag, `staleTime`

**Type Errors**
- TypeScript compilation errors
- Run: `npm run type-check`
- Check: Database types are up to date (`npm run db:generate-types-remote`)

## 3. Fix the Issue

### Code Changes
Follow existing patterns in the codebase:

**Bad Query Example**:
```typescript
// Missing staleTime, no error handling
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: () => supabase.from('table').select()
});
```

**Good Query Example**:
```typescript
const { data, error } = useQuery({
  queryKey: ['data', orgId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('organization_id', orgId);

    if (error) throw error;
    return data;
  },
  enabled: !!orgId,
  staleTime: 5 * 60 * 1000,
});

if (error) {
  return <ErrorMessage error={error} />;
}
```

### Database Fixes
If schema changes needed:

```bash
# Create migration
# Location: project/supabase/migrations/YYYYMMDDHHMMSS_fix_description.sql

# Test locally
npm run db:reset
npm run db:generate-types

# Deploy
npm run schema:push
```

### Permission Fixes
Update CASL definitions:

```typescript
// src/lib/casl/defineAbilityFor.ts
if (hasRole(['organization_admin', 'farm_manager'])) {
  can('read', 'Resource');
}
```

## 4. Test the Fix

### Manual Testing
- [ ] Reproduce original steps - bug should be fixed
- [ ] Test with different roles (if role-related)
- [ ] Test with different subscription tiers (if subscription-related)
- [ ] Test edge cases (empty data, large datasets, etc.)
- [ ] Test on different browsers (if UI-related)

### Automated Testing (if applicable)
```bash
# Run existing tests
npm test

# Type check
npm run type-check

# Lint
npm run lint
```

### Regression Testing
- Ensure fix didn't break other features
- Check related components/pages
- Review TanStack Query DevTools for unexpected refetches

## 5. Document the Fix

### Code Comments (if complex)
```typescript
// Fix: [Issue #123] - Users couldn't access parcels due to missing org check
// Added organization_id filter to ensure proper RLS behavior
```

### Git Commit
```bash
git add .
git commit -m "fix: [brief description]

- Detailed description of issue
- Root cause analysis
- How the fix addresses it

Fixes #123"
```

## Common Bug Patterns

### 1. Query Not Refetching After Mutation
**Symptom**: Create/update works but UI doesn't update

**Fix**: Invalidate queries after mutation
```typescript
const mutation = useMutation({
  mutationFn: (data) => api.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource'] });
  }
});
```

### 2. RLS Blocking Legitimate Access
**Symptom**: User should see data but gets empty results

**Fix**: Check RLS policy in migration
```sql
-- Ensure policy includes all necessary conditions
CREATE POLICY "Users can view own org data" ON table_name
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);
```

### 3. Form Submission Fails Silently
**Symptom**: Button click does nothing

**Fix**: Check validation errors
```typescript
const onSubmit = async (data) => {
  try {
    await mutation.mutateAsync(data);
    toast.success('Success!');
  } catch (error) {
    console.error('Submission error:', error);
    toast.error(error.message);
  }
};
```

### 4. Type Mismatch After Schema Change
**Symptom**: TypeScript errors after database changes

**Fix**: Regenerate types
```bash
npm run db:generate-types-remote
# Restart TypeScript server in VSCode (Cmd+Shift+P → "Restart TS Server")
```

### 5. Infinite Refetch Loop
**Symptom**: Network tab shows repeated API calls

**Fix**: Check query key stability
```typescript
// Bad: Object creates new reference every render
queryKey: ['data', { filter: someObject }]

// Good: Stable primitive keys
queryKey: ['data', someObject.id, someObject.status]
```

### 6. Subscription Limit False Positive
**Symptom**: User blocked despite being under limit

**Fix**: Check limit calculation in AbilityContext
```typescript
// Ensure count query includes proper filters
const { count } = await supabase
  .from('farms')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', currentOrganization.id)
  .is('deleted_at', null); // Don't count deleted items
```

## Debugging Tools

### React Query DevTools
Automatically available in development at `http://localhost:5173`
- View all queries and mutations
- See cache state
- Manually trigger refetch
- View query timeline

### Supabase Dashboard
- SQL Editor for testing queries
- Logs for API errors
- Auth users for role checking
- Table editor for data inspection

### Browser DevTools
- Console for errors
- Network tab for API calls
- React DevTools for component state
- Redux DevTools (if using Redux)

## When to Escalate

If you encounter:
- GEE (Google Earth Engine) service errors → Check satellite service logs
- Payment/subscription webhook failures → Check Polar.sh dashboard
- Database performance issues → Review query plans, indexes
- Security vulnerabilities → Report immediately, do not commit fix until reviewed

## Checklist

- [ ] Bug reproduced locally
- [ ] Root cause identified
- [ ] Fix implemented following project patterns
- [ ] Fix tested with original reproduction steps
- [ ] Edge cases tested
- [ ] Different roles/subscriptions tested (if applicable)
- [ ] No new TypeScript errors (`npm run type-check`)
- [ ] No new linting errors (`npm run lint`)
- [ ] Related features still work (regression check)
- [ ] Git commit with clear description
- [ ] Issue updated/closed (if tracking in GitHub)
