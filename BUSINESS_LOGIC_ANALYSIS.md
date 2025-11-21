# AgriTech Platform - Complex Business Logic Analysis Report

**Analysis Date**: November 21, 2025
**Codebase**: /Users/boutchaz/Documents/CodeLovers/agritech
**Target**: Identifying Supabase business logic for migration to dedicated backend service

---

## Executive Summary

The AgriTech platform currently implements substantial business logic across multiple layers:
- **27 Supabase Edge Functions** handling complex workflows
- **20+ SQL functions and triggers** in PostgreSQL
- **23 RPC calls** from frontend to Supabase
- **Limited backend service** with focus on satellite analysis and PDF generation

This analysis identifies candidates for migration to a NestJS-based REST API to improve maintainability, scalability, and separation of concerns.

---

## Part 1: Supabase Edge Functions (27 Total)

### 1.1 Accounting & Billing Functions (High Priority - Business Critical)

| Function | Purpose | Complexity | Status | Priority |
|----------|---------|-----------|--------|----------|
| **create-invoice** | Create invoices with automatic tax calculation and journal entry creation | HIGH | Active | CRITICAL |
| **post-invoice** | Post invoices and create double-entry bookkeeping journal entries | HIGH | Active | CRITICAL |
| **allocate-payment** | Allocate payments to invoices and create payment journal entries | HIGH | Active | CRITICAL |
| **generate-financial-report** | Generate balance sheet, P&L, trial balance, and general ledger reports | HIGH | Active | CRITICAL |

#### Key Business Logic:
- **Double-entry bookkeeping validation**: Ensures debits = credits
- **Multi-country accounting**: Uses account mappings for different countries (Morocco, France, standard)
- **Tax handling**: Automatic tax calculation and posting to separate accounts
- **Payment allocation**: Complex logic to match payments to invoices and update outstanding amounts
- **Financial reporting**: Complex aggregations across journal entries with cost center filtering

#### Migration Impact:
```
RECOMMENDATION: MIGRATE TO NESTJS IMMEDIATELY
- Current implementation lacks transaction support in Edge Functions
- Tax calculation logic mixed with API logic
- Account mapping system needs proper service layer
- Financial report generation requires complex queries that benefit from caching
```

### 1.2 Production Intelligence & Analytics (High Priority)

| Function | Purpose | Complexity | Status | Priority |
|----------|---------|-----------|--------|----------|
| **farm-analytics** | Aggregate farm performance metrics with trends and alerts | HIGH | Active | HIGH |
| **yield-prediction** | ML-based yield prediction using historical, weather, and satellite data | MEDIUM | Active | HIGH |
| **generate-parcel-report** | Generate parcel analysis reports (PDF) with metrics | MEDIUM | Active | MEDIUM |

#### Key Business Logic:
- **Performance aggregation**: Multiple queries across farms, parcels, crops, harvests
- **Yield calculations**: Variance from target yield, profit margins, efficiency ratios
- **Trend analysis**: Yield trends, cost trends, profit trends (increasing/decreasing/stable)
- **Recommendations engine**: Generates farm improvement recommendations
- **Risk analysis**: Identifies risk factors and alerts

#### Example from yield-prediction:
```typescript
// Gets historical yields (5 last records)
// Calculates soil health metrics
// Analyzes weather impact
// Predicts seasonal forecast
// Generates recommendations and risk factors
```

#### Migration Impact:
```
RECOMMENDATION: MIGRATE TO NESTJS
- Complex multi-step data aggregation
- Recommendations engine should be a dedicated service
- Time-series analysis benefits from dedicated service layer
- Caching opportunities for historical analysis
```

### 1.3 Workforce Management (Medium Priority)

| Function | Purpose | Complexity | Status | Priority |
|----------|---------|-----------|--------|----------|
| **task-assignment** | Intelligent task assignment based on worker skills, availability, and capacity | HIGH | Active | MEDIUM |
| **recommendations** | Worker recommendations for tasks (incomplete) | MEDIUM | Active | LOW |

#### Key Business Logic:
- **Worker skill matching**: Matches task requirements to worker capabilities
- **Availability checking**: Queries work_records to determine availability
- **Scoring algorithm**: Assigns scores to alternative workers
- **Equipment matching**: Considers equipment availability
- **Priority-based scheduling**: Factors in task priority levels

#### Migration Impact:
```
RECOMMENDATION: MIGRATE TASK ASSIGNMENT LOGIC
- Assignment scoring algorithm should be testable
- Availability calculation is repeated logic
- Should include queue management system
```

### 1.4 Satellite & Environmental Analysis (Medium Priority)

| Function | Purpose | Complexity | Status | Priority |
|----------|---------|-----------|--------|----------|
| **generate-index-image** | Generate vegetation index heatmaps and visualizations | MEDIUM | Active | MEDIUM |
| **crop-planning** | Suggest crop plans based on soil, climate, rotation, and market value | MEDIUM | Active | MEDIUM |
| **irrigation-scheduling** | Recommend irrigation schedules based on weather and soil data | MEDIUM | Active | MEDIUM |

#### Key Business Logic:
- **Crop rotation analysis**: Analyzes historical crop data (3+ years)
- **Soil suitability scoring**: Maps soil properties to crop requirements
- **Market value assessment**: Considers crop market prices
- **Irrigation optimization**: Calculates water needs based on soil moisture and weather
- **Seasonal recommendations**: Suggests planting and harvest dates

#### Migration Impact:
```
RECOMMENDATION: PARTIAL MIGRATION
- Index image generation (satellite visualization) → Already in backend-service
- Crop planning algorithm → Migrate to NestJS for better testability
- Irrigation scheduling → Migrate for data consistency
```

### 1.5 Data Management & Lifecycle (Medium Priority)

| Function | Purpose | Complexity | Status | Priority |
|----------|---------|-----------|--------|----------|
| **delete-farm** | Safely delete farm with cascade and subscription validation | MEDIUM | Active | MEDIUM |
| **delete-parcel** | Safely delete parcel with data cleanup | MEDIUM | Active | MEDIUM |
| **export-farm** | Export farm data (JSON backup) | MEDIUM | Active | LOW |
| **import-farm** | Import farm data from backup | MEDIUM | Active | LOW |

#### Key Business Logic:
- **Subscription validation**: Checks if org has active subscription before deletion
- **Cascade cleanup**: Ensures related data is properly cleaned up
- **Data export format**: Converts database records to portable JSON
- **Data import validation**: Validates imported data structure and relationships

### 1.6 Authentication & Authorization (Low-Medium Priority)

| Function | Purpose | Complexity | Status | Priority |
|----------|---------|-----------|--------|----------|
| **on-user-created** | Auto-trigger on auth user creation | LOW | Active | LOW |
| **user-auth-data** | Retrieve user profile and auth context | LOW | Active | LOW |
| **grant-worker-access** | Grant specific farm access to workers | LOW | Active | LOW |
| **invite-user** | Send user invitations with role assignment | MEDIUM | Active | MEDIUM |
| **check-subscription** | Verify subscription status and features | LOW | Active | LOW |

### 1.7 E-commerce & Subscriptions (Low Priority)

| Function | Purpose | Complexity | Status | Priority |
|----------|---------|-----------|--------|----------|
| **create-trial-subscription** | Create trial subscription via Polar.sh | LOW | Active | LOW |
| **polar-webhook** | Handle Polar.sh webhook events | LOW | Active | LOW |

### 1.8 Document Generation (Low-Medium Priority)

| Function | Purpose | Complexity | Status | Priority |
|----------|---------|-----------|--------|----------|
| **generate-quote-pdf** | Generate quote PDF documents | MEDIUM | Active | MEDIUM |

**Note**: This is already implemented in backend-service at `/app/api/billing.py`

### 1.9 Sensor Data Integration (Stub)

| Function | Purpose | Complexity | Status | Priority |
|----------|---------|-----------|--------|----------|
| **sensor-data** | IoT sensor data ingestion endpoint | LOW | Stub | LOW |

---

## Part 2: Complex SQL Functions & Triggers

### 2.1 Number Generation Functions (Foundational)

```sql
-- Location: schema.sql lines 1307-1423
generate_quote_number()              -- Format: QT-2025-00001
generate_sales_order_number()        -- Format: SO-2025-00001
generate_purchase_order_number()     -- Format: PO-2025-00001
generate_stock_entry_number()        -- Format: SE-2025-00001
generate_invoice_number()            -- Format: INV-2025-00001 (by type)
generate_journal_entry_number()      -- Format: JE-20251121-000001
```

**Migration Impact**: These should be migrated to NestJS sequence service
- Current implementation is simple but scattered
- Should be consolidated into single sequence service
- Easier to test and maintain in NestJS

### 2.2 Accounting Functions (Business Critical)

#### get_account_id_by_code(p_org_id, p_code) → UUID
- Simple lookup by account code within organization
- Used by: post-invoice, allocate-payment functions

#### get_account_id_by_mapping(p_org_id, p_mapping_type, p_mapping_key) → UUID
- Maps business concepts (cost_type, revenue_type) to Chart of Accounts
- Supports multi-country accounting (Morocco, France, standard)
- Critical for automated journal entry creation

**Mapping Types**:
- `cost_type` → Maps "labor", "fertilizer", etc. to expense accounts
- `revenue_type` → Maps harvest sales, services to revenue accounts
- `cash` → Maps bank accounts to cash/bank GL accounts

**Migration Impact**:
```
RECOMMENDATION: MIGRATE WITH HIGH PRIORITY
- Account mapping system should be own service
- Cache account mappings for performance
- Simplify account resolution in invoice posting
```

#### create_cost_journal_entry() TRIGGER
- Automatic journal entry creation when cost inserted
- Debits expense account, credits cash account
- Uses account mapping system

#### create_revenue_journal_entry() TRIGGER
- Automatic journal entry creation when revenue inserted
- Debits cash account, credits revenue account
- Uses account mapping system

**Migration Impact**: Triggers should become explicit business logic in REST API

### 2.3 Stock Management Functions (Complex)

#### process_stock_entry_posting() TRIGGER
**Location**: Lines 4801-5009 (~200 lines of complex SQL)

**Purpose**: Manage inventory when stock entry changes to "Posted" status

**Logic**:
```sql
CASE entry_type:
  - Material Receipt: Add to target warehouse (stock_movements + stock_valuation)
  - Material Issue: Remove from source warehouse
  - Stock Transfer: OUT from source, IN to target
  - Stock Reconciliation: Reconciliation movement
```

**Complexity**:
- Creates stock movement records
- Updates stock valuation with cost tracking
- Handles batch/serial numbers
- TODO comment: "Consume from stock valuation (FIFO/LIFO logic)" - NOT YET IMPLEMENTED

**Migration Impact**:
```
RECOMMENDATION: MIGRATE IMMEDIATELY - INCOMPLETE IMPLEMENTATION
- Stock consumption logic incomplete (FIFO/LIFO not implemented)
- Valuation updates need better error handling
- Cost accounting integration incomplete
- Should be explicit service rather than trigger
```

### 2.4 Hierarchical Data Functions (Analytical)

#### get_farm_hierarchy_tree(org_uuid, root_farm_id)
**Location**: Lines 1502-1577

**Returns**: Hierarchical view of farms, parcels, and sub-parcels with counts

**Complexity**:
- Recursive query pattern (though simplified for current schema)
- Counts parcels and sub-parcels per farm
- Maps manager names
- Supports filtering to specific farm subtree

**Used by**: FarmHierarchy components, FarmHierarchyManager

**Migration Impact**: MEDIUM - Can stay as SQL VIEW or migrate to REST endpoint with caching

### 2.5 Performance Analytics Functions (High Complexity)

#### get_parcel_performance_summary()
**Location**: Lines 1615-1713 (~100 lines)

**Purpose**: Production intelligence - aggregates harvest data with financial metrics

**Returns** (per parcel):
```
- parcel_id, farm_name, crop_type
- total_harvests, avg_yield_per_hectare, avg_target_yield
- avg_variance_percent (actual vs. estimated yield)
- performance_rating (excellent/good/acceptable/poor)
- total_revenue, total_cost, total_profit
- avg_profit_margin
- last_harvest_date
```

**Business Logic**:
```sql
WITH harvest_stats AS (
  SELECT
    hr.parcel_id,
    COUNT(*) as total_harvests,
    AVG(CASE WHEN p.area_hectares > 0 THEN hr.actual_yield / p.area_hectares ELSE NULL END) as avg_yield_per_hectare,
    AVG(hr.estimated_yield) as avg_target_yield,
    AVG(CASE WHEN hr.estimated_yield > 0 
      THEN ((hr.actual_yield - hr.estimated_yield) / hr.estimated_yield * 100)
      ELSE NULL END) as avg_variance_percent,
    SUM(COALESCE(hr.revenue_amount, 0)) as total_revenue,
    SUM(COALESCE(hr.cost_amount, 0)) as total_cost,
    SUM(COALESCE(hr.profit_amount, 0)) as total_profit,
    MAX(hr.harvest_date) as last_harvest_date
  FROM harvest_records hr
  JOIN parcels p ON hr.parcel_id = p.id
  JOIN farms f ON p.farm_id = f.id
  WHERE hr.organization_id = p_organization_id
    AND (p_farm_id IS NULL OR p.farm_id = p_farm_id)
    AND (p_parcel_id IS NULL OR hr.parcel_id = p_parcel_id)
    AND (p_from_date IS NULL OR hr.harvest_date >= p_from_date)
    AND (p_to_date IS NULL OR hr.harvest_date <= p_to_date)
  GROUP BY hr.parcel_id, p.parcel_name, f.farm_name, hr.crop_type
)
```

**Performance Rating Logic**:
```
avg_variance_percent >= 10%   → excellent
avg_variance_percent >= 0%    → good
avg_variance_percent >= -10%  → acceptable
avg_variance_percent < -10%   → poor
```

**Used by**: ProductionIntelligence component, farm analytics dashboard

**Migration Impact**:
```
RECOMMENDATION: MIGRATE TO NESTJS - HIGH PRIORITY
- Complex aggregation logic should be cached
- Performance ratings could drive dashboards and alerts
- Should support real-time updates to dashboard
- Currently tied to harvest data updates
```

---

## Part 3: RPC Calls from Frontend (23 Total)

### 3.1 Sequence Generation (Foundational)

**RPC Calls**:
```
generate_quote_number(p_organization_id)
generate_sales_order_number(p_organization_id)
generate_purchase_order_number(p_organization_id)
generate_stock_entry_number(p_organization_id)
generate_invoice_number(p_organization_id, p_invoice_type)
generate_journal_entry_number(p_organization_id)
generate_payment_number(p_organization_id)
```

**Files**:
- `/src/hooks/useQuotes.ts`
- `/src/hooks/usePurchaseOrders.ts`
- `/src/hooks/useStockEntries.ts`
- `/src/lib/accounting-api.ts`
- `/src/lib/invoice-service.ts`

**Current Pattern**:
```typescript
const { data: invoiceNumber, error } = await supabase.rpc('generate_invoice_number', {
  p_organization_id: organizationId,
  p_invoice_type: invoiceType
});
```

**Migration Recommendation**: HIGH
- Consolidate into single REST endpoint: `POST /sequences/next/{entityType}`
- Response: `{ sequence: "INV-2025-00001", timestamp: "..." }`

### 3.2 Organizational Hierarchy (Medium Priority)

**RPC Calls**:
```
get_farm_hierarchy_tree(org_uuid, root_farm_id)
get_organization_farms(p_organization_id)
get_user_farm_roles(p_user_uuid)
create_organization_with_farm(org_data, farm_data)
create_sub_farm(parent_farm_id, farm_data)
```

**Files**:
- `/src/components/FarmHierarchy/ModernFarmHierarchy.tsx`
- `/src/components/FarmHierarchyManager.tsx`
- `/src/components/FarmHierarchyTree.tsx`
- `/src/components/OnboardingFlow.tsx`

**Usage Pattern**:
```typescript
const { data, error } = await supabase.rpc('get_farm_hierarchy_tree', {
  org_uuid: organizationId,
  root_farm_id: selectedFarm?.id || null
});
```

**Migration Recommendation**: MEDIUM
- These could stay in Supabase or become GraphQL queries
- Keep in Supabase if real-time updates via subscriptions are important
- Migrate to REST if better caching needed

### 3.3 Worker & Task Management (Medium Priority)

**RPC Calls**:
```
get_worker_availability(p_farm_id, p_date)
assign_farm_role(user_id, farm_id, role)
get_user_tasks(user_uuid)
calculate_daily_worker_payment(worker_id, work_date, hours_worked, rate)
calculate_fixed_salary_payment(worker_id, salary_period)
calculate_metayage_share(harvest_id, metayage_percentage)
get_worker_advance_deductions(worker_id)
```

**Files**:
- `/src/hooks/useTasks.ts`
- `/src/hooks/useWorkers.ts`
- `/src/hooks/usePayments.ts`
- `/src/components/FarmRoleManager.tsx`

**Migration Recommendation**: HIGH
- Worker payments are critical business logic
- Currently in DB, should be service with proper calculations
- Supports: daily rates, fixed salary, metayage (profit share), advances/deductions
- Recommendation: `POST /payments/calculate-worker-payment`

### 3.4 Production Management (High Priority)

**RPC Calls**:
```
get_parcel_performance_summary(organization_id, farm_id, parcel_id, from_date, to_date)
get_harvest_statistics(parcel_id, crop_id, from_date, to_date)
post_opening_stock_balance(warehouse_id, opening_date, items)
create_material_receipt_from_po(purchase_order_id)
```

**Files**:
- `/src/hooks/useProductionIntelligence.ts`
- `/src/hooks/useHarvests.ts`
- `/src/hooks/useOpeningStock.ts`
- `/src/components/Billing/PurchaseOrderDetailDialog.tsx`

**Usage Pattern**:
```typescript
const { data, error } = await supabase.rpc('get_parcel_performance_summary', {
  p_organization_id: organizationId,
  p_farm_id: farmId || null,
  p_parcel_id: parcelId || null,
  p_from_date: dateRange?.from || null,
  p_to_date: dateRange?.to || null
});
```

**Migration Recommendation**: HIGH
- Production intelligence is dashboard-critical
- Benefits from caching and real-time subscriptions
- Consider hybrid: Supabase for real-time updates, NestJS for aggregations

### 3.5 Seed Data Operations (Low Priority)

**RPC Calls**:
```
seed_default_work_units(p_organization_id)
seed_chart_of_accounts(p_org_id)  [multiple implementations]
```

**Files**:
- `/src/components/settings/WorkUnitManagement.tsx`
- `/src/lib/seed-chart-of-accounts.ts`

**Migration Recommendation**: LOW
- Seed operations are infrequent
- Could be moved to backend, but not critical path
- Keep in Supabase if onboarding flow needs to be fast

### 3.6 Stock & Item Management (Medium Priority)

**RPC Calls**:
```
generate_item_code(organization_id, category)
post_opening_stock_balance(warehouse_id, opening_date, items)
```

**Files**:
- `/src/hooks/useItems.ts`
- `/src/hooks/useOpeningStock.ts`
- `/src/hooks/useReceptionBatches.ts`

**Migration Recommendation**: MEDIUM
- Item code generation → Migrate to sequences service
- Opening stock posting → Keep in Supabase (rare operation)

---

## Part 4: Backend Service Current State

### 4.1 Existing Architecture

**Location**: `/Users/boutchaz/Documents/CodeLovers/agritech/backend-service`

**Framework**: FastAPI (Python)

**Current Modules**:
```
app/
├── api/
│   ├── health.py              # Health checks
│   ├── indices.py             # Satellite indices calculation (15KB)
│   ├── analysis.py            # Satellite analysis (15KB)
│   ├── supabase.py            # Supabase data access (14KB)
│   └── billing.py             # PDF generation (12KB)
├── core/
│   ├── config.py              # Configuration
│   └── supabase_client.py      # Supabase client setup
├── middleware/
│   └── auth.py                # Authentication
├── models/
│   └── schemas.py             # Pydantic models
└── services/
    ├── earth_engine.py        # Google Earth Engine integration (45KB)
    ├── supabase_service.py    # Supabase service layer
    ├── cloud_masking.py       # Cloud detection/masking
    └── pdf/                   # PDF generation service
```

**Current API Endpoints**:
```
POST /api/indices/calculate              # Vegetation indices
POST /api/indices/timeseries             # Time series data
POST /api/indices/heatmap                # Heatmap visualization
POST /api/analysis/statistics            # Statistical analysis
GET  /api/supabase/organizations/{id}/farms
GET  /api/supabase/farms/{id}/parcels
GET  /api/supabase/parcels/{id}/satellite-data
POST /api/supabase/cloud-coverage/check
GET  /api/billing/quotes/{id}/pdf
GET  /api/billing/invoices/{id}/pdf
```

### 4.2 What's Already Migrated

✅ **Satellite Analysis**:
- Vegetation indices calculation (12+ indices)
- Time series analysis
- Interactive heatmaps
- Cloud masking and coverage checking

✅ **Document Generation**:
- Quote PDF generation
- Invoice PDF generation
- Custom template support

✅ **Satellite Data Management**:
- GeoTIFF export
- Batch processing support
- Real-time processing status tracking

### 4.3 What's Still in Supabase

❌ **Accounting (CRITICAL)**:
- Invoice creation and posting
- Payment allocation and journal entries
- Financial reporting (Balance Sheet, P&L, Trial Balance)
- Account mapping system

❌ **Production Intelligence**:
- Parcel performance summaries
- Farm analytics aggregation
- Yield predictions

❌ **Workflow Management**:
- Task assignment with skill matching
- Worker payment calculations
- Worker availability tracking

❌ **Inventory Management**:
- Stock entry posting with FIFO/LIFO (INCOMPLETE)
- Stock movement tracking
- Item code generation

---

## Part 5: Migration Recommendations

### 5.1 Priority Matrix

```
┌─────────────────────────────────────────────────────────┐
│ PRIORITY │ CATEGORY          │ FUNCTIONS COUNT          │
├─────────────────────────────────────────────────────────┤
│ CRITICAL │ Accounting        │ 4 Edge Fns + 2 Triggers  │
│ CRITICAL │ Financial Reports │ 1 Edge Fn                │
│ CRITICAL │ Stock Management  │ 1 Trigger (incomplete)   │
├─────────────────────────────────────────────────────────┤
│ HIGH     │ Production Intel  │ 3 Edge Fns + 1 RPC       │
│ HIGH     │ Worker Payments   │ 4 RPC calls              │
│ HIGH     │ Task Assignment   │ 1 Edge Fn                │
├─────────────────────────────────────────────────────────┤
│ MEDIUM   │ Crop Planning     │ 1 Edge Fn                │
│ MEDIUM   │ Farm Hierarchy    │ 1 RPC + views            │
│ MEDIUM   │ Item Generation   │ Sequence service         │
├─────────────────────────────────────────────────────────┤
│ LOW      │ Auth/Subscription │ 2-3 Edge Fns             │
│ LOW      │ Data Import/Export│ 2 Edge Fns               │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Phased Migration Plan

#### Phase 1: Foundation (Week 1-2)
**Goal**: Establish backend service architecture

**Tasks**:
1. Create NestJS project structure
2. Setup database connection layer
3. Implement sequence service (consolidate all number generators)
4. Implement account mapping service
5. Setup testing framework

**Modules to Create**:
- `sequences/` - All document number generation
- `accounts/` - Account lookup and mapping
- `common/` - Shared utilities, validators
- `auth/` - Auth middleware (reuse from FastAPI)

#### Phase 2: Accounting (Week 2-3)
**Goal**: Migrate critical accounting logic

**Tasks**:
1. Implement invoice service with double-entry bookkeeping
2. Implement payment allocation service
3. Implement financial reporting service
4. Create account mapping configuration system
5. Migrate `create-invoice`, `post-invoice`, `allocate-payment` Edge Fns

**Modules to Create**:
- `invoices/` - Invoice creation and management
- `journal-entries/` - Journal entry posting and reporting
- `payments/` - Payment processing and allocation
- `financial-reports/` - Balance sheet, P&L, trial balance
- `account-mappings/` - Multi-country account mapping

**Endpoints**:
```
POST   /invoices
POST   /invoices/{id}/post
POST   /payments/{id}/allocate
GET    /financial-reports/{type}
GET    /accounts/mapping/{type}/{key}
POST   /sequences/next/{entityType}
```

#### Phase 3: Production Intelligence (Week 3-4)
**Goal**: Migrate analytics and performance tracking

**Tasks**:
1. Implement production intelligence service
2. Implement parcel performance aggregation
3. Implement yield prediction service (wrapper around Edge Fn)
4. Implement farm analytics aggregation
5. Add caching layer for expensive aggregations

**Modules to Create**:
- `production-intelligence/` - Performance summaries and analytics
- `harvests/` - Harvest record management
- `yield-prediction/` - Yield prediction wrapper
- `farm-analytics/` - Farm-level aggregations
- `cache/` - Redis caching for reports

**Endpoints**:
```
GET    /production-intelligence/parcel/{id}/performance
GET    /farm-analytics/{id}
POST   /yield-prediction/calculate
GET    /harvests/{id}/statistics
```

#### Phase 4: Workforce Management (Week 4-5)
**Goal**: Migrate worker and task management

**Tasks**:
1. Implement task assignment service
2. Implement worker payment calculation service
3. Implement worker availability service
4. Implement metayage calculation service

**Modules to Create**:
- `tasks/` - Task creation, assignment, tracking
- `workers/` - Worker profile and capability management
- `payments/` - Worker payment calculations and history
- `scheduling/` - Availability and scheduling

**Endpoints**:
```
POST   /tasks/assign
POST   /workers/{id}/calculate-payment
GET    /workers/{id}/availability/{date}
GET    /workers/{id}/advances-deductions
POST   /metayage/calculate/{harvest_id}
```

#### Phase 5: Inventory Management (Week 5-6)
**Goal**: Fix and migrate stock management

**Tasks**:
1. Implement proper stock entry service
2. Implement FIFO/LIFO cost method logic (currently missing)
3. Implement stock movement tracking
4. Implement valuation calculation
5. Implement opening stock management

**Modules to Create**:
- `stock-entries/` - Stock movement processing
- `stock-movements/` - Movement tracking
- `stock-valuation/` - FIFO/LIFO cost calculation
- `warehouses/` - Warehouse management

**Endpoints**:
```
POST   /stock-entries
POST   /stock-entries/{id}/post
GET    /stock-valuation/{item_id}
POST   /stock-entries/opening-balance
```

#### Phase 6: Optional Features (Week 6-7)
**Goal**: Migrate lower-priority functions

**Tasks**:
1. Crop planning recommendation service
2. Irrigation scheduling service
3. Import/export services
4. Remaining utility functions

---

## Part 6: Proposed NestJS Module Structure

```
backend/
├── src/
│   ├── main.ts                          # NestJS bootstrap
│   │
│   ├── modules/
│   │   ├── auth/                        # Authentication
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.guard.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── api-key.strategy.ts
│   │   │   └── decorators/
│   │   │       ├── user.decorator.ts
│   │   │       └── organization.decorator.ts
│   │   │
│   │   ├── common/                      # Shared utilities
│   │   │   ├── common.module.ts
│   │   │   ├── exceptions/
│   │   │   │   ├── business.exception.ts
│   │   │   │   ├── validation.exception.ts
│   │   │   │   └── database.exception.ts
│   │   │   ├── pipes/
│   │   │   │   └── validation.pipe.ts
│   │   │   ├── filters/
│   │   │   │   └── exception.filter.ts
│   │   │   ├── utils/
│   │   │   │   ├── logger.service.ts
│   │   │   │   ├── date.utils.ts
│   │   │   │   └── currency.utils.ts
│   │   │   └── constants/
│   │   │       ├── messages.ts
│   │   │       └── error-codes.ts
│   │   │
│   │   ├── database/                    # Database access
│   │   │   ├── database.module.ts
│   │   │   ├── supabase/
│   │   │   │   ├── supabase.service.ts
│   │   │   │   ├── supabase.config.ts
│   │   │   │   └── supabase.client.ts
│   │   │   ├── cache/                   # Redis caching
│   │   │   │   ├── cache.service.ts
│   │   │   │   ├── cache.decorator.ts
│   │   │   │   └── cache.config.ts
│   │   │   └── migrations/
│   │   │       └── /* SQL migrations */
│   │   │
│   │   ├── sequences/                   # Document number generation
│   │   │   ├── sequences.module.ts
│   │   │   ├── sequences.service.ts
│   │   │   ├── sequences.controller.ts
│   │   │   ├── entities/
│   │   │   │   └── sequence.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── next-sequence.request.ts
│   │   │   │   └── sequence.response.ts
│   │   │   └── tests/
│   │   │       └── sequences.service.spec.ts
│   │   │
│   │   ├── accounts/                    # Chart of Accounts & Mappings
│   │   │   ├── accounts.module.ts
│   │   │   ├── services/
│   │   │   │   ├── accounts.service.ts
│   │   │   │   └── account-mapping.service.ts
│   │   │   ├── controllers/
│   │   │   │   └── accounts.controller.ts
│   │   │   ├── entities/
│   │   │   │   ├── account.entity.ts
│   │   │   │   └── account-mapping.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── get-account-by-code.dto.ts
│   │   │   │   └── resolve-account.dto.ts
│   │   │   └── tests/
│   │   │       └── account-mapping.service.spec.ts
│   │   │
│   │   ├── invoices/                    # Invoice Management
│   │   │   ├── invoices.module.ts
│   │   │   ├── services/
│   │   │   │   ├── invoices.service.ts
│   │   │   │   ├── invoice-posting.service.ts
│   │   │   │   └── tax-calculator.service.ts
│   │   │   ├── controllers/
│   │   │   │   └── invoices.controller.ts
│   │   │   ├── entities/
│   │   │   │   ├── invoice.entity.ts
│   │   │   │   └── invoice-item.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-invoice.dto.ts
│   │   │   │   ├── post-invoice.dto.ts
│   │   │   │   └── invoice.response.ts
│   │   │   └── tests/
│   │   │       ├── invoices.service.spec.ts
│   │   │       └── invoice-posting.service.spec.ts
│   │   │
│   │   ├── journal-entries/            # Journal Entry Management
│   │   │   ├── journal-entries.module.ts
│   │   │   ├── services/
│   │   │   │   ├── journal-entries.service.ts
│   │   │   │   ├── journal-posting.service.ts
│   │   │   │   └── double-entry-validator.service.ts
│   │   │   ├── controllers/
│   │   │   │   └── journal-entries.controller.ts
│   │   │   ├── entities/
│   │   │   │   ├── journal-entry.entity.ts
│   │   │   │   └── journal-item.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-journal-entry.dto.ts
│   │   │   │   ├── post-journal-entry.dto.ts
│   │   │   │   └── journal-entry.response.ts
│   │   │   └── tests/
│   │   │       ├── journal-entries.service.spec.ts
│   │   │       └── double-entry-validator.service.spec.ts
│   │   │
│   │   ├── payments/                   # Payment Processing
│   │   │   ├── payments.module.ts
│   │   │   ├── services/
│   │   │   │   ├── payments.service.ts
│   │   │   │   ├── payment-allocation.service.ts
│   │   │   │   └── worker-payment.service.ts
│   │   │   ├── controllers/
│   │   │   │   └── payments.controller.ts
│   │   │   ├── entities/
│   │   │   │   ├── payment.entity.ts
│   │   │   │   └── payment-allocation.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── allocate-payment.dto.ts
│   │   │   │   ├── calculate-worker-payment.dto.ts
│   │   │   │   └── payment.response.ts
│   │   │   └── tests/
│   │   │       ├── payment-allocation.service.spec.ts
│   │   │       └── worker-payment.service.spec.ts
│   │   │
│   │   ├── financial-reports/         # Financial Reporting
│   │   │   ├── financial-reports.module.ts
│   │   │   ├── services/
│   │   │   │   ├── balance-sheet.service.ts
│   │   │   │   ├── profit-loss.service.ts
│   │   │   │   ├── trial-balance.service.ts
│   │   │   │   ├── general-ledger.service.ts
│   │   │   │   └── report-cache.service.ts
│   │   │   ├── controllers/
│   │   │   │   └── financial-reports.controller.ts
│   │   │   ├── dto/
│   │   │   │   ├── generate-report.dto.ts
│   │   │   │   └── report.response.ts
│   │   │   └── tests/
│   │   │       ├── balance-sheet.service.spec.ts
│   │   │       └── profit-loss.service.spec.ts
│   │   │
│   │   ├── production-intelligence/    # Farm Analytics
│   │   │   ├── production-intelligence.module.ts
│   │   │   ├── services/
│   │   │   │   ├── parcel-performance.service.ts
│   │   │   │   ├── farm-analytics.service.ts
│   │   │   │   ├── performance-aggregator.service.ts
│   │   │   │   └── yield-calculator.service.ts
│   │   │   ├── controllers/
│   │   │   │   └── production-intelligence.controller.ts
│   │   │   ├── dto/
│   │   │   │   ├── parcel-performance-summary.dto.ts
│   │   │   │   └── farm-analytics.dto.ts
│   │   │   └── tests/
│   │   │       └── parcel-performance.service.spec.ts
│   │   │
│   │   ├── harvests/                   # Harvest Management
│   │   │   ├── harvests.module.ts
│   │   │   ├── harvests.service.ts
│   │   │   ├── harvests.controller.ts
│   │   │   ├── entities/
│   │   │   │   └── harvest.entity.ts
│   │   │   └── dto/
│   │   │       └── harvest-statistics.dto.ts
│   │   │
│   │   ├── tasks/                      # Task Management
│   │   │   ├── tasks.module.ts
│   │   │   ├── services/
│   │   │   │   ├── tasks.service.ts
│   │   │   │   └── task-assignment.service.ts
│   │   │   ├── controllers/
│   │   │   │   └── tasks.controller.ts
│   │   │   ├── entities/
│   │   │   │   └── task.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── assign-task.dto.ts
│   │   │   │   └── task.response.ts
│   │   │   └── tests/
│   │   │       └── task-assignment.service.spec.ts
│   │   │
│   │   ├── workers/                    # Worker Management
│   │   │   ├── workers.module.ts
│   │   │   ├── services/
│   │   │   │   ├── workers.service.ts
│   │   │   │   ├── worker-payment-calculator.service.ts
│   │   │   │   ├── worker-availability.service.ts
│   │   │   │   └── metayage-calculator.service.ts
│   │   │   ├── controllers/
│   │   │   │   └── workers.controller.ts
│   │   │   ├── entities/
│   │   │   │   └── worker.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── calculate-payment.dto.ts
│   │   │   │   ├── check-availability.dto.ts
│   │   │   │   └── worker-payment.response.ts
│   │   │   └── tests/
│   │   │       ├── worker-payment-calculator.service.spec.ts
│   │   │       └── metayage-calculator.service.spec.ts
│   │   │
│   │   ├── stock-entries/              # Stock Management
│   │   │   ├── stock-entries.module.ts
│   │   │   ├── services/
│   │   │   │   ├── stock-entries.service.ts
│   │   │   │   ├── stock-posting.service.ts
│   │   │   │   ├── stock-movement.service.ts
│   │   │   │   ├── stock-valuation.service.ts
│   │   │   │   └── fifo-lifo-calculator.service.ts
│   │   │   ├── controllers/
│   │   │   │   └── stock-entries.controller.ts
│   │   │   ├── entities/
│   │   │   │   ├── stock-entry.entity.ts
│   │   │   │   ├── stock-movement.entity.ts
│   │   │   │   └── stock-valuation.entity.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-stock-entry.dto.ts
│   │   │   │   ├── post-stock-entry.dto.ts
│   │   │   │   └── stock-entry.response.ts
│   │   │   └── tests/
│   │   │       ├── stock-posting.service.spec.ts
│   │   │       └── fifo-lifo-calculator.service.spec.ts
│   │   │
│   │   └── health/                     # Health checks
│   │       ├── health.module.ts
│   │       ├── health.controller.ts
│   │       └── health.service.ts
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── cache.config.ts
│   │   └── validation.schema.ts
│   │
│   ├── app.module.ts
│   ├── app.controller.ts
│   └── app.service.ts
│
├── test/
│   ├── jest.config.js
│   ├── setup.ts
│   └── fixtures/
│       ├── test-data.ts
│       └── mock-services.ts
│
├── docs/
│   ├── api.md
│   ├── accounting-flows.md
│   ├── worker-payments.md
│   ├── database-schema.md
│   └── deployment.md
│
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── docker-compose.yml
│
├── .env.example
├── .env.example.docker
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

---

## Part 7: Critical Business Logic Implementation Details

### 7.1 Double-Entry Bookkeeping Validation

**Rule**: For every journal entry, `SUM(debit) = SUM(credit)`

**Current Implementation** (in `ledger.ts`):
```typescript
function buildInvoiceLedgerLines(invoice, entryId, accounts) {
  // For sales invoice:
  // DR: Accounts Receivable = grand_total
  // CR: Income Account = line_items total
  // CR: Tax Payable = tax_total
  // Validation: line_items + tax_total == grand_total
  
  if (roundCurrency(lineCredits) !== grandTotal) {
    throw new Error('Sales invoice debits and credits do not balance');
  }
}
```

**Recommendation**: Implement `DoubleEntryValidator` service in NestJS

### 7.2 Account Mapping System

**Problem**: Different countries use different Chart of Accounts (Morocco, France, Standard)

**Solution**: Multi-country mapping table
```
account_mappings {
  country_code: 'MA' | 'FR' | 'DEFAULT'
  accounting_standard: 'IFRS' | 'Local'
  mapping_type: 'cost_type' | 'revenue_type' | 'cash'
  mapping_key: 'labor' | 'harvest' | 'bank' | ...
  account_code: '5110' | '7010' | ...
}
```

**Recommendation**: Create `AccountMappingResolver` service

### 7.3 Stock Valuation Methods

**Current State**: FIFO/LIFO NOT IMPLEMENTED (marked as TODO)

**What's needed**:
1. FIFO (First In, First Out) - Oldest stock used first
2. LIFO (Last In, First Out) - Newest stock used first  
3. Weighted Average Cost

**Implementation**:
```typescript
// For material issue from warehouse
const valuationBatches = await stockValuation.findByItem(itemId, warehouseId);
// Sort by date (FIFO) or reverse date (LIFO)
// Consume stock batch by batch, calculate cost
// Update stock_valuation.remaining_quantity
```

### 7.4 Worker Payment Calculations

**Methods Supported**:
1. **Daily Rate**: `hours * hourly_rate`
2. **Fixed Salary**: `monthly_salary / working_days`
3. **Metayage (Profit Share)**: `harvest_quantity * unit_price * percentage`
4. **Advances & Deductions**: Track across time period

**Implementation Needed**:
```typescript
interface WorkerPaymentCalculation {
  worker_id: UUID;
  period_start: Date;
  period_end: Date;
  payment_method: 'daily' | 'salary' | 'metayage';
  gross_amount: number;
  advances: number;
  deductions: number;
  net_amount: number;
  breakdown: {
    daily_work?: { hours: number, rate: number, total: number }[];
    fixed_salary?: { amount: number };
    metayage_shares?: { harvest_id: UUID, amount: number }[];
  };
}
```

### 7.5 Performance Rating Logic

**Formula** (from get_parcel_performance_summary):
```
avg_variance = (actual_yield - estimated_yield) / estimated_yield * 100

IF avg_variance >= 10%    → 'excellent' (outperforming by 10%+)
IF avg_variance >= 0%     → 'good' (meeting/exceeding target)
IF avg_variance >= -10%   → 'acceptable' (within 10% below target)
IF avg_variance < -10%    → 'poor' (more than 10% below target)
```

---

## Part 8: Testing Strategy

### 8.1 Unit Tests

**Critical Services** (require >80% coverage):
```
- AccountMappingService
- DoubleEntryValidator
- InvoicePostingService
- PaymentAllocationService
- WorkerPaymentCalculator
- StockValuationService
- FIFOLIFOCalculator
```

**Example Test Suite**:
```typescript
describe('InvoicePostingService', () => {
  describe('createJournalEntry', () => {
    it('should balance debits and credits for sales invoice', async () => {
      const invoice = { invoice_type: 'sales', grand_total: 1000, items: [...] };
      const result = service.createJournalEntry(invoice);
      expect(result.total_debit).toBe(result.total_credit);
    });
    
    it('should post to correct accounts based on account mapping', async () => {
      // Verify AR account is used for sales, AP for purchases
    });
    
    it('should handle tax correctly', async () => {
      // Verify tax is posted to tax payable/receivable
    });
  });
});
```

### 8.2 Integration Tests

**Key Flows**:
1. Create Invoice → Post Invoice → Verify Journal Entries
2. Allocate Payment → Verify Invoice Outstanding Amount Updated
3. Post Stock Entry → Verify Stock Movement & Valuation
4. Calculate Worker Payment → Verify Deductions Applied

### 8.3 End-to-End Tests

**Scenarios**:
1. Sales invoice workflow (create → post → payment → allocation)
2. Inventory flow (opening stock → receipt → issue → valuation)
3. Worker payment flow (task completion → payment calculation → payment)

---

## Part 9: Deployment Strategy

### 9.1 Database Changes

**Migration Path**:
1. Add new tables in Supabase for NestJS-specific data
2. Create view/function compatibility layer
3. Update RLS policies for backend service
4. Run parallel tests with both Supabase functions and NestJS endpoints
5. Gradual cutover: feature flag by organization

### 9.2 Backwards Compatibility

**During Migration**:
```typescript
// Frontend routing
if (featureFlag.useNestJsAccounting) {
  POST /api/invoices (new)
} else {
  POST /functions/create-invoice (old)
}
```

### 9.3 Monitoring & Observability

**Required**:
- Request/response logging
- Business logic metrics (invoices/day, payments/day, etc.)
- Error tracking (Sentry)
- Performance monitoring (APM)
- Database query analysis

---

## Part 10: Cost-Benefit Analysis

### Benefits of Migration to NestJS

| Benefit | Impact |
|---------|--------|
| **Better Error Handling** | Transactions, rollbacks, consistent error responses |
| **Testability** | Unit/integration tests for business logic |
| **Performance** | Caching, query optimization, connection pooling |
| **Maintainability** | Cleaner code organization, less duplication |
| **Scalability** | Horizontal scaling, independent from Supabase limits |
| **Flexibility** | External API integrations, complex algorithms |
| **Cost Reduction** | Less reliance on expensive Edge Function invocations |

### Costs & Effort

| Component | Est. Effort | Risk |
|-----------|------------|------|
| Sequences Service | 1-2 days | LOW |
| Accounting Module | 5-7 days | MEDIUM |
| Production Intelligence | 3-4 days | LOW |
| Worker Payments | 2-3 days | MEDIUM |
| Stock Management | 4-5 days | HIGH |
| Testing | 3-5 days | LOW |
| Deployment & Cutover | 2-3 days | MEDIUM |
| **TOTAL** | **3-4 weeks** | **MEDIUM** |

---

## Recommendations Summary

### Immediate Actions (This Week)

1. **CREATE** NestJS backend service skeleton in `/backend` directory
2. **SETUP** database connection layer (Supabase client)
3. **IMPLEMENT** sequences service (consolidate all number generators)
4. **PLAN** detailed accounting module architecture

### Short Term (This Sprint)

1. **MIGRATE** accounting critical path (invoices, payments, GL)
2. **ADD** proper error handling and validation
3. **IMPLEMENT** double-entry validator
4. **TEST** invoice posting workflow end-to-end

### Medium Term (Next 2 Sprints)

1. **MIGRATE** production intelligence (performance summaries, analytics)
2. **IMPLEMENT** worker payment service
3. **FIX** stock management (implement FIFO/LIFO)
4. **ADD** comprehensive monitoring

### Long Term (Future)

1. **MIGRATE** remaining Edge Functions
2. **DECOMMISSION** Supabase Edge Functions
3. **OPTIMIZE** database schema for performance
4. **EXTRACT** reporting engine to separate service (optional)

---

## Conclusion

The AgriTech platform contains **substantial business logic** suitable for migration from Supabase Edge Functions to a dedicated NestJS backend service. The **critical path** (accounting and financial operations) should be prioritized due to their impact on business compliance and data integrity.

**Total Recommended Effort**: 3-4 weeks for Phase 1-4 (Accounting, Production Intelligence, Worker Payments)

**Expected ROI**: Better maintainability, testability, scalability, and cost efficiency

