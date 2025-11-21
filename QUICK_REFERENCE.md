# AgriTech Business Logic - Quick Reference

## Analysis Files Generated
- **BUSINESS_LOGIC_ANALYSIS.md** (46 KB, 1,272 lines) - Complete detailed analysis
- **MIGRATION_SUMMARY.md** (9 KB) - Executive summary and roadmap
- **QUICK_REFERENCE.md** (this file) - Fast lookup guide

---

## Supabase Edge Functions (27 Total)

### Accounting (CRITICAL)
```
POST /functions/create-invoice      → Edge Function (create-invoice/)
POST /functions/post-invoice        → Edge Function (post-invoice/)
POST /functions/allocate-payment    → Edge Function (allocate-payment/)
GET  /functions/generate-financial-report → Edge Function (generate-financial-report/)
```

### Production Analytics (HIGH)
```
POST /functions/farm-analytics      → Edge Function (farm-analytics/)
POST /functions/yield-prediction    → Edge Function (yield-prediction/)
POST /functions/generate-parcel-report → Edge Function (generate-parcel-report/)
```

### Workforce (MEDIUM)
```
POST /functions/task-assignment     → Edge Function (task-assignment/)
```

### Environmental (MEDIUM)
```
POST /functions/crop-planning       → Edge Function (crop-planning/)
POST /functions/irrigation-scheduling → Edge Function (irrigation-scheduling/)
POST /functions/generate-index-image → Edge Function (generate-index-image/)
```

### Data Lifecycle (MEDIUM)
```
DELETE /functions/delete-farm       → Edge Function (delete-farm/)
DELETE /functions/delete-parcel     → Edge Function (delete-parcel/)
POST /functions/export-farm         → Edge Function (export-farm/)
POST /functions/import-farm         → Edge Function (import-farm/)
```

### Auth & Billing (LOW)
```
POST /functions/on-user-created     → Edge Function (on-user-created/)
POST /functions/grant-worker-access → Edge Function (grant-worker-access/)
POST /functions/invite-user         → Edge Function (invite-user/)
POST /functions/user-auth-data      → Edge Function (user-auth-data/)
POST /functions/check-subscription  → Edge Function (check-subscription/)
POST /functions/create-trial-subscription → Edge Function (create-trial-subscription/)
POST /functions/polar-webhook       → Edge Function (polar-webhook/)
```

### Documents (MEDIUM)
```
POST /functions/generate-quote-pdf  → Edge Function (generate-quote-pdf/)
```

### IoT (STUB)
```
POST /functions/sensor-data         → Edge Function (sensor-data/) [NOT IMPLEMENTED]
```

---

## SQL Functions in Schema.sql

### Number Generation (7 Functions)
```sql
generate_quote_number(p_organization_id)
generate_sales_order_number(p_organization_id)
generate_purchase_order_number(p_organization_id)
generate_stock_entry_number(p_organization_id)
generate_invoice_number(p_organization_id, p_invoice_type)
generate_journal_entry_number(p_organization_id)
generate_item_code(p_organization_id, p_category)
```

### Accounting Functions (4 Functions)
```sql
get_account_id_by_code(p_org_id, p_code) → UUID
get_account_id_by_mapping(p_org_id, p_mapping_type, p_mapping_key) → UUID
create_cost_journal_entry() → TRIGGER FUNCTION
create_revenue_journal_entry() → TRIGGER FUNCTION
```

### Analytics Functions (2 Functions)
```sql
get_farm_hierarchy_tree(org_uuid, root_farm_id) → TABLE
get_parcel_performance_summary(org_id, farm_id, parcel_id, from_date, to_date) → TABLE
```

### Stock Management (1 Function - INCOMPLETE)
```sql
process_stock_entry_posting() → TRIGGER FUNCTION
-- TODO: FIFO/LIFO logic not implemented
```

### Authorization (2 Functions)
```sql
has_valid_subscription(org_id) → BOOLEAN
is_organization_member(p_organization_id) → BOOLEAN
```

### Data Seeding (3 Functions)
```sql
seed_default_work_units(p_organization_id) → INTEGER
seed_chart_of_accounts(p_org_id) → INTEGER
seed_moroccan_chart_of_accounts(p_org_id) → INTEGER
seed_french_chart_of_accounts(p_org_id) → INTEGER
```

---

## RPC Calls from Frontend (23 Total)

### Sequences (7 RPC Calls)
```
Files: hooks/useQuotes.ts, hooks/usePayments.ts, lib/accounting-api.ts, etc.
- generate_quote_number()
- generate_sales_order_number()
- generate_purchase_order_number()
- generate_stock_entry_number()
- generate_invoice_number()
- generate_journal_entry_number()
- generate_payment_number()
```

### Hierarchy (5 RPC Calls)
```
Files: components/FarmHierarchy/*.tsx, components/OnboardingFlow.tsx
- get_farm_hierarchy_tree()
- get_organization_farms()
- get_user_farm_roles()
- create_organization_with_farm()
- create_sub_farm()
```

### Workers & Tasks (7 RPC Calls)
```
Files: hooks/useWorkers.ts, hooks/usePayments.ts, hooks/useTasks.ts
- get_worker_availability()
- assign_farm_role()
- get_user_tasks()
- calculate_daily_worker_payment()
- calculate_fixed_salary_payment()
- calculate_metayage_share()
- get_worker_advance_deductions()
```

### Production (4 RPC Calls)
```
Files: hooks/useProductionIntelligence.ts, hooks/useHarvests.ts, hooks/useOpeningStock.ts
- get_parcel_performance_summary()
- get_harvest_statistics()
- post_opening_stock_balance()
- create_material_receipt_from_po()
```

---

## Critical Business Logic Locations

### Double-Entry Bookkeeping
**File**: `/project/supabase/functions/_shared/ledger.ts`
- buildInvoiceLedgerLines() - Invoice journal entries
- buildPaymentLedgerLines() - Payment journal entries
- Validation: Debits = Credits

### Account Mapping (Multi-Country)
**File**: `/project/supabase/migrations/00000000000000_schema.sql` (lines 7856-7912)
- Function: get_account_id_by_mapping()
- Countries: Morocco, France, Default
- Mapping Types: cost_type, revenue_type, cash

### Performance Rating
**File**: `/project/supabase/migrations/00000000000000_schema.sql` (lines 1615-1713)
- Formula: (actual_yield - estimated_yield) / estimated_yield * 100
- Ratings: excellent(>=10%), good(>=0%), acceptable(>=-10%), poor(<-10%)

### Stock Management (INCOMPLETE!)
**File**: `/project/supabase/migrations/00000000000000_schema.sql` (lines 4801-5009)
- Status: INCOMPLETE - FIFO/LIFO not implemented
- TODO comment at line ~4950
- Impacts: Inventory cost accuracy

### Worker Payment Methods
**Files**: Various payment hooks
- Daily: hours * hourly_rate
- Fixed: monthly_salary / working_days
- Metayage: harvest_qty * unit_price * percentage
- Deductions: Track advances & loans

---

## What's Already in Backend Service

**Location**: `/backend-service/` (FastAPI + Python)

### Implemented
- Satellite indices calculation (NDVI, NDRE, etc.)
- Time series analysis
- Cloud coverage checking
- PDF generation (quotes, invoices)
- GeoTIFF export
- Batch processing

### Not Yet Migrated
- All accounting logic
- All production intelligence aggregations
- All worker payment calculations
- All stock management

---

## Migration Priorities

### Phase 1: Foundation (1-2 Days)
- NestJS project setup
- Database layer (Supabase client)
- Sequences service (7 number generators)
- Auth middleware
- Testing framework

### Phase 2: Accounting (5-7 Days) - CRITICAL
- Invoice service + posting
- Journal entry service
- Payment allocation
- Financial reports
- Account mapping

### Phase 3: Production Intelligence (3-4 Days)
- Parcel performance service
- Farm analytics service
- Caching layer
- Yield prediction wrapper

### Phase 4: Workforce (2-3 Days)
- Task assignment service
- Worker payment calculator
- Availability service
- Metayage calculator

### Phase 5: Inventory (4-5 Days)
- Stock entry service
- FIFO/LIFO calculator (NEEDED!)
- Stock movements
- Stock valuation

---

## Key Metrics

| Aspect | Count | Status |
|--------|-------|--------|
| Edge Functions | 27 | Active |
| SQL Functions | 20+ | Mixed |
| SQL Triggers | 8 | Active |
| RPC Calls | 23 | In Use |
| NestJS Modules Needed | 15+ | Proposed |
| Countries Supported | 3 | MA, FR, Default |
| Document Types | 4 | Quote, Invoice, PO, Report |
| Incomplete Features | 1 | Stock FIFO/LIFO |

---

## Risk Assessment

### HIGH RISK
1. Stock Valuation (FIFO/LIFO incomplete)
2. Financial Reports (complex aggregations)
3. Worker Payment (multiple calculation methods)

### MEDIUM RISK
1. Account Mapping (multi-country complexity)
2. Invoice Posting (critical financial logic)
3. Performance (uncached aggregations)

### LOW RISK
1. Number Generation (simple logic)
2. Farm Hierarchy (can stay in Supabase)
3. Basic Auth (reusable patterns)

---

## Estimated Effort & Timeline

- **Total Effort**: 3-4 weeks
- **Foundation**: 1-2 days
- **Accounting**: 5-7 days
- **Analytics**: 3-4 days
- **Workforce**: 2-3 days
- **Inventory**: 4-5 days
- **Testing & QA**: 3-5 days
- **Deployment**: 2-3 days

---

## Next Actions

1. Read BUSINESS_LOGIC_ANALYSIS.md (comprehensive, 1,272 lines)
2. Review MIGRATION_SUMMARY.md (executive summary)
3. Start Phase 1: NestJS foundation
4. Implement sequences service first (simple wins)
5. Progress to accounting (critical path)
6. Add comprehensive tests at each phase

---

## File Locations (For Reference)

```
Key Analysis Files:
  /BUSINESS_LOGIC_ANALYSIS.md (46 KB)
  /MIGRATION_SUMMARY.md (9 KB)
  /QUICK_REFERENCE.md (this file)

Schema & Functions:
  /project/supabase/migrations/00000000000000_schema.sql

Edge Functions:
  /project/supabase/functions/create-invoice/index.ts
  /project/supabase/functions/post-invoice/index.ts
  /project/supabase/functions/allocate-payment/index.ts
  /project/supabase/functions/generate-financial-report/index.ts
  ... (23 more)

Shared Logic:
  /project/supabase/functions/_shared/ledger.ts (double-entry logic)
  /project/supabase/functions/_shared/auth.ts (auth helpers)

Frontend Integration:
  /project/src/lib/accounting-api.ts
  /project/src/lib/invoice-service.ts
  /project/src/hooks/usePayments.ts
  /project/src/hooks/useProductionIntelligence.ts
  ... (18+ more)

Existing Backend:
  /backend-service/app/api/billing.py (PDF generation)
  /backend-service/app/services/earth_engine.py (GEE integration)
```

