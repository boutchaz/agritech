# Decisions

Architectural and strategic decisions across all requests.
One decision per entry. One paragraph. Reference the request for details.

## Entry format

### <Decision title> — YYYY-MM-DD (Request: <request-name>)

What was decided and why. What was considered and rejected.
See request artifacts for full context.

---

## What belongs here
- Library or technology choices with rationale
- Architectural patterns adopted
- Approaches explicitly rejected and why
- Deviations from the original plan with explanation
- Decisions that constrain future work

## What does NOT belong here
- Activity entries ("added X", "removed Y", "refactored Z")
- Implementation details available in request artifacts
- Decisions too small to affect future planning

---

<!-- decisions below this line -->

### Morocco accounting_standard normalized to CGNC — 2026-03-26 (Request: generic-accounting-mappings)

SQL schema seeds used 'PCEC' for Morocco while TypeScript code used 'CGNC'. Standardized everything to CGNC (Code Général de Normalisation Comptable) since that's what the chart template metadata and getSupportedCountries() use. All 57 PCEC references in the schema migration were replaced.

### Unified account resolution through account_mappings — 2026-03-26 (Request: generic-accounting-mappings)

All accounting flows (invoices, payments, costs, revenue, worker payments) now resolve GL accounts through `AccountingAutomationService.resolveAccountId()` which queries the `account_mappings` table. No service directly looks up accounts by hardcoded code. Previously, invoices.service and payments.service hardcoded US GAAP codes (1200, 2110, 2150, 1110) which didn't exist in any non-US chart of accounts.

### applyTemplate sets org accounting context and initializes mappings — 2026-03-26 (Request: generic-accounting-mappings)

When applying a country chart template, the system now: (1) sets `country_code` and `accounting_standard` on the organization, (2) inserts all chart accounts, (3) calls `initializeDefaultMappings` to create org-level account_mappings with resolved account_ids. Previously, accounting context was never set on the org and account_mappings_created was always 0.

### Pre-existing seed data bugs fixed for cash/tax accounts — 2026-03-26 (Request: generic-accounting-mappings)

Multiple countries had cash mapping account codes that didn't match their actual chart of accounts: MA (514→5141, 511→5161), TN (53→52/511), GB (1200→232, 1220→231), DE (1100→1000). Tunisia and Germany also lacked separate input VAT accounts in their charts — used closest equivalents with notes to configure manually.
