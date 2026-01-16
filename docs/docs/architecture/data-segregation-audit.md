---
title: Data Segregation Security Audit
description: Backend database multi-tenant isolation review and remediation
---

# Data Segregation Security Audit

**Feature ID:** feature-1768582421769-u7ixj0n9u
**Date:** 2026-01-16
**Scope:** Supabase database schema, agritech-api service layer, backend-service (satellite indices)

## Current Segregation Architecture

- **Tenant key:** `organization_id` is the primary tenant boundary across shared tables.
- **Isolation enforcement:** PostgreSQL RLS policies use `auth.uid()` + `organization_users` to scope reads/writes.
- **Service layer:** NestJS organization guard enforces `X-Organization-Id` and membership before requests.
- **Data access patterns:** Supabase queries are expected to include `.eq('organization_id', <orgId>)` or inherit via parent relationships.

Reference documentation:
- `docs/docs/architecture/multi-tenancy.md`
- `docs/docs/database/rls-policies.md`

## Audit Findings

### ✅ Verified Controls

- RLS enabled across tenant-owned tables (`project/supabase/migrations/00000000000000_schema.sql`).
- Organization membership checks via `organization_users` in RLS policies and `agritech-api` guard.
- Triggers backfill `organization_id` on analyses-related tables.

### ⚠️ Findings (with Severity)

1. **Rollback deletes missing tenant scope (Medium)**
   - **Location:** `agritech-api/src/modules/journal-entries/accounting-automation.service.ts`
   - **Impact:** ID-only deletes could bypass tenant boundaries if RLS is bypassed or misconfigured.
   - **Status:** **Remediated** in this change by adding `organization_id` filters.

2. **Marketplace order rollback deletes missing tenant scope (Medium)**
   - **Location:** `agritech-api/src/modules/marketplace/orders.service.ts`
   - **Impact:** Rollback deletes lacked buyer scoping; if a privileged token is used, cross-tenant deletes could occur.
   - **Status:** **Remediated** by scoping deletes to `buyer_organization_id`.

3. **Satellite service endpoints lack tenant verification (High)**
   - **Location:** `backend-service/app/api/supabase.py`
   - **Impact:** `farm_id` / `parcel_id` endpoints use service role without organization checks. This allows cross-tenant reads if IDs are known.
   - **Status:** **Open** (recommended remediation below).

## Remediation Recommendations (with Examples)

### 1. Always include tenant scope in deletes

```ts
await supabase
  .from('journal_entries')
  .delete()
  .eq('id', journalEntry.id)
  .eq('organization_id', organizationId);
```

### 2. Enforce tenant checks in satellite-service endpoints

```py
@router.get("/farms/{farm_id}/parcels")
async def get_farm_parcels(
    farm_id: str,
    auth_context: dict = Depends(require_organization_access)
):
    farm = await supabase_service.get_farm_details(farm_id)
    if not farm or farm.get('organization_id') != auth_context['organization_id']:
        raise HTTPException(status_code=403, detail="Access denied")
    return {"parcels": await supabase_service.get_farm_parcels(farm_id)}
```

### 3. Standardize policy helpers

```sql
CREATE POLICY "org_access" ON any_table
FOR ALL USING (is_organization_member(organization_id));
```

## Automated Test Coverage

### Added in this change

- **Accounting rollback scope test:** Ensures journal entry rollbacks include `organization_id` filtering.
- **Marketplace rollback scope test:** Ensures order rollbacks include `buyer_organization_id` filtering.

### Suggested ongoing checks

- Run `project/VERIFY_RLS_POLICIES.sql` after schema changes.
- Execute `project/scripts/verify-blocking.sql` to validate RLS enforcement.

## Validation Checklist

- [ ] All tenant tables include `organization_id` foreign key or parent-bound policy
- [ ] Delete/update operations include tenant filters in service layer
- [ ] Service role operations are guarded by membership verification
- [ ] RLS policies verified with cross-tenant test users
