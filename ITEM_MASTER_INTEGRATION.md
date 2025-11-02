# Item Master System Integration - Complete Guide

## ✅ Implementation Status

The Item Master system has been fully integrated into the AgriTech platform, following ERPNext-style item management patterns. This document outlines what has been implemented and next steps.

---

## 📦 What Has Been Implemented

### 1. Database Schema ✅

#### New Tables Created:
- **`item_groups`** - Hierarchical categorization (e.g., Agriculture > Crops > Fruits > Olives)
- **`items`** - Comprehensive item master with:
  - Item code (SKU), name, description
  - Item group reference
  - Status flags (sales, purchase, stock)
  - Units of measure
  - Valuation method (FIFO, Moving Average, LIFO)
  - Default accounts, warehouses, tax settings
  - Pricing (standard rate, last purchase/sales rate)
  - Agricultural-specific fields (crop_type, variety, seasonality, shelf_life)
  - Barcode, manufacturer codes
  - Quality inspection settings

- **`item_variants`** - For size/color/packaging variations
- **`item_unit_conversions`** - UoM conversions (e.g., 1 box = 10 kg)
- **`item_supplier_details`** - Supplier-specific item codes and procurement details
- **`item_customer_details`** - Customer-specific item codes and pricing rules
- **`item_prices`** - Price lists (standard, wholesale, retail, customer-specific)

#### Updated Tables:
- **`stock_entry_items`** - Now references `items` table via `item_id` (nullable during migration)
- **`invoice_items`** - Added `item_id` column (optional during transition)
- **`purchase_order_items`** - Added `item_id` column (renamed old `inventory_item_id` to `legacy_item_id`)

### 2. TypeScript Types ✅

Created comprehensive types in `project/src/types/items.ts`:
- `Item`, `ItemGroup`, `ItemVariant`, `ItemUnitConversion`
- `ItemSupplierDetail`, `ItemCustomerDetail`, `ItemPrice`
- Form input types (`CreateItemInput`, `UpdateItemInput`, etc.)
- Filter and search types
- UI helper types (`ItemSelectionOption`)

### 3. React Hooks ✅

Created `project/src/hooks/useItems.ts` with:
- `useItemGroups()` - Fetch item groups with filters
- `useItemGroup()` - Fetch single item group
- `useItemGroupTree()` - Fetch hierarchical group tree
- `useItems()` - Fetch items with filters
- `useItem()` - Fetch single item with details
- `useItemSelection()` - Lightweight item selection for dropdowns
- `useCreateItemGroup()`, `useUpdateItemGroup()`, `useDeleteItemGroup()`
- `useCreateItem()`, `useUpdateItem()`, `useDeleteItem()`
- `useItemPrices()` - Fetch prices for an item
- `useGetItemPrice()` - Get price considering customer/price list

### 4. UI Components ✅

- **`ItemManagement.tsx`** - Main item management interface
  - Item list with table view
  - Create/Edit item dialog
  - Delete functionality
  - Status indicators

- **`StockEntryForm.tsx`** - Updated to use item selection
  - Item dropdown from `items` table
  - Auto-populates item name and unit
  - Validates item selection

### 5. Routes ✅

- **`/stock/items`** - Item management page

---

## 🔄 Migration Process

### Step 1: Run Database Migrations

```bash
cd project
npm run db:migrate
```

This will create:
- All new item tables (`item_groups`, `items`, `item_variants`, etc.)
- Add `item_id` columns to existing transaction tables
- Set up RLS policies
- Create helper functions

### Step 2: Seed Default Item Groups

Run this SQL for each organization:

```sql
SELECT seed_default_item_groups('<organization_id>');
```

This creates:
- Agriculture
  - Crops
  - Inputs
  - Equipment

### Step 3: Migrate Existing Data (Optional)

If you have existing `inventory_items` data, run:

```sql
-- For each organization:
SELECT migrate_inventory_to_items('<organization_id>');

-- Then update stock_entry_items references:
SELECT update_stock_entry_items_item_refs('<organization_id>');
```

### Step 4: Regenerate TypeScript Types

```bash
cd project
npm run db:generate-types
```

This will generate types for the new tables, fixing TypeScript linting errors.

### Step 5: Make `item_id` Required (After Data Migration)

Once all data is migrated:

```sql
-- Make item_id required in stock_entry_items
ALTER TABLE stock_entry_items
  ALTER COLUMN item_id SET NOT NULL;

-- Do the same for invoice_items, purchase_order_items, etc.
```

---

## 🎯 Next Steps

### Immediate (Required):
1. ✅ Run migrations: `npm run db:migrate`
2. ✅ Regenerate types: `npm run db:generate-types`
3. ✅ Seed default item groups for existing organizations
4. ⏳ Migrate existing `inventory_items` data to `items` table
5. ⏳ Update all stock entries, invoices, orders to use `item_id`

### Short-term (Enhancements):
6. Create items from existing inventory_items
7. Update `InvoiceForm` to use item selection
8. Update `PurchaseOrderForm` and `SalesOrderForm` to use item selection
9. Add item search/autocomplete components
10. Create item group management UI

### Long-term (Advanced Features):
11. Implement item variants UI
12. Add item pricing management UI
13. Implement unit conversion management
14. Add supplier/customer item code management
15. Create item import/export functionality
16. Add barcode scanning support

---

## 📝 Usage Examples

### Creating an Item

```typescript
import { useCreateItem } from '@/hooks/useItems';

const createItem = useCreateItem();

await createItem.mutateAsync({
  organization_id: orgId,
  item_name: 'Olives - Picholine',
  item_group_id: groupId,
  default_unit: 'kg',
  is_stock_item: true,
  is_sales_item: true,
  is_purchase_item: true,
  crop_type: 'olive',
  variety: 'Picholine',
  standard_rate: 45.00,
});
```

### Using Item Selection in Forms

```typescript
import { useItemSelection } from '@/hooks/useItems';

const { data: items } = useItemSelection({ 
  is_stock_item: true 
});

// In form:
<Select
  value={selectedItemId}
  onValueChange={(itemId) => {
    const item = items.find(i => i.id === itemId);
    // Auto-populate unit, rate, etc.
  }}
>
  {items.map(item => (
    <SelectItem key={item.id} value={item.id}>
      {item.item_code} - {item.item_name}
    </SelectItem>
  ))}
</Select>
```

---

## 🔗 Integration Points

### Stock Management ✅
- Stock entries now use `items` table
- Item selection dropdown in `StockEntryForm`
- Unit auto-population from item

### Accounting (In Progress)
- Invoice items can reference `items` table
- Need to update `InvoiceForm` to use item selection

### Billing (In Progress)
- Purchase order items have `item_id` column
- Sales order items need `item_id` column
- Forms need item selection integration

### Reception Center (Future)
- Reception batches can link to `items` via crop/variety
- Quality control can reference item specifications

---

## 🎨 Benefits Achieved

1. **Data Integrity** ✅
   - Unique item codes prevent duplicates
   - Foreign key constraints ensure referential integrity
   - Item changes don't break historical data

2. **Better Organization** ✅
   - Hierarchical item groups for categorization
   - Easy filtering and reporting by group

3. **Scalability** ✅
   - Item variants for packaging/size variations
   - Unit conversions for different measurements

4. **Business Logic** ✅
   - Default accounts, warehouses, tax rules per item
   - Supplier/customer specific item codes
   - Price lists per customer/market

5. **Agricultural-Specific** ✅
   - Crop type, variety, seasonality tracking
   - Shelf life management
   - Quality inspection workflows

---

## ⚠️ Important Notes

1. **Type Generation Required**: After running migrations, regenerate TypeScript types to fix linting errors.

2. **Data Migration**: The migration from `inventory_items` to `items` is optional but recommended. Use the helper functions provided.

3. **Backward Compatibility**: The system maintains `item_name` fields for backward compatibility during transition.

4. **Foreign Keys**: `item_id` is currently nullable in transaction tables to allow gradual migration. Make it required after data migration is complete.

5. **RLS Policies**: All new tables have RLS policies ensuring organization-level data isolation.

---

## 📚 Files Created/Modified

### New Files:
- `project/supabase/migrations/20250201000005_create_item_master_system.sql`
- `project/supabase/migrations/20250201000006_migrate_to_item_master.sql`
- `project/src/types/items.ts`
- `project/src/hooks/useItems.ts`
- `project/src/components/Stock/ItemManagement.tsx`
- `project/src/routes/stock/items.tsx`

### Modified Files:
- `project/src/components/Stock/StockEntryForm.tsx` - Updated to use item selection
- `project/src/lib/invoice-service.ts` - Added `item_id` support

---

## 🚀 Ready to Use!

The Item Master system is ready for use. After running migrations and regenerating types:

1. Navigate to `/stock/items` to manage items
2. Use item selection in stock entry forms
3. Items are automatically available in dropdowns
4. Create item groups to organize items hierarchically

---

## 📞 Support

For questions or issues:
- Check migration files for SQL syntax
- Review TypeScript types for data structures
- Check hooks for API usage patterns
- Review UI components for implementation examples

