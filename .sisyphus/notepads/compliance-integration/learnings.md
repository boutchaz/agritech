# Compliance API Client - Learnings

## File Created
- `project/src/lib/api/compliance.ts` (386 lines)

## Pattern Followed
Exactly matched the pest-alerts.ts pattern:
1. Enums at top (CertificationType, CertificationStatus, ComplianceCheckType, ComplianceCheckStatus, EvidenceType)
2. DTO interfaces for request/response types
3. API client object with methods using apiClient.get/post/patch/delete
4. Organization ID passed to all methods requiring auth
5. Proper TypeScript typing throughout

## Endpoints Implemented
### Certifications (5 methods)
- getCertifications() - GET /certifications
- getCertification(id) - GET /certifications/:id
- createCertification(data) - POST /certifications
- updateCertification(id, data) - PATCH /certifications/:id
- deleteCertification(id) - DELETE /certifications/:id

### Compliance Checks (5 methods)
- getComplianceChecks() - GET /checks
- getComplianceCheck(id) - GET /checks/:id
- createComplianceCheck(data) - POST /checks
- updateComplianceCheck(id, data) - PATCH /checks/:id
- deleteComplianceCheck(id) - DELETE /checks/:id

### Requirements (1 method)
- getComplianceRequirements(certificationType?) - GET /requirements

### Evidence (1 method)
- createEvidence(data) - POST /evidence

### Dashboard (1 method)
- getDashboardStats() - GET /dashboard

## Type Safety
- All DTOs match backend controller exactly
- Enums for all categorical fields
- Optional fields properly marked with ?
- Response DTOs include joined data (certification in check response)
- No `as any` or type assertions except for params casting

## Verification
✅ TypeScript compilation passed
✅ No LSP errors in the file
✅ Follows project conventions
✅ Ready for useCompliance.ts hook implementation

---

## useCompliance.ts - TanStack Query Hooks

### File Created
- `project/src/hooks/useCompliance.ts` (375 lines)

### Pattern Followed
Exactly matched the usePestAlerts.ts pattern:
1. Query hooks with proper query keys, staleTime, and enabled conditions
2. Mutation hooks with queryClient invalidation
3. Toast notifications for success/error
4. Proper TypeScript typing for all parameters and returns

### Query Hooks (6 total)
1. **useCertifications** - GET all certifications (staleTime: 5min)
2. **useCertification** - GET single certification (staleTime: 5min)
3. **useComplianceChecks** - GET all checks (staleTime: 5min)
4. **useComplianceCheck** - GET single check (staleTime: 5min)
5. **useComplianceRequirements** - GET requirements with optional filter (staleTime: 10min)
6. **useComplianceDashboard** - GET dashboard stats (staleTime: 2min)

### Mutation Hooks (7 total)
1. **useCreateCertification** - POST new certification
   - Invalidates: certifications list, dashboard
2. **useUpdateCertification** - PATCH certification
   - Invalidates: specific cert, certifications list, dashboard
3. **useDeleteCertification** - DELETE certification
   - Invalidates: certifications list, checks, dashboard
4. **useCreateComplianceCheck** - POST new check
   - Invalidates: checks list, dashboard
5. **useUpdateComplianceCheck** - PATCH check
   - Invalidates: specific check, checks list, dashboard
6. **useDeleteComplianceCheck** - DELETE check
   - Invalidates: checks list, dashboard
7. **useCreateEvidence** - POST evidence
   - Invalidates: specific check, checks list, dashboard

### Query Key Strategy
- Certifications: `['compliance', 'certifications', organizationId]`
- Single Cert: `['compliance', 'certification', certificationId]`
- Checks: `['compliance', 'checks', organizationId]`
- Single Check: `['compliance', 'check', checkId]`
- Requirements: `['compliance', 'requirements', certificationType]`
- Dashboard: `['compliance', 'dashboard', organizationId]`

### Stale Times
- Certifications/Checks: 5 minutes (frequently updated)
- Requirements: 10 minutes (reference data, rarely changes)
- Dashboard: 2 minutes (stats, needs freshness)

### Invalidation Strategy
- Create/Update/Delete operations invalidate:
  - Specific item query (if applicable)
  - List query for that resource type
  - Dashboard stats (always affected)
- Evidence upload invalidates the parent check + dashboard

### Verification
✅ TypeScript compilation passed
✅ No LSP errors in the file
✅ All 13 hooks properly exported
✅ Follows project conventions
✅ Ready for component integration
