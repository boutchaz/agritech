# Strapi Migration Summary - Quick Reference

## 📊 Tables Overview

**Total Tables Analyzed**: 106
- **Move to Strapi**: 25 tables (23.6%)
- **Keep in Supabase**: 81 tables (76.4%)

---

## ✅ MOVE TO STRAPI (25 Tables)

| # | Table Name | Category | Priority | Complexity |
|---|------------|----------|----------|------------|
| 1 | `currencies` | Financial Reference | High | Low |
| 2 | `work_units` | Work Management | High | Low |
| 3 | `crop_categories` | Agricultural | High | Low |
| 4 | `tree_categories` | Agricultural | Medium | Low |
| 5 | `product_categories` | Inventory | High | Low |
| 6 | `cost_categories` | Financial | High | Low |
| 7 | `permission_groups` | Security | Low | Low |
| 8 | `crop_types` | Agricultural | High | Low |
| 9 | `crop_varieties` | Agricultural | High | Medium |
| 10 | `trees` | Agricultural | Medium | Medium |
| 11 | `plantation_types` | Agricultural | Medium | Low |
| 12 | `test_types` | Analysis | Medium | Low |
| 13 | `product_subcategories` | Inventory | High | Medium |
| 14 | `item_groups` | Inventory | High | Medium |
| 15 | `warehouses` | Inventory | High | Low |
| 16 | `task_categories` | Task Management | High | Low |
| 17 | `task_templates` | Task Management | Medium | High |
| 18 | `account_templates` | Financial | Medium | High |
| 19 | `taxes` | Financial | High | Medium |
| 20 | `cost_centers` | Financial | Medium | Low |
| 21 | `role_templates` | Security | Low | High |
| 22 | `permissions` | Security | Low | Medium |
| 23 | `analysis_recommendations` | Content | Low | Medium |

**Optional New Content Types:**
- Blog Posts (agricultural tips, news)
- Help Articles (documentation)
- FAQs
- Notification Templates

---

## ❌ KEEP IN SUPABASE (81 Tables)

### User & Organization (4 tables)
- `organizations`, `organization_users`, `user_profiles`, `subscriptions`

### Farm Operations (2 tables)
- `farms`, `parcels`

### Financial Transactions (18 tables)
- `quotes`, `quote_items`, `sales_orders`, `sales_order_items`
- `purchase_orders`, `purchase_order_items`, `invoices`, `invoice_items`
- `accounting_payments`, `payment_allocations`, `journal_entries`, `journal_items`
- `accounts`, `account_mappings`, `bank_accounts`, `financial_transactions`
- `costs`, `revenues`, `profitability_snapshots`

### Inventory Operations (17 tables)
- `items`, `inventory`, `inventory_items`, `inventory_batches`
- `inventory_serial_numbers`, `stock_entries`, `stock_entry_items`
- `stock_movements`, `stock_valuation`, `opening_stock_balances`
- `stock_closing_entries`, `stock_closing_items`, `stock_account_mappings`
- `reception_batches`, `deliveries`, `delivery_items`, `delivery_tracking`

### Task Execution (13 tables)
- `tasks`, `task_comments`, `task_time_logs`, `task_dependencies`, `task_equipment`
- `workers`, `day_laborers`, `employees`, `work_records`, `metayage_settlements`
- `payment_records`, `payment_advances`, `payment_bonuses`, `payment_deductions`

### Crop Operations (3 tables)
- `crops`, `harvest_records`, `harvest_forecasts`

### Satellite & Analysis (8 tables)
- `satellite_aois`, `satellite_files`, `satellite_indices_data`
- `satellite_processing_jobs`, `satellite_processing_tasks`
- `cloud_coverage_checks`, `analyses`, `soil_analyses`

### Monitoring (2 tables)
- `performance_alerts`, `parcel_reports`

### CRM (2 tables)
- `customers`, `suppliers`

### Assets (3 tables)
- `structures`, `utilities`, `livestock`

### Security & Audit (5 tables)
- `roles`, `role_permissions`, `role_assignments_audit`
- `farm_management_roles`, `audit_logs`

### System (3 tables)
- `dashboard_settings`, `subscription_usage`, `migration_audit_log`

---

## 🎯 Recommended Migration Priority

### Phase 1 - Quick Wins (Weeks 1-2)
**Target**: Simple reference tables with no dependencies

1. `currencies` - No dependencies
2. `work_units` - No dependencies
3. `crop_categories` - No dependencies
4. `tree_categories` - No dependencies
5. `product_categories` - No dependencies
6. `cost_categories` - No dependencies

**Expected Impact**: ~30% of Strapi migration complete

---

### Phase 2 - Core Agricultural Data (Weeks 3-4)
**Target**: Agricultural taxonomies and catalogs

7. `crop_types` - Simple relation to crop_categories
8. `trees` - Simple relation to tree_categories
9. `plantation_types` - Standalone
10. `test_types` - Standalone
11. `crop_varieties` - Relation to crop_types

**Expected Impact**: ~60% complete

---

### Phase 3 - Task & Inventory (Weeks 5-6)
**Target**: Task and inventory reference data

12. `task_categories` - Standalone
13. `task_templates` - Complex JSON data
14. `item_groups` - Hierarchical structure
15. `product_subcategories` - Relation to categories
16. `warehouses` - Location master data

**Expected Impact**: ~85% complete

---

### Phase 4 - Financial & Templates (Weeks 7-8)
**Target**: Complex templates and financial setup

17. `taxes` - Complex rules
18. `cost_centers` - Organizational structure
19. `account_templates` - Complex JSON
20. `role_templates` - Security templates
21. `permissions` - Permission catalog
22. `permission_groups` - Permission organization
23. `analysis_recommendations` - Content

**Expected Impact**: 100% complete

---

## 📋 Migration Checklist by Table

### Simple Tables (Low Complexity)

```markdown
## currencies
- [ ] Create Strapi content type
- [ ] Export from Supabase: `SELECT * FROM currencies`
- [ ] Import to Strapi
- [ ] Update frontend API calls in: currency selectors, financial forms
- [ ] Test: Currency selection in invoices, payments
- [ ] Drop from Supabase
```

### Medium Complexity Tables

```markdown
## crop_varieties
- [ ] Create Strapi content type with crop_category relation
- [ ] Export from Supabase with relations
- [ ] Transform IDs (map crop_category_id)
- [ ] Import to Strapi
- [ ] Update frontend: crop selection dropdowns
- [ ] Update backend: crop validation logic
- [ ] Test: Crop creation, variety filtering
- [ ] Drop from Supabase
```

### High Complexity Tables

```markdown
## task_templates
- [ ] Create Strapi content type
- [ ] Design JSON schema for template_data field
- [ ] Export from Supabase
- [ ] Transform complex JSON structures
- [ ] Import to Strapi with validation
- [ ] Update task creation workflow
- [ ] Test: Template selection, task generation
- [ ] Update task execution to fetch template data
- [ ] Drop from Supabase
```

---

## 🔄 Code Changes Required

### Frontend Updates

```typescript
// services/reference-data.service.ts
class ReferenceDataService {
  // BEFORE: All from Supabase
  async getCropTypes() {
    return supabase.from('crop_types').select('*');
  }

  // AFTER: From Strapi with caching
  private cache = new Map();

  async getCropTypes() {
    if (this.cache.has('crop_types')) {
      return this.cache.get('crop_types');
    }

    const data = await fetch(`${STRAPI_URL}/api/crop-types?populate=*`)
      .then(res => res.json());

    this.cache.set('crop_types', data);
    setTimeout(() => this.cache.delete('crop_types'), 3600000); // 1 hour

    return data;
  }
}
```

### Backend Updates

```typescript
// Update validation schemas
// BEFORE: Supabase FK validation
const cropSchema = z.object({
  crop_type_id: z.string().uuid() // FK to crop_types table
});

// AFTER: Strapi ID validation
const cropSchema = z.object({
  crop_type_id: z.number().positive() // Reference to Strapi crop-type
});
```

---

## 📊 Expected Benefits

### Performance
- **Frontend**: Faster loads (cached static data)
- **Supabase**: Reduced query complexity (fewer joins)
- **Backend**: Simplified data model

### Developer Experience
- **Content Management**: Non-technical admins can update reference data
- **API Documentation**: Auto-generated from Strapi
- **Versioning**: Draft/publish workflow for changes

### Cost Optimization
- **Supabase**: Lower database size → lower costs
- **Caching**: Reduced API calls → lower bandwidth
- **Separation**: Scale Strapi independently

---

## ⚠️ Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Multiple backups, dry-run migrations |
| Broken FK references | High | Update app code before dropping tables |
| API downtime | Medium | Blue-green deployment, feature flags |
| Cache invalidation issues | Low | Short TTL, manual refresh endpoints |
| Performance degradation | Low | Load testing, CDN for Strapi |

---

## 📈 Success Metrics

- [ ] All 25 tables successfully migrated
- [ ] Zero data loss confirmed
- [ ] API response times < 200ms (with cache)
- [ ] No breaking changes to frontend
- [ ] Strapi admin panel accessible to non-technical staff
- [ ] 50% reduction in Supabase database size
- [ ] Documentation updated

---

## 🚀 Next Steps

1. **Review this document** with development team
2. **Validate table classifications** - Are we moving the right tables?
3. **Setup Strapi in development** environment
4. **Create first content type** (start with `currencies`)
5. **Test migration script** with sample data
6. **Update one component** to use Strapi API
7. **Get stakeholder approval** before production migration

---

**Full Details**: See [STRAPI_MIGRATION_GUIDE.md](./STRAPI_MIGRATION_GUIDE.md)

**Created**: 2025-11-27
**Status**: Planning / Ready for Review
