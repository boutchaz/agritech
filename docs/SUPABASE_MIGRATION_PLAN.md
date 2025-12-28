# Supabase to NestJS API Migration Plan

> **Goal**: Remove all direct Supabase queries from frontend. Route everything through NestJS API.
> 
> **Exception**: Auth-related calls (`authSupabase`) remain direct for session/token management.

---

## Executive Summary

| Category | Files | Total Queries | Effort |
|----------|-------|---------------|--------|
| Hooks (need new API modules) | 3 | 84 | HIGH |
| Hooks (API exists, need endpoints) | 3 | 4 | MEDIUM |
| Components (API exists) | 10 | ~15 | LOW |
| Files to delete | 2 | - | TRIVIAL |
| **TOTAL** | **18 files** | **~103 queries** | **~5-7 days** |

---

## Phase 1: Quick Wins (Day 1)

### 1.1 Delete Unused/Example Files
```
project/src/components/ProfitabilityDashboard.adaptive-example.tsx  → DELETE
project/src/components/UtilitiesManagement.tsx.bak                  → DELETE
```

### 1.2 Components Using Existing API Modules

These components have direct Supabase queries but NestJS endpoints already exist.

| Component | Supabase Usage | Existing API Module | Action |
|-----------|----------------|---------------------|--------|
| `FarmHierarchyManager.tsx` | 2 calls | `farms`, `parcels` | Use existing API |
| `FarmRoleManager.tsx` | 2 calls | `roles`, `organization-users` | Use existing API |
| `UtilitiesManagement.tsx` | 2 calls | `utilities` | Use existing API |
| `Billing/PurchaseOrderDetailDialog.tsx` | 2 calls | `purchase-orders` | Use existing API |
| `Billing/QuoteDetailDialog.tsx` | 1 call | `quotes` | Use existing API |
| `Workers/WorkerForm.tsx` | 1 call | `workers`, `files` | Use existing API |
| `UsersSettings.tsx` | 1 call | `users`, `organization-users` | Use existing API |
| `ProfileSettings.tsx` | 1 call | `users` | Use existing API |
| `ModuleView.tsx` | 1 call | `organization-modules`, `parcels` | Use existing API |
| `ParcelReportGenerator.tsx` | 1 call | `parcels`, `reports` | Use existing API |

**Estimated Time**: 4-6 hours

---

## Phase 2: Extend Existing API Modules (Day 2)

### 2.1 Stock/ProductImageUpload.tsx
- **Current**: Direct `supabase.storage` calls
- **API Module**: `files` exists
- **Action**: Extend files controller with storage upload endpoint
- **Endpoint needed**: `POST /files/upload-product-image`

### 2.2 useOpeningStock.ts
- **Current**: `supabase.rpc('post_opening_stock_balance', ...)`
- **API Module**: `stock-entries` exists
- **Action**: Add RPC endpoint to stock-entries controller
- **Endpoints needed**:
  - `POST /stock-entries/opening-balance`
  - `POST /stock-entries/opening-balance/:id/post`

### 2.3 useProductionIntelligence.ts
- **Current**: `supabase.rpc('get_parcel_performance_summary', ...)`
- **API Module**: `production-intelligence` EXISTS
- **Action**: Verify/add endpoint for parcel performance summary
- **Endpoint needed**: `GET /production-intelligence/parcel-performance`

### 2.4 useReceptionBatches.ts
- **Current**: `supabase.rpc(...)` call
- **API Module**: `reception-batches` EXISTS
- **Action**: Verify RPC is exposed via API
- **Endpoint needed**: Check existing endpoints

### 2.5 useAssignableUsers.ts
- **Current**: `supabase.auth.getUser()` in my-tasks query
- **API Module**: `organization-users`, `tasks` exist
- **Action**: This is auth-related, may be acceptable OR move to tasks API
- **Note**: Review if this should stay as auth call

**Estimated Time**: 4-6 hours

---

## Phase 3: Create New API Modules (Days 3-5)

### 3.1 Document Templates Module (NEW)

**File**: `useDocumentTemplates.ts` - 17 queries

**Tables Accessed**:
- `document_templates`

**Endpoints Needed**:
```
GET    /document-templates                    # List all
GET    /document-templates/:id                # Get one
GET    /document-templates/default/:type      # Get default by type
POST   /document-templates                    # Create
PUT    /document-templates/:id                # Update
DELETE /document-templates/:id                # Delete
POST   /document-templates/:id/set-default    # Set as default
POST   /document-templates/:id/duplicate      # Duplicate template
```

**Files to Create**:
```
agritech-api/src/modules/document-templates/
├── document-templates.module.ts
├── document-templates.controller.ts
├── document-templates.service.ts
├── dto/
│   ├── create-document-template.dto.ts
│   └── update-document-template.dto.ts
└── entities/
    └── document-template.entity.ts

project/src/lib/api/document-templates.ts  (frontend API client)
```

**Estimated Time**: 4-6 hours

---

### 3.2 Lab Services Module (NEW)

**File**: `useLabServices.ts` - 37 queries (LARGEST)

**Tables Accessed**:
- `lab_service_providers`
- `lab_service_types`
- `lab_service_orders`
- `lab_result_parameters`
- `lab_service_recommendations`
- `sample_collection_schedules`

**Endpoints Needed**:
```
# Providers
GET    /lab-services/providers
GET    /lab-services/providers/:id

# Service Types
GET    /lab-services/types
GET    /lab-services/types/:id

# Orders
GET    /lab-services/orders
GET    /lab-services/orders/:id
POST   /lab-services/orders
PUT    /lab-services/orders/:id
PUT    /lab-services/orders/:id/status

# Results
GET    /lab-services/orders/:id/results
POST   /lab-services/orders/:id/results
PUT    /lab-services/results/:id

# Recommendations
GET    /lab-services/recommendations
POST   /lab-services/recommendations
PUT    /lab-services/recommendations/:id
PUT    /lab-services/recommendations/:id/implement

# Schedules
GET    /lab-services/schedules
POST   /lab-services/schedules
PUT    /lab-services/schedules/:id
DELETE /lab-services/schedules/:id
```

**Files to Create**:
```
agritech-api/src/modules/lab-services/
├── lab-services.module.ts
├── controllers/
│   ├── providers.controller.ts
│   ├── service-types.controller.ts
│   ├── orders.controller.ts
│   ├── results.controller.ts
│   ├── recommendations.controller.ts
│   └── schedules.controller.ts
├── services/
│   ├── providers.service.ts
│   ├── orders.service.ts
│   └── schedules.service.ts
├── dto/
│   ├── create-order.dto.ts
│   ├── create-result.dto.ts
│   └── create-schedule.dto.ts
└── entities/
    ├── provider.entity.ts
    ├── service-type.entity.ts
    ├── order.entity.ts
    └── schedule.entity.ts

project/src/lib/api/lab-services.ts  (frontend API client)
```

**Estimated Time**: 8-10 hours

---

### 3.3 Tree Management Module (NEW)

**File**: `useTreeManagement.ts` - 30 queries

**Tables Accessed**:
- `tree_categories`
- `trees`
- `tree_health_records`

**Endpoints Needed**:
```
# Categories
GET    /tree-management/categories
POST   /tree-management/categories
PUT    /tree-management/categories/:id
DELETE /tree-management/categories/:id

# Trees
GET    /tree-management/trees
GET    /tree-management/trees/:id
POST   /tree-management/trees
PUT    /tree-management/trees/:id
DELETE /tree-management/trees/:id

# Health Records
GET    /tree-management/trees/:id/health-records
POST   /tree-management/trees/:id/health-records
PUT    /tree-management/health-records/:id
DELETE /tree-management/health-records/:id

# Bulk Operations
POST   /tree-management/trees/bulk
GET    /tree-management/parcels/:parcelId/trees
```

**Files to Create**:
```
agritech-api/src/modules/tree-management/
├── tree-management.module.ts
├── controllers/
│   ├── categories.controller.ts
│   ├── trees.controller.ts
│   └── health-records.controller.ts
├── services/
│   ├── categories.service.ts
│   ├── trees.service.ts
│   └── health-records.service.ts
├── dto/
│   ├── create-tree.dto.ts
│   ├── create-category.dto.ts
│   └── create-health-record.dto.ts
└── entities/
    ├── tree.entity.ts
    ├── category.entity.ts
    └── health-record.entity.ts

project/src/lib/api/tree-management.ts  (frontend API client)
```

**Estimated Time**: 6-8 hours

---

## Phase 4: Frontend Hook Updates (Days 5-6)

After API modules are created, update frontend hooks:

| Hook | API Client to Create | Queries to Replace |
|------|---------------------|-------------------|
| `useDocumentTemplates.ts` | `lib/api/document-templates.ts` | 17 |
| `useLabServices.ts` | `lib/api/lab-services.ts` | 37 |
| `useTreeManagement.ts` | `lib/api/tree-management.ts` | 30 |
| `useOpeningStock.ts` | Extend `lib/api/stock.ts` | 2 |
| `useProductionIntelligence.ts` | Create/extend `lib/api/production-intelligence.ts` | 1 |
| `useReceptionBatches.ts` | Already has API, verify | 1 |

**Estimated Time**: 4-6 hours

---

## Phase 5: Cleanup & Verification (Day 7)

### 5.1 Remove Unused Supabase Imports
```bash
# Find files still importing supabase (should only be auth-related)
grep -r "from.*supabase" project/src --include="*.ts" --include="*.tsx" | grep -v authSupabase
```

### 5.2 Verification Checklist
- [ ] No `supabase.from()` calls in hooks (except auth)
- [ ] No `supabase.rpc()` calls in hooks
- [ ] No `supabase.storage` calls in components
- [ ] All API endpoints have proper auth guards
- [ ] All API endpoints filter by organization_id
- [ ] Build passes: `npm run build`
- [ ] Type check passes: `npm run type-check`
- [ ] E2E tests pass

### 5.3 Update AGENTS.md
Add note about architecture:
```markdown
## API Architecture
- Frontend NEVER queries Supabase directly (except auth)
- All data access goes through NestJS API at `/api/*`
- Auth uses `authSupabase` client for session management
```

---

## Migration Order (Recommended)

```
Week 1:
├── Day 1: Phase 1 (Quick wins - components)
├── Day 2: Phase 2 (Extend existing modules)
├── Day 3: Phase 3.1 (Document Templates)
├── Day 4: Phase 3.2 (Lab Services - part 1)
├── Day 5: Phase 3.2 (Lab Services - part 2)
├── Day 6: Phase 3.3 (Tree Management)
└── Day 7: Phase 4 & 5 (Frontend updates & cleanup)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Create API endpoints first, then switch frontend |
| Missing edge cases | Keep old code commented until verified |
| Performance regression | Ensure API has proper indexes, pagination |
| Auth/security gaps | All endpoints must use `@UseGuards(JwtAuthGuard)` |

---

## Dependencies

1. **NestJS API must be running** for frontend to work after migration
2. **Database RPC functions** may need to be replicated in API services
3. **File uploads** need proper storage configuration in API

---

## Files Summary

### To Delete (2)
- `project/src/components/ProfitabilityDashboard.adaptive-example.tsx`
- `project/src/components/UtilitiesManagement.tsx.bak`

### To Modify - Frontend (18)
- 6 hooks
- 10 components
- 2 lib files

### To Create - Backend (3 modules, ~30 files)
- `document-templates` module
- `lab-services` module  
- `tree-management` module

### To Extend - Backend (3 modules)
- `stock-entries` (opening balance endpoints)
- `production-intelligence` (parcel performance)
- `files` (product image upload)
