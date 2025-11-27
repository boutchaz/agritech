# Strapi CMS Migration Guide

**Database Architecture Separation: Supabase vs Strapi CMS**

This document identifies which tables/data should be moved from Supabase to Strapi CMS based on the principle:
- **Strapi**: Static/reference data, content, taxonomies, templates
- **Supabase**: Transactional data, user-generated operational data, real-time data

---

## 📋 Summary

### Tables to Move to Strapi (25 tables)
Reference data, taxonomies, templates, and relatively static content that admins manage.

### Tables to Keep in Supabase (81 tables)
Transactional, operational, user-generated, and real-time data.

---

## ✅ MOVE TO STRAPI CMS (25 Tables)

### 1. Agricultural Reference Data (8 tables)

#### `crop_types` ✓
**Why**: Reference taxonomy that changes infrequently
**Fields**: id, name, description, created_at, updated_at
**Strapi Type**: Collection Type
**Usage**: Dropdown/selection in operational forms

#### `crop_categories` ✓
**Why**: Classification system for crops
**Fields**: id, name, description
**Strapi Type**: Collection Type
**Relations**: Has many crop_varieties

#### `crop_varieties` ✓
**Why**: Static catalog of available varieties
**Fields**: id, crop_type_id, name, description, characteristics
**Strapi Type**: Collection Type
**Relations**: Belongs to crop_category

#### `tree_categories` ✓
**Why**: Taxonomy for tree types
**Fields**: id, name, description
**Strapi Type**: Collection Type

#### `trees` ✓
**Why**: Catalog of tree species
**Fields**: id, name, category_id, characteristics
**Strapi Type**: Collection Type
**Relations**: Belongs to tree_category

#### `plantation_types` ✓
**Why**: Types of plantation configurations
**Fields**: id, name, description, configuration
**Strapi Type**: Collection Type

#### `test_types` ✓
**Why**: Types of soil/crop tests available
**Fields**: id, name, description, parameters
**Strapi Type**: Collection Type

#### `product_categories` ✓
**Why**: Product classification system
**Fields**: id, name, description
**Strapi Type**: Collection Type
**Relations**: Has many product_subcategories

---

### 2. Financial Reference Data (5 tables)

#### `currencies` ✓
**Why**: Global reference data, rarely changes
**Fields**: code, name, symbol, exchange_rate
**Strapi Type**: Collection Type
**Note**: Can sync exchange rates via API plugin

#### `account_templates` ✓
**Why**: Pre-configured accounting templates
**Fields**: id, name, description, template_data
**Strapi Type**: Collection Type
**Usage**: Users select template when setting up

#### `cost_categories` ✓
**Why**: Classification for cost types
**Fields**: id, name, description, category_type
**Strapi Type**: Collection Type

#### `taxes` ✓
**Why**: Tax rates and rules (configured by admins)
**Fields**: id, name, rate, type, description
**Strapi Type**: Collection Type
**Note**: Tax regulations, not transaction records

#### `cost_centers` ✓
**Why**: Organizational cost structure
**Fields**: id, name, description, is_active
**Strapi Type**: Collection Type

---

### 3. Task & Work Management Templates (3 tables)

#### `task_categories` ✓
**Why**: Predefined task classifications
**Fields**: id, name, description, color, icon
**Strapi Type**: Collection Type

#### `task_templates` ✓
**Why**: Reusable task configurations
**Fields**: id, name, description, default_duration, checklist
**Strapi Type**: Collection Type
**Usage**: Users create tasks from templates

#### `work_units` ✓
**Why**: Units of measure for work (hours, days, etc.)
**Fields**: id, name, abbreviation
**Strapi Type**: Collection Type

---

### 4. Inventory & Product Reference (3 tables)

#### `item_groups` ✓
**Why**: Categorization of inventory items
**Fields**: id, name, description, parent_group_id
**Strapi Type**: Collection Type
**Relations**: Self-referential (hierarchical)

#### `product_subcategories` ✓
**Why**: Secondary product classification
**Fields**: id, name, description, category_id
**Strapi Type**: Collection Type
**Relations**: Belongs to product_category

#### `warehouses` ✓
**Why**: Physical location master data
**Fields**: id, name, description, address, capacity
**Strapi Type**: Collection Type
**Note**: Warehouse metadata, not stock levels

---

### 5. Role & Permission Templates (3 tables)

#### `role_templates` ✓
**Why**: Predefined role configurations
**Fields**: id, name, description, permissions_json
**Strapi Type**: Collection Type
**Usage**: Apply template when creating organization roles

#### `permission_groups` ✓
**Why**: Logical grouping of permissions
**Fields**: id, name, description, category
**Strapi Type**: Collection Type

#### `permissions` ✓
**Why**: Master list of system permissions
**Fields**: id, name, description, resource, action
**Strapi Type**: Collection Type
**Note**: Permission definitions, not assignments

---

### 6. Content & Documentation (3 tables - Optional)

#### `analysis_recommendations` ✓
**Why**: Knowledge base of agricultural recommendations
**Fields**: id, description, recommendation_text, conditions
**Strapi Type**: Collection Type
**Usage**: CMS-managed agricultural advice

#### Consideration for Blog/Help Content
Consider adding these Strapi content types:
- **Blog Posts**: Agricultural tips, news
- **Help Articles**: User documentation
- **FAQs**: Common questions
- **Notifications Templates**: System notification templates

---

## ❌ KEEP IN SUPABASE (81 Tables)

### 1. User & Organization Data (4 tables)
- `organizations` - Multi-tenant data
- `organization_users` - Relationships
- `user_profiles` - User-specific data
- `subscriptions` - Billing/usage tracking

**Why**: Tightly coupled with auth.users, RLS policies, multi-tenancy

---

### 2. Core Farm Operations (2 tables)
- `farms` - User-created farms
- `parcels` - User-created parcels

**Why**: User-generated operational data with geospatial queries

---

### 3. Financial Transactions (18 tables)
- `quotes`, `quote_items`
- `sales_orders`, `sales_order_items`
- `purchase_orders`, `purchase_order_items`
- `invoices`, `invoice_items`
- `accounting_payments`, `payment_allocations`
- `journal_entries`, `journal_items`
- `accounts` (user's chart of accounts)
- `account_mappings`
- `bank_accounts`
- `financial_transactions`
- `costs`, `revenues`
- `profitability_snapshots`

**Why**: Transactional data, needs ACID compliance, audit trails, RLS

---

### 4. Inventory Management (17 tables)
- `items` - Specific inventory items
- `inventory`, `inventory_items`
- `inventory_batches`, `inventory_serial_numbers`
- `stock_entries`, `stock_entry_items`
- `stock_movements`
- `stock_valuation`
- `opening_stock_balances`
- `stock_closing_entries`, `stock_closing_items`
- `stock_account_mappings`
- `reception_batches`
- `deliveries`, `delivery_items`, `delivery_tracking`

**Why**: Real-time stock tracking, frequent updates, complex calculations

---

### 5. Task & Work Execution (13 tables)
- `tasks` - Actual task instances
- `task_comments` - User comments
- `task_time_logs` - Time tracking
- `task_dependencies` - Task relationships
- `task_equipment` - Equipment assignments
- `workers`, `day_laborers`, `employees`
- `work_records`
- `metayage_settlements`
- `payment_records`, `payment_advances`
- `payment_bonuses`, `payment_deductions`

**Why**: Operational data with real-time updates, user-generated

---

### 6. Crop & Harvest Operations (3 tables)
- `crops` - Actual planted crops (instances)
- `harvest_records` - Harvest data
- `harvest_forecasts` - Predictions

**Why**: Real-time operational data, sensor integration

---

### 7. Satellite & Analysis Data (8 tables)
- `satellite_aois` - User-defined areas
- `satellite_files` - Generated files
- `satellite_indices_data` - Time-series data
- `satellite_processing_jobs`, `satellite_processing_tasks`
- `cloud_coverage_checks`
- `analyses`
- `soil_analyses`

**Why**: High-volume time-series data, automated processing, large datasets

---

### 8. Monitoring & Alerts (2 tables)
- `performance_alerts`
- `parcel_reports`

**Why**: Real-time monitoring, automated generation

---

### 9. CRM & Business Relations (2 tables)
- `customers`
- `suppliers`

**Why**: Business operational data with transactions

---

### 10. Infrastructure & Assets (3 tables)
- `structures` - Farm structures
- `utilities` - Utilities usage
- `livestock` - Live inventory

**Why**: Operational assets with changing status

---

### 11. Security & Audit (4 tables)
- `roles` - Organization-specific roles
- `role_permissions` - Assigned permissions
- `role_assignments_audit` - Change history
- `farm_management_roles` - Farm-level access
- `audit_logs` - System audit trail

**Why**: Security-critical, user-specific, needs RLS

---

### 12. System & Configuration (2 tables)
- `dashboard_settings` - User preferences
- `subscription_usage` - Usage tracking
- `migration_audit_log` - Migration tracking

**Why**: System operational data

---

## 🔄 MIGRATION STRATEGY

### Phase 1: Setup Strapi Content Types

1. **Create Collection Types in Strapi**
   ```bash
   # For each table to migrate, create Strapi content type
   # Example: crop-types, crop-varieties, etc.
   ```

2. **Define Relations**
   ```javascript
   // Example: crop_varieties -> crop_categories
   {
     "crop_category": {
       "type": "relation",
       "relation": "manyToOne",
       "target": "api::crop-category.crop-category"
     }
   }
   ```

### Phase 2: Data Migration

1. **Export from Supabase**
   ```sql
   -- Example for crop_types
   COPY (SELECT * FROM crop_types) TO '/tmp/crop_types.csv' CSV HEADER;
   ```

2. **Transform & Import to Strapi**
   ```javascript
   // Use Strapi's import plugin or custom script
   // Transform UUID to integer IDs if needed
   ```

3. **Verify Data Integrity**
   ```javascript
   // Check counts, relations, required fields
   ```

### Phase 3: Update Application Code

1. **Update API Calls**
   ```typescript
   // Before: Supabase
   const { data } = await supabase
     .from('crop_types')
     .select('*');

   // After: Strapi
   const { data } = await fetch('http://cms.local/api/crop-types')
     .then(res => res.json());
   ```

2. **Update Form Components**
   ```typescript
   // Replace Supabase selects with Strapi API calls
   // Cache Strapi data in frontend (static data)
   ```

3. **Handle Relations**
   ```typescript
   // Strapi uses different relation format
   // Update join queries and populate calls
   ```

### Phase 4: Cleanup

1. **Drop Migrated Tables from Supabase**
   ```sql
   -- After confirming migration success
   DROP TABLE crop_types CASCADE;
   DROP TABLE crop_categories CASCADE;
   -- etc.
   ```

2. **Update RLS Policies**
   ```sql
   -- Remove policies for dropped tables
   ```

---

## 🔗 INTEGRATION PATTERN

### Frontend Integration

```typescript
// services/content.service.ts
class ContentService {
  private strapiUrl = import.meta.env.VITE_STRAPI_URL;

  // Get reference data from Strapi
  async getCropTypes() {
    return fetch(`${this.strapiUrl}/api/crop-types?populate=*`)
      .then(res => res.json());
  }

  // Get operational data from Supabase
  async getUserCrops(userId: string) {
    return supabase
      .from('crops')
      .select('*, crop_type_id') // crop_type_id references Strapi
      .eq('user_id', userId);
  }
}
```

### Caching Strategy

```typescript
// Cache Strapi static data
const cropTypesCache = {
  data: null,
  timestamp: null,
  ttl: 3600000, // 1 hour

  async get() {
    if (!this.data || Date.now() - this.timestamp > this.ttl) {
      this.data = await contentService.getCropTypes();
      this.timestamp = Date.now();
    }
    return this.data;
  }
};
```

---

## 📊 BENEFITS OF SEPARATION

### Strapi Benefits
1. **Content Versioning**: Draft/publish workflow
2. **Media Library**: Rich media management
3. **API Documentation**: Auto-generated OpenAPI
4. **Internationalization**: Multi-language support
5. **Admin UI**: Non-technical staff can manage content
6. **Plugins**: SEO, analytics, import/export

### Supabase Benefits
1. **Real-time**: Live data subscriptions
2. **Row-Level Security**: Multi-tenant data isolation
3. **PostGIS**: Geospatial queries for parcels
4. **Performance**: Optimized for transactional workload
5. **Auth Integration**: Direct auth.users references
6. **ACID Compliance**: Financial transaction integrity

---

## ⚠️ IMPORTANT CONSIDERATIONS

### 1. Foreign Key References
When migrating tables to Strapi, Supabase tables will need to:
- Store Strapi IDs as integers/strings (not UUIDs)
- Handle references in application code (no FK constraints across DBs)

### 2. Data Synchronization
- Strapi data changes rarely (admin-managed)
- No need for real-time sync Strapi → Supabase
- Consider webhook notifications for critical updates

### 3. Backup Strategy
- Separate backup schedules for Strapi vs Supabase
- Strapi: Less frequent (content changes slowly)
- Supabase: Frequent (transactional data)

### 4. API Performance
- Cache Strapi responses aggressively (1-24 hours)
- Strapi serves static content (CDN-friendly)
- Supabase handles dynamic queries

### 5. Security
- Strapi: Public API for reference data (with rate limiting)
- Supabase: RLS for user-specific data
- Use API keys for Strapi, JWT for Supabase

---

## 📝 MIGRATION CHECKLIST

### Pre-Migration
- [ ] Backup both Supabase and Strapi databases
- [ ] Document all FK relationships
- [ ] Identify dependent application code
- [ ] Setup staging environment

### During Migration
- [ ] Create Strapi content types
- [ ] Export data from Supabase
- [ ] Transform data format (UUID → ID if needed)
- [ ] Import to Strapi
- [ ] Verify data integrity
- [ ] Update application API calls
- [ ] Test all affected features

### Post-Migration
- [ ] Drop migrated tables from Supabase
- [ ] Update documentation
- [ ] Monitor API performance
- [ ] Train admins on Strapi interface
- [ ] Setup automated backups for Strapi

---

## 🎯 RECOMMENDED MIGRATION ORDER

1. **Start with simplest tables** (no relations)
   - `currencies`
   - `work_units`
   - `crop_categories`

2. **Move taxonomies** (one-level relations)
   - `crop_types`
   - `tree_categories`
   - `product_categories`

3. **Migrate complex references** (multi-level)
   - `crop_varieties` (depends on crop_categories)
   - `product_subcategories` (depends on product_categories)

4. **Move templates last** (may have JSON data)
   - `task_templates`
   - `account_templates`

---

## 💡 BEST PRACTICES

1. **Migrate incrementally**: One table at a time
2. **Test thoroughly**: Verify each migration before moving to next
3. **Maintain backward compatibility**: Keep old API during transition
4. **Use feature flags**: Toggle between Supabase/Strapi data sources
5. **Document changes**: Update API documentation
6. **Train users**: Admin training for Strapi CMS

---

## 📖 EXAMPLE: Crop Types Migration

### 1. Create Strapi Content Type

```json
{
  "kind": "collectionType",
  "collectionName": "crop_types",
  "info": {
    "singularName": "crop-type",
    "pluralName": "crop-types",
    "displayName": "Crop Type"
  },
  "attributes": {
    "name": {
      "type": "string",
      "required": true,
      "unique": true
    },
    "description": {
      "type": "text"
    },
    "characteristics": {
      "type": "json"
    },
    "image": {
      "type": "media",
      "multiple": false
    }
  }
}
```

### 2. Export from Supabase

```sql
SELECT id, name, description, characteristics, created_at, updated_at
FROM crop_types
ORDER BY created_at;
```

### 3. Import to Strapi (Script)

```javascript
const strapiData = supabaseData.map(row => ({
  name: row.name,
  description: row.description,
  characteristics: row.characteristics,
  publishedAt: new Date() // Auto-publish
}));

for (const item of strapiData) {
  await strapi.entityService.create('api::crop-type.crop-type', {
    data: item
  });
}
```

### 4. Update Frontend

```typescript
// Before
const { data: cropTypes } = await supabase
  .from('crop_types')
  .select('*');

// After
const cropTypes = await fetch(`${STRAPI_URL}/api/crop-types`)
  .then(res => res.json())
  .then(({ data }) => data.map(item => ({
    id: item.id,
    ...item.attributes
  })));
```

---

**Last Updated**: 2025-11-27
**Status**: Planning Document
**Next Steps**: Review with team, validate table classifications, begin Phase 1
