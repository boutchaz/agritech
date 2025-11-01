# Stock Management Integration Guide

Complete guide to how Purchases, Sales, Inventory, and Accounting integrate in the AgriTech platform.

## 📊 Architecture Overview

The stock management system follows a **source of truth** pattern where:
- **Stock Entries** are the single source of truth for all quantity changes
- **Purchase Orders** and **Sales Orders** create stock entries but don't directly modify inventory
- **Posting** a stock entry triggers all downstream effects (inventory updates, accounting entries)

```
┌─────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│ Purchase Order  │──1──>│  Stock Entry    │──2──>│ Inventory Items  │
│  (Confirmed)    │      │   (Draft)       │      │  (Updated Qty)   │
└─────────────────┘      └─────────────────┘      └──────────────────┘
                                  │
                                  │ 3
                                  ▼
                         ┌─────────────────┐
                         │ Journal Entry   │
                         │  (GL Impact)    │
                         └─────────────────┘
```

## 🔄 Complete Purchase-to-Inventory Flow

### Step 1: Create Purchase Order
**Location**: Billing → Purchase Orders → Create PO

```typescript
// Database record created
{
  po_number: "PO-001",
  status: "draft",
  items: [
    { item_id: "fertilizer-uuid", quantity: 100, unit_price: 50 }
  ],
  stock_received: false,        // Important flag
  stock_entry_id: null          // Will be set later
}
```

### Step 2: Confirm Purchase Order
**Action**: User clicks "Confirm Order" button

```typescript
// Status changes: draft → confirmed
{
  status: "confirmed",
  confirmed_at: "2024-11-01T10:00:00Z"
}
```

**Button Appears**: "Create Material Receipt" (green button)

### Step 3: Create Material Receipt
**Location**: PO Detail Dialog → Click "Create Material Receipt"

**Code Reference**:
- UI: `project/src/components/Billing/PurchaseOrderDetailDialog.tsx:489-533`
- Database Function: `project/supabase/migrations/20250201000002_purchase_sales_order_integration.sql:42-131`

**What Happens**:
```typescript
// 1. Calls RPC function
await supabase.rpc('create_material_receipt_from_po', {
  p_purchase_order_id: po.id,
  p_warehouse_id: warehouseId,
  p_receipt_date: today
});

// 2. Function creates stock_entries record
INSERT INTO stock_entries (
  organization_id,
  entry_type: 'Material Receipt',
  entry_number: 'MR-AUTO-001',        // Auto-generated
  from_warehouse_id: NULL,
  to_warehouse_id: warehouseId,
  status: 'Draft',                    // Important!
  reference_type: 'purchase_order',
  reference_id: po_id
);

// 3. Copies all PO items to stock_entry_items
INSERT INTO stock_entry_items (
  stock_entry_id,
  item_id,
  item_name,
  quantity,
  unit,
  cost_per_unit                       // From PO unit price
);

// 4. Links PO to stock entry
UPDATE purchase_orders
SET stock_entry_id = new_entry_id
WHERE id = po_id;
```

**User Notification**: "Material Receipt created successfully. Navigate to Stock Entries to view."

### Step 4: Post Material Receipt
**Location**: Stock → Stock Entries Tab → Find MR-AUTO-001 → Click "Post Entry"

**Code Reference**:
- Hook: `project/src/hooks/useStockEntries.ts:229-254`
- Trigger: `project/supabase/migrations/20250201000000_create_stock_entries.sql:260-348`

**What Happens**:
```typescript
// 1. Status changes: Draft → Posted
UPDATE stock_entries
SET status = 'Posted', posted_at = NOW()
WHERE id = entry_id;

// 2. Trigger: update_stock_on_entry_post() fires
// For Material Receipt:
UPDATE inventory_items
SET quantity = quantity + 100      -- Add received quantity
WHERE id = item_id;

// 3. Create audit record
INSERT INTO stock_movements (
  item_id,
  warehouse_id,
  movement_type: 'IN',
  quantity: 100,
  balance_after: 600,              -- New total
  reference_type: 'stock_entry',
  reference_id: entry_id
);

// 4. Update PO status
UPDATE purchase_orders
SET
  stock_received = TRUE,
  stock_received_date = entry_date,
  status = 'received'              -- If fully received
WHERE stock_entry_id = entry_id;

// 5. Create journal entry (if accounting integration configured)
INSERT INTO journal_entries (...);
INSERT INTO journal_items (
  -- Dr. Stock Asset          5,000
  -- Cr. Stock Received       5,000
);
```

**Result**:
- ✅ Inventory quantity updated (+100)
- ✅ Stock movement recorded
- ✅ PO marked as "received"
- ✅ Journal entry created (if configured)

## 🚚 Complete Sales-to-Inventory Flow

### Step 1: Create Sales Order
**Location**: Billing → Sales Orders → Create SO

```typescript
{
  order_number: "SO-001",
  status: "draft",
  items: [
    { item_id: "fertilizer-uuid", quantity: 50 }
  ],
  stock_issued: false,             // Important flag
  stock_entry_id: null
}
```

### Step 2: Confirm Sales Order
**Action**: User clicks "Confirm Order"

```typescript
{
  status: "confirmed",
  confirmed_at: "2024-11-01T11:00:00Z"
}
```

**Button Appears**: "Create Material Issue" (orange button)

### Step 3: Create Material Issue
**Location**: SO Detail Dialog → Click "Create Material Issue"

**Code Reference**:
- UI: `project/src/components/Billing/SalesOrderDetailDialog.tsx:187-230`
- Database Function: `project/supabase/migrations/20250201000002_purchase_sales_order_integration.sql:133-224`

**What Happens**:
```typescript
// 1. Calls RPC function
await supabase.rpc('create_material_issue_from_so', {
  p_sales_order_id: so.id,
  p_warehouse_id: warehouseId,
  p_issue_date: today
});

// 2. Function creates stock_entries record
INSERT INTO stock_entries (
  organization_id,
  entry_type: 'Material Issue',
  entry_number: 'MI-AUTO-001',
  from_warehouse_id: warehouseId,
  to_warehouse_id: NULL,
  status: 'Draft',
  reference_type: 'sales_order',
  reference_id: so_id
);

// 3. Copies SO items
INSERT INTO stock_entry_items (...);

// 4. Links SO to stock entry
UPDATE sales_orders
SET stock_entry_id = new_entry_id
WHERE id = so_id;
```

### Step 4: Post Material Issue
**Location**: Stock → Stock Entries Tab → Find MI-AUTO-001 → Click "Post Entry"

**What Happens**:
```typescript
// 1. Status: Draft → Posted
UPDATE stock_entries SET status = 'Posted';

// 2. Trigger updates inventory (DEDUCTS quantity)
UPDATE inventory_items
SET quantity = quantity - 50      -- Deduct issued quantity
WHERE id = item_id;

// 3. Create audit record
INSERT INTO stock_movements (
  movement_type: 'OUT',
  quantity: -50,
  balance_after: 550
);

// 4. Update SO status
UPDATE sales_orders
SET
  stock_issued = TRUE,
  stock_issued_date = entry_date,
  status = 'processing'            -- Ready for shipment
WHERE stock_entry_id = entry_id;

// 5. Create journal entry
INSERT INTO journal_items (
  -- Dr. Cost of Goods Sold   2,500
  -- Cr. Stock Asset          2,500
);
```

**Result**:
- ✅ Inventory quantity reduced (-50)
- ✅ Stock movement recorded
- ✅ SO marked as "stock issued"
- ✅ COGS journal entry created

## 📦 Opening Stock Balance

### Purpose
Set initial inventory quantities when first implementing the system.

### Flow
**Location**: Stock → Opening Stock Tab (to be added to UI)

```typescript
// 1. Create opening stock record
{
  item_id: "fertilizer-uuid",
  warehouse_id: "main-warehouse",
  opening_date: "2024-01-01",
  quantity: 500,
  valuation_rate: 25.00,
  total_value: 12500.00,           // Computed
  status: 'Draft'
}

// 2. Post opening stock
await supabase.rpc('post_opening_stock_balance', {
  p_opening_stock_id: id
});

// 3. Function executes:
// - Updates inventory quantity (+500)
// - Creates stock movement (type: IN)
// - Creates journal entry:
//   Dr. Stock Asset         12,500
//   Cr. Opening Balance Equity  12,500
```

## 🔗 Stock-to-Accounting Integration

### Account Mapping Setup

Before stock entries can create journal entries, configure account mappings:

**Location**: Stock → Account Mappings Tab (to be added to UI)

```typescript
// Required mappings:
[
  {
    entry_type: 'Opening Stock',
    debit_account_id: 'stock-asset-account',
    credit_account_id: 'opening-balance-equity-account'
  },
  {
    entry_type: 'Material Receipt',
    debit_account_id: 'stock-asset-account',
    credit_account_id: 'stock-received-account'
  },
  {
    entry_type: 'Material Issue',
    debit_account_id: 'cogs-account',
    credit_account_id: 'stock-asset-account'
  },
  {
    entry_type: 'Stock Reconciliation',
    debit_account_id: 'stock-adjustment-account',
    credit_account_id: 'stock-asset-account'
  }
]
```

### Automatic Journal Entry Creation

**Trigger**: `trigger_stock_entry_journal` on `stock_entries` table

**Code Reference**: `project/supabase/migrations/20250201000003_opening_stock_and_accounting_integration.sql:386-398`

```sql
-- Fires AFTER UPDATE when status changes to 'Posted'
CREATE TRIGGER trigger_stock_entry_journal
  AFTER UPDATE ON stock_entries
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_stock_journal();
```

**Function**: `create_stock_journal_entry(p_stock_entry_id UUID)`

```typescript
// For each posted stock entry:
// 1. Calculate total value from items
SELECT SUM(quantity * cost_per_unit) FROM stock_entry_items;

// 2. Get account mapping for entry type
SELECT debit_account_id, credit_account_id
FROM stock_account_mappings
WHERE entry_type = stock_entry.entry_type;

// 3. Create journal entry with two items
INSERT INTO journal_entries (...);
INSERT INTO journal_items (debit, credit);

// 4. Link back to stock entry
UPDATE stock_entries SET journal_entry_id = new_id;
```

## 📋 Key Status Flags

### Purchase Orders
- `stock_received`: `false` | `true`
- `stock_received_date`: When material receipt was posted
- `stock_entry_id`: Reference to material receipt

### Sales Orders
- `stock_issued`: `false` | `true`
- `stock_issued_date`: When material issue was posted
- `stock_entry_id`: Reference to material issue

### Stock Entries
- `status`: `'Draft'` | `'Posted'` | `'Cancelled'`
- `journal_entry_id`: Reference to GL journal entry (if posted)

## ⚠️ Important Rules

### 1. Draft vs Posted
- **Draft entries** do NOT affect inventory quantities
- Only **posted entries** trigger quantity changes
- This allows review/correction before committing

### 2. Single Source of Truth
- **Stock entries** are the ONLY way to change inventory quantities
- Direct updates to `inventory_items.quantity` are blocked
- All changes flow through `stock_entries` → trigger → inventory

### 3. Posting is Irreversible
- Once posted, a stock entry cannot be edited
- Use "Cancel" to reverse (creates offsetting entry)
- Cancelled entries remain in history for audit

### 4. Accounting Integration
- Requires account mappings to be configured first
- If no mapping exists, stock entry posts but no journal created
- Journal entries are automatically set to 'posted' status

## 🔍 Audit Trail

Every stock transaction creates multiple audit records:

```typescript
// For one Material Receipt posting:
{
  stock_entry: {
    id: "entry-uuid",
    entry_number: "MR-AUTO-001",
    status: "Posted",
    posted_at: "2024-11-01T12:00:00Z",
    posted_by: "user-uuid"
  },
  stock_movement: {
    movement_type: "IN",
    quantity: 100,
    balance_after: 600,
    movement_date: "2024-11-01",
    reference_type: "stock_entry",
    reference_id: "entry-uuid"
  },
  journal_entry: {
    entry_number: "JE-001",
    status: "posted",
    total_debit: 5000,
    total_credit: 5000
  },
  purchase_order: {
    stock_received: true,
    stock_received_date: "2024-11-01",
    status: "received"
  }
}
```

## 🎯 Testing Checklist

### End-to-End Purchase Flow
- [ ] Create PO with items
- [ ] Confirm PO
- [ ] Click "Create Material Receipt" → Verify draft entry created
- [ ] Navigate to Stock → Entries
- [ ] Find material receipt
- [ ] Click "Post Entry"
- [ ] Verify inventory quantity increased
- [ ] Verify PO status = "received"
- [ ] Verify PO.stock_received = true
- [ ] Check Accounting → Journal Entries for GL impact

### End-to-End Sales Flow
- [ ] Create SO with items
- [ ] Confirm SO
- [ ] Click "Create Material Issue" → Verify draft entry created
- [ ] Navigate to Stock → Entries
- [ ] Find material issue
- [ ] Click "Post Entry"
- [ ] Verify inventory quantity decreased
- [ ] Verify SO status updated
- [ ] Verify SO.stock_issued = true
- [ ] Check journal entry for COGS impact

### Opening Stock
- [ ] Configure account mappings for "Opening Stock"
- [ ] Create opening stock record
- [ ] Post opening stock
- [ ] Verify inventory quantity set
- [ ] Verify journal entry created
- [ ] Check Balance Sheet for stock asset value

## 🚨 Common Issues

### "No warehouse found"
**Cause**: No warehouse exists for the organization
**Fix**: Create at least one warehouse first

### "No account mapping found"
**Cause**: Stock entry posted but accounting integration not configured
**Effect**: Stock updates but no journal entry created
**Fix**: Set up account mappings in Stock → Account Mappings

### Inventory not updating
**Cause**: Stock entry still in Draft status
**Fix**: Navigate to Stock → Entries and click "Post Entry"

### PO still shows "Confirmed" after receipt
**Cause**: Material receipt not posted yet
**Fix**: Post the stock entry to trigger PO status update

## 📚 File References

### Frontend
- PO Material Receipt Button: `src/components/Billing/PurchaseOrderDetailDialog.tsx:489-533`
- SO Material Issue Button: `src/components/Billing/SalesOrderDetailDialog.tsx:187-230`
- Stock Entry Posting: `src/hooks/useStockEntries.ts:229-254`
- Opening Stock Hooks: `src/hooks/useOpeningStock.ts`

### Backend
- Stock Entry System: `supabase/migrations/20250201000000_create_stock_entries.sql`
- PO/SO Integration: `supabase/migrations/20250201000002_purchase_sales_order_integration.sql`
- Opening Stock & Accounting: `supabase/migrations/20250201000003_opening_stock_and_accounting_integration.sql`

### Types
- Stock Entries: `src/types/stock-entries.ts`
- Opening Stock: `src/types/opening-stock.ts`
- Database Types: `src/types/database.types.ts`

---

**Last Updated**: November 1, 2024
**Version**: 1.0.0
