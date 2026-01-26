# Fix Compliance CASL Permissions

## Context

The Compliance section is not visible in the sidebar because the backend compliance controller is using incorrect CASL permissions. Currently all compliance endpoints are protected by `Farm` permissions instead of `Certification` and `ComplianceCheck` permissions.

## Current Issue

**File:** `agritech-api/src/modules/compliance/compliance.controller.ts`

All endpoints are using:
```typescript
@CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
```

**Should be using:**
- For certifications: `ability.can(Action.Read, 'Certification')`
- For compliance checks: `ability.can(Action.Read, 'ComplianceCheck')`

## Root Cause

When `@CheckPolicies` doesn't match the user's abilities for the requested subject, CASL throws an error and the request fails, making the sidebar think the user doesn't have access.

## Work Required

### 1. Update CASL Decorators in Compliance Controller

**File:** `agritech-api/src/modules/compliance/compliance.controller.ts`

**Certification Endpoints:**
- Line 54: `@CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Certification'))`
- Line 72: `@CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Certification'))`
- Line 99: `@CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Certification'))`
- Line 121: `@CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'Certification'))`
- Line 154: `@CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, 'Certification'))`

**Compliance Check Endpoints:**
- Line 89: `@CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'ComplianceCheck'))`
- Line 107: `@CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'ComplianceCheck'))`
- Line 132: `@CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'ComplianceCheck'))`
- Line 152: `@CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'ComplianceCheck'))`
- Line 180: `@CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, 'ComplianceCheck'))`
- Line 337: `@CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'ComplianceCheck'))`
- Line 360: `@CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'ComplianceCheck'))`
- Line 404: `@CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'ComplianceCheck'))`

### 2. Update Sidebar CASL Subject Usage

**File:** `project/src/components/Sidebar.tsx`

Lines 627-632 and 650-667 should use correct subjects:
```typescript
<ProtectedNavItem action="read" subject="Certification">
<ProtectedNavItem action="read" subject="Certification">
```

Should be:
```typescript
<ProtectedNavItem action="read" subject="Certification">
  <Button onClick={() => handleNavigation('/compliance', e)}>
    {renderText(t('nav.overview'))}
  </Button>
</ProtectedNavItem>

<ProtectedNavItem action="read" subject="Certification">
  <Button onClick={() => handleNavigation('/compliance/certifications', e)}>
    {renderText(t('nav.certifications'))}
  </Button>
</ProtectedNavItem>
```

## Implementation Steps

1. **Update Backend CASL Decorators**
   - Replace all `'Farm'` references with `'Certification'` for certification endpoints
   - Replace all `'Farm'` references with `'ComplianceCheck'` for compliance check endpoints
   - Verify each endpoint has appropriate action (Read, Create, Update, Delete)

2. **Update Frontend CASL Usage**
   - Change sidebar from using `Certification` subject consistently
   - Ensure both compliance overview and certifications pages use correct subject

3. **Testing**
   - Verify users with appropriate permissions can access compliance section
   - Test that users without permissions are properly blocked
   - Ensure sidebar correctly shows/hides based on permissions

## Success Criteria

- [ ] Compliance section appears in sidebar for users with `Certification` read permissions
- [ ] Users can navigate to `/compliance` overview page
- [ ] Users can navigate to `/compliance/certifications` page  
- [ ] API endpoints return 200 for authorized users
- [ ] API endpoints return 403 for unauthorized users
- [ ] No CASL errors in console logs

## Technical Notes

The CASL system already has:
- `Certification` and `ComplianceCheck` subjects defined in `ability.ts`
- Frontend sidebar using correct subjects
- Backend controller imported correct types

Only the decorators need updating to use the correct subject names.

## Risk Assessment

**Low Risk:** Only permission decorator changes, no logic modifications
**Rollback:** Simple to revert by changing subject back to `'Farm'`
**Testing:** Can verify without data changes