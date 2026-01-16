---
tags: [security]
summary: security implementation decisions and patterns
relevantTo: [security]
importance: 0.7
relatedFiles: []
usageStats:
  loaded: 0
  referenced: 0
  successfulFeatures: 0
---
# security

### Scope rollback deletes to tenant-specific identifiers (organization/buyer org) instead of deleting by id alone. (2026-01-16)
- **Context:** Rollback paths for journal entries and marketplace orders could delete records across tenants if executed with elevated privileges or weak RLS enforcement.
- **Why:** Delete-by-id alone is insufficient under service-role/admin contexts; adding tenant filters ensures rollback only touches the current tenant’s data.
- **Rejected:** Rely solely on RLS to guard deletes; rejected because service-role operations can bypass RLS, making cross-tenant deletion possible.
- **Trade-offs:** More constraints on rollback queries; requires tenant identifiers to be available in error paths.
- **Breaking if changed:** Removing tenant scoping could allow accidental or malicious cross-tenant deletions during rollback failures.

#### [Gotcha] Satellite service endpoints lack tenant verification, leaving an open data segregation gap despite core backend scoping fixes. (2026-01-16)
- **Situation:** Audit notes indicate some satellite-service endpoints do not enforce tenant context, creating an isolation hole outside the main API modules.
- **Root cause:** Even with RLS and scoped deletes, auxiliary services can bypass tenant checks if they don’t validate organization context.
- **How to avoid:** Requires adding tenant validation across service boundaries, possibly increasing auth and data-joining complexity.