# AgriTech Platform - Business Logic Migration Summary

**Generated**: November 21, 2025
**Analysis Location**: `/BUSINESS_LOGIC_ANALYSIS.md`

## Quick Reference: What Needs Migration

### Critical (Do First)
- **4 Edge Functions**: create-invoice, post-invoice, allocate-payment, generate-financial-report
- **2 SQL Triggers**: create_cost_journal_entry, create_revenue_journal_entry
- **1 Incomplete Feature**: Stock management (FIFO/LIFO not implemented)

### High Priority
- **3 Edge Functions**: farm-analytics, yield-prediction, task-assignment
- **4 RPC Calls**: Worker payment calculations (daily, fixed, metayage, deductions)
- **1 SQL Function**: process_stock_entry_posting (incomplete)

### Medium Priority
- **7 RPC Calls**: Number generation (quote, invoice, PO, sales order, etc.)
- **Farm hierarchy operations**: get_farm_hierarchy_tree, organizational data
- **3 Edge Functions**: Crop planning, irrigation scheduling, parcel reports

## Files to Review

### Primary Analysis
**File**: `/Users/boutchaz/Documents/CodeLovers/agritech/BUSINESS_LOGIC_ANALYSIS.md`
- 1,272 lines of detailed analysis
- All 27 Edge Functions documented
- All 20+ SQL functions described
- 23 RPC calls mapped
- Complete NestJS module structure proposed

### Schema Files
**Location**: `/project/supabase/migrations/00000000000000_schema.sql`
- Lines 28: update_updated_at_column() 
- Lines 1307-1423: Number generation functions (7 total)
- Lines 1502-1577: get_farm_hierarchy_tree()
- Lines 1578-1614: has_valid_subscription()
- Lines 1615-1713: get_parcel_performance_summary()
- Lines 1871+: Authorization functions
- Lines 3114: generate_item_code()
- Lines 4801-5009: process_stock_entry_posting() - INCOMPLETE
- Lines 7250+: Chart of accounts seeding (3 variants)
- Lines 7834-8069: Account mapping, journal trigger functions

### Edge Functions
**Location**: `/project/supabase/functions/`
- 27 directories with Deno/TypeScript implementations
- Key files for migration: create-invoice, post-invoice, allocate-payment, generate-financial-report

### Backend Service (Existing)
**Location**: `/backend-service/`
- Already has FastAPI + Google Earth Engine integration
- Already has PDF generation
- Already has satellite data management
- Could be migrated to NestJS alongside accounting module

### Frontend RPC Usage
**Locations with RPC calls**:
- `/src/hooks/useQuotes.ts` - Quote number generation
- `/src/hooks/usePayments.ts` - Worker payment calculations
- `/src/hooks/useProductionIntelligence.ts` - Performance summaries
- `/src/lib/accounting-api.ts` - Invoice/payment numbers
- And 17 more files (see BUSINESS_LOGIC_ANALYSIS.md)

## Implementation Roadmap

### Week 1-2: Foundation Phase
```
Create NestJS Backend Project
├── Sequences Service (consolidate 7 number generators)
├── Accounts Service (account lookup + multi-country mapping)
├── Database Layer (Supabase client)
├── Auth Middleware (JWT + API keys)
└── Testing Framework (Jest)
```

### Week 2-3: Accounting Phase
```
Critical Accounting Logic
├── Invoice Service (create, validate, posting)
├── Journal Entry Service (double-entry validation)
├── Payment Allocation Service
├── Financial Reports Service (Balance Sheet, P&L, Trial Balance)
└── Test: End-to-end invoice → post → payment flow
```

### Week 3-4: Production Intelligence Phase
```
Analytics & Reporting
├── Parcel Performance Summary Service (from get_parcel_performance_summary RPC)
├── Farm Analytics Service
├── Yield Prediction Wrapper
├── Cache Layer (Redis for expensive aggregations)
└── Test: Performance summary calculations
```

### Week 4-5: Workforce Phase
```
Worker Management
├── Task Assignment Service (skill matching algorithm)
├── Worker Payment Calculator (daily, fixed, metayage)
├── Worker Availability Service
├── Advance/Deduction Tracking
└── Test: Various payment calculation scenarios
```

### Week 5-6: Inventory Phase
```
Stock Management (Currently Incomplete)
├── Stock Entry Service (Material Receipt/Issue/Transfer)
├── FIFO/LIFO Calculator (MISSING IN CURRENT SUPABASE)
├── Stock Valuation Service
├── Stock Movement Tracking
└── Test: FIFO/LIFO cost calculations
```

## Critical Business Logic Found

### Double-Entry Bookkeeping
- **Files**: `/project/supabase/functions/_shared/ledger.ts`
- **Functions**: buildInvoiceLedgerLines(), buildPaymentLedgerLines()
- **Logic**: Ensures DR = CR for all journal entries
- **Validation**: Currency rounding, account existence checks

### Multi-Country Accounting
- **Table**: `account_mappings` (country_code, accounting_standard)
- **Mapping Types**: cost_type, revenue_type, cash
- **Supported Countries**: Morocco, France, Standard (IFRS)
- **Function**: get_account_id_by_mapping()

### Performance Rating Algorithm
- **Location**: Lines 1615-1713 in schema.sql
- **Metric**: `(actual_yield - estimated_yield) / estimated_yield * 100`
- **Ratings**: excellent (>=10%), good (>=0%), acceptable (>=-10%), poor (<-10%)
- **Used By**: Production dashboard, farm analytics

### Stock Valuation (Incomplete)
- **Issue**: FIFO/LIFO logic marked as TODO
- **Current**: Basic stock_movements and stock_valuation tables exist
- **Missing**: Cost consumption algorithm for material issues
- **Impact**: Inventory cost accuracy is compromised

### Worker Payment Methods
- **Daily Rate**: `hours_worked * hourly_rate`
- **Fixed Salary**: `monthly_salary / working_days_in_period`
- **Metayage (Profit Share)**: `harvest_qty * unit_price * percentage`
- **Deductions**: Track advances, loans, and deductions over time

## Key Metrics from Analysis

| Metric | Count |
|--------|-------|
| Total Edge Functions | 27 |
| SQL Functions | 20+ |
| SQL Triggers | 8 |
| RPC Calls in Frontend | 23 |
| Lines of Accounting Logic | ~500+ |
| Incomplete Features | 1 (Stock FIFO/LIFO) |
| Countries Supported | 3 (Morocco, France, Default) |
| Document Types Generated | 4 (Quote, Invoice, PO, Reports) |

## Risk Assessment

### High Risk Items
1. **Stock Valuation Migration**: Complex FIFO/LIFO logic not yet implemented
2. **Financial Report Generation**: Complex aggregations need caching
3. **Worker Payment Calculations**: Multiple payment methods need testing

### Medium Risk Items
1. **Account Mapping System**: Multi-country support adds complexity
2. **Invoice Posting**: Double-entry validation is critical
3. **Performance**: Aggregation queries currently uncached

### Low Risk Items
1. **Number Generation**: Simple consolidation
2. **Authentication**: Can reuse existing patterns
3. **Farm Hierarchy**: Can remain in Supabase if needed

## Cost-Benefit Summary

### Estimated Effort
- **Foundation**: 1-2 days
- **Accounting (Critical)**: 5-7 days
- **Production Intelligence**: 3-4 days
- **Workforce Management**: 2-3 days
- **Stock Management**: 4-5 days
- **Testing & QA**: 3-5 days
- **Deployment**: 2-3 days
- **Total**: 3-4 weeks

### Expected Benefits
- Better error handling and transactions
- Improved testability and maintainability
- Caching opportunities for expensive aggregations
- Cleaner separation of concerns
- Easier to extend with new features
- Reduced reliance on Supabase Edge Function costs

## Next Steps

1. **Read Full Analysis**: Review `/BUSINESS_LOGIC_ANALYSIS.md` (1,272 lines)
2. **Setup NestJS Project**: Create new backend directory structure
3. **Start with Sequences**: Migrate simple number generation first
4. **Progress to Accounting**: Implement invoice + journal entry logic
5. **Add Tests**: Unit tests for all critical business logic
6. **Parallel Execution**: Run old and new systems side-by-side during transition
7. **Feature Flags**: Gate migration by organization for gradual rollout

## Key Files Identified

### Analysis Reports
- `/BUSINESS_LOGIC_ANALYSIS.md` - Complete 1,272-line analysis
- `/MIGRATION_SUMMARY.md` - This file

### Implementation Examples
- `/project/supabase/functions/_shared/ledger.ts` - Double-entry logic reference
- `/project/supabase/functions/post-invoice/index.ts` - Invoice posting example
- `/project/supabase/functions/allocate-payment/index.ts` - Payment allocation example
- `/backend-service/app/api/billing.py` - Existing PDF generation service

### Database Schema
- `/project/supabase/migrations/00000000000000_schema.sql` - All functions & tables

### Frontend Usage
- `/src/lib/accounting-api.ts` - Accounting operations
- `/src/hooks/usePayments.ts` - Payment operations
- `/src/hooks/useProductionIntelligence.ts` - Analytics operations

---

## Conclusion

The AgriTech platform has **substantial, well-documented business logic** suitable for migration to a dedicated NestJS backend service. The analysis has identified all critical paths, dependencies, and implementation requirements.

**Recommendation**: Begin with Phase 1 (Foundation) immediately, focusing on establishing proper architecture and testing framework before moving to critical accounting logic.

**Timeline**: 3-4 weeks to complete all phases
**Risk Level**: Medium (stock valuation is incomplete in current implementation)
**Priority**: Critical for business compliance (accounting) and feature completeness (stock management)

