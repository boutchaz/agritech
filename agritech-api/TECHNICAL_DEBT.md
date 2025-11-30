# Technical Debt - Stock Entries Module

## Critical Issues

### 1. **No True Database Transactions** 🔴
**Severity:** CRITICAL (Foundation Issue)
**Location:** `stock-entries.service.ts:709-731`

**Problem:**
- `executeInTransaction()` doesn't implement real ACID transactions
- Uses same Supabase client without BEGIN/COMMIT/ROLLBACK
- Partial writes can occur if operations fail mid-way
- Example: Stock entry created, but items insert fails → orphaned entry
- **BLOCKER:** All other fixes depend on transaction integrity

**Impact:**
- Data integrity violations
- Inconsistent inventory state
- Race conditions in concurrent operations
- Cannot safely implement #2 (valuation) or #4 (locking) without this

**Recommended Solution Path:**
**Phase 1: Add pg client with transaction support (Week 1-2)**
```typescript
import { Pool } from 'pg';

// In module initialization
private pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// New transaction wrapper
private async executeInPgTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await this.pgPool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Phase 2: Migrate critical operations (Week 2-3)**
Priority order:
1. `createStockEntry()` - multi-table inserts
2. `postStockEntry()` - movements + valuations
3. `processStockTransfer()` - dual warehouse updates

**Testing/Validation:**
- Simulate failures at each step (network errors, constraint violations)
- Verify rollback leaves no partial data
- Load test: 10 concurrent posts to same item/warehouse
- Monitor for deadlocks, tune lock timeouts
- Rollback plan: Keep Supabase fallback for reads

**Effort:** High (2-3 weeks)
**Dependencies:** None (this enables everything else)
**Risk:** Connection pool tuning, potential performance degradation

---

### 2. **Stock Valuation Not Consumed on Issue/Transfer** 🔴
**Severity:** HIGH (Foundation Issue)
**Location:** `processMaterialIssue()`, `processStockTransfer()`

**Problem:**
- Material Issue and Stock Transfer deduct from `stock_movements`
- But never consume from `stock_valuation` table
- TODO comments acknowledge this gap
- Results in:
  - Inflated valuation (ghost stock value)
  - Incorrect COGS calculations
  - Balance sheet discrepancies
- **BLOCKER:** Cannot trust inventory value or financial reports

**Impact:**
- Financial reports show incorrect inventory value
- COGS not properly allocated
- Audit trail incomplete
- Cannot close books accurately

**Recommended Solution Path:**
**Phase 1: Implement consumption logic (Week 1)**
```typescript
async consumeValuation(
  itemId: string,
  warehouseId: string,
  quantity: number,
  method: 'FIFO' | 'LIFO' | 'Moving Average'
): Promise<{ totalCost: number, consumedBatches: ValuationBatch[] }> {
  // 1. Lock valuation rows for this item/warehouse
  const batches = await client.query(`
    SELECT * FROM stock_valuation
    WHERE item_id = $1 AND warehouse_id = $2
    AND remaining_quantity > 0
    ORDER BY ${method === 'FIFO' ? 'created_at ASC' : 'created_at DESC'}
    FOR UPDATE
  `, [itemId, warehouseId]);

  // 2. Consume from batches
  let remainingQty = quantity;
  let totalCost = 0;
  const consumed = [];

  for (const batch of batches.rows) {
    const consumeQty = Math.min(remainingQty, batch.remaining_quantity);
    const cost = (batch.cost_per_unit * consumeQty);

    await client.query(`
      UPDATE stock_valuation
      SET remaining_quantity = remaining_quantity - $1,
          updated_at = NOW()
      WHERE id = $2
    `, [consumeQty, batch.id]);

    consumed.push({ batchId: batch.id, quantity: consumeQty, cost });
    totalCost += cost;
    remainingQty -= consumeQty;

    if (remainingQty === 0) break;
  }

  if (remainingQty > 0) {
    throw new Error(`Insufficient valuation for ${quantity} units (short ${remainingQty})`);
  }

  return { totalCost, consumedBatches: consumed };
}
```

**Phase 2: Backfill existing data (Week 2)**
```sql
-- Script to rebuild stock_valuation.remaining_quantity from movements
WITH movement_summary AS (
  SELECT
    item_id,
    warehouse_id,
    SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE -quantity END) as net_quantity
  FROM stock_movements
  GROUP BY item_id, warehouse_id
),
valuation_summary AS (
  SELECT
    item_id,
    warehouse_id,
    SUM(remaining_quantity) as total_remaining
  FROM stock_valuation
  GROUP BY item_id, warehouse_id
)
SELECT
  m.item_id,
  m.warehouse_id,
  m.net_quantity as movement_balance,
  COALESCE(v.total_remaining, 0) as valuation_balance,
  (m.net_quantity - COALESCE(v.total_remaining, 0)) as discrepancy
FROM movement_summary m
LEFT JOIN valuation_summary v USING (item_id, warehouse_id)
WHERE ABS(m.net_quantity - COALESCE(v.total_remaining, 0)) > 0.001;

-- After review, apply correction:
-- Option A: Create adjustment entries
-- Option B: Rebuild valuation from movements (destructive)
```

**Phase 3: Add GL integration (Week 3)**
- Post COGS journal entries on consumption
- Link to sales invoices/work orders
- Variance accounts for discrepancies

**Data Migration Risk:**
- Existing stock has movements but no valuation consumption
- Need to reconcile `stock_movements` vs `stock_valuation`
- Potential multi-million value discrepancies
- **Mitigation:** Run in parallel mode first (log discrepancies, don't enforce), then switch

**Testing/Validation:**
- Unit test: Consume 100 units across 3 batches (FIFO/LIFO/Avg)
- Integration test: Material Issue → verify valuation consumed → verify COGS posted
- Data validation: `SUM(movements) = SUM(valuation.remaining)` for all items
- Backfill script: Dry-run on copy of production data
- Rollback: Keep consumption logic behind feature flag

**Effort:** Medium (2-3 weeks including backfill)
**Dependencies:** #1 (Transactions) - MUST have rollback if consumption fails
**Risk:** Data migration complexity, performance impact of FOR UPDATE locks

---

### 3. **Stock Reconciliation Unimplemented**
**Severity:** MEDIUM
**Location:** `processStockReconciliation()` - stub only

**Problem:**
- Entry type exists but process is empty
- Cannot adjust inventory to match physical counts
- No variance tracking
- Stock discrepancies accumulate without resolution path
- No accounting/GL integration for adjustments

**Impact:**
- System stock diverges from physical stock over time
- No mechanism to correct errors
- Manual DB updates required for adjustments
- Inventory value on balance sheet becomes unreliable
- Variance not reflected in financial statements

**Recommended Solution Path:**
**Phase 1: Implement reconciliation logic (Week 1)**
1. Calculate variance: `physical_quantity - system_quantity`
2. Create adjustment movements (IN for positive, OUT for negative variance)
3. Update valuations:
   - Positive variance: Add at weighted average cost or standard cost
   - Negative variance: Consume at FIFO/LIFO per costing method
4. Log variance reasons (shrinkage, damage, count error, etc.)
5. Generate variance reports

**Phase 2: Add GL/Accounting Integration (Week 2)**

**For Positive Variance (Found stock):**
```typescript
// Dr. Inventory Asset (increase)
// Cr. Inventory Variance Income (or reduce COGS)
{
  debit: { account: 'INVENTORY_ASSET', amount: varianceValue },
  credit: { account: 'INVENTORY_VARIANCE_INCOME', amount: varianceValue },
  memo: `Reconciliation ${entry.entry_no}: Found ${variance} units of ${item.name}`
}
```

**For Negative Variance (Missing stock/shrinkage):**
```typescript
// Dr. Inventory Variance Expense (or COGS)
// Cr. Inventory Asset (decrease)
{
  debit: { account: 'INVENTORY_VARIANCE_EXPENSE', amount: varianceValue },
  credit: { account: 'INVENTORY_ASSET', amount: varianceValue },
  memo: `Reconciliation ${entry.entry_no}: Shrinkage ${variance} units of ${item.name}`
}
```

**Reversal/Voiding:**
- If reconciliation entry is cancelled, reverse GL entries
- Must void the original entry, not delete (audit trail)
- Create offsetting journal entry with same amounts, opposite signs
- Link reversal to original entry for traceability

**Testing/Validation:**
- Test positive variance: 100 physical vs 80 system → +20 adjustment
- Test negative variance: 100 physical vs 120 system → -20 adjustment
- Verify GL entries post correctly
- Test cancellation: Verify reversal creates offsetting entries
- Financial report check: Inventory value matches `SUM(stock_valuation.remaining_quantity * cost_per_unit)`

**Effort:** Medium (2 weeks including GL integration)
**Dependencies:** #2 (Valuation consumption) - must be able to consume/add valuation
**Risk:** Accounting rules vary by jurisdiction, may need configurable GL accounts

---

### 4. **Race Conditions in Stock Availability Check**
**Severity:** HIGH
**Location:** `validateStockAvailability()`

**Problem:**
- Sums stock movements without row locking
- Concurrent posts can both see same available quantity
- Both can pass validation and oversell
- Example:
  ```
  Available: 100
  Order A: Needs 80 (checks → OK)
  Order B: Needs 80 (checks → OK)
  Both post → -60 stock!
  ```
- **Supabase Limitation:** JS client cannot execute `SELECT ... FOR UPDATE`
- Current approach is fundamentally unsafe for concurrent access

**Impact:**
- Negative inventory
- Overselling
- Customer service issues
- Lost revenue or customer trust

**Recommended Solution (MUST use pg client or RPC):**

**Option A: PostgreSQL Function (Recommended)**
```sql
-- Create atomic check-and-deduct function
CREATE OR REPLACE FUNCTION check_and_reserve_stock(
  p_item_id UUID,
  p_warehouse_id UUID,
  p_quantity NUMERIC
) RETURNS TABLE(available NUMERIC, reserved BOOLEAN) AS $$
DECLARE
  v_available NUMERIC;
BEGIN
  -- Lock the stock balance row
  SELECT SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE -quantity END)
  INTO v_available
  FROM stock_movements
  WHERE item_id = p_item_id AND warehouse_id = p_warehouse_id
  FOR UPDATE;  -- Locks the rows, blocks concurrent checks

  IF v_available >= p_quantity THEN
    RETURN QUERY SELECT v_available, TRUE;
  ELSE
    RETURN QUERY SELECT v_available, FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

Then call from service:
```typescript
const { data } = await client.rpc('check_and_reserve_stock', {
  p_item_id: itemId,
  p_warehouse_id: warehouseId,
  p_quantity: quantity
});

if (!data[0].reserved) {
  throw new Error(`Insufficient stock: need ${quantity}, have ${data[0].available}`);
}
```

**Option B: pg client with explicit locking**
```typescript
// Requires #1 (pg client with transactions)
const result = await pgClient.query(`
  SELECT item_id,
         SUM(CASE WHEN movement_type = 'IN' THEN quantity ELSE -quantity END) as available
  FROM stock_movements
  WHERE item_id = $1 AND warehouse_id = $2
  GROUP BY item_id
  FOR UPDATE  -- Locks these rows
`, [itemId, warehouseId]);

if (result.rows[0].available < quantity) {
  throw new Error('Insufficient stock');
}
```

**Option C: Advisory locks (lightweight)**
```sql
-- Acquire lock before validation
SELECT pg_advisory_xact_lock(
  hashtext(item_id::text || '_' || warehouse_id::text)
);
-- Validation runs here
-- Lock auto-released at transaction end
```

**Testing/Validation:**
- Concurrency test: 10 parallel requests for same 100 units (80 each)
- Expected: 1 succeeds, 9 fail with "insufficient stock"
- Actual (without fix): Multiple succeed, negative balance
- Monitor: Lock wait times, deadlock frequency
- Contention risk: High-velocity items may see lock contention

**Effort:** Medium (4-5 days)
**Dependencies:** #1 (Transactions) for rollback on lock timeout
**Risk:** Lock contention on popular items, need monitoring/alerting

---

### 5. **Warehouse Validation Gaps**
**Severity:** MEDIUM
**Location:** `validateStockEntry()`, `processMaterialReceipt()`, etc.

**Problem:**
- Entry header has `from_warehouse_id` / `to_warehouse_id`
- Items can override with `source_warehouse_id` / `target_warehouse_id`
- No validation that item-level warehouses match entry-level
- Can accidentally transfer to wrong warehouse

**Impact:**
- Stock moved to unintended locations
- Warehouse balances incorrect
- Difficult to trace errors

**Solution:**
Add validation rules:
```typescript
// For each item:
if (item.target_warehouse_id) {
  if (entryType === 'Material Receipt' && item.target_warehouse_id !== entry.to_warehouse_id) {
    throw new Error('Item target warehouse must match entry warehouse');
  }
}
```

**Effort:** Low (2-3 days)

---

### 6. **No Re-validation on Posting Drafts**
**Severity:** MEDIUM
**Location:** `postStockEntry()`

**Problem:**
- Fetches draft items and posts them as-is
- Doesn't re-validate:
  - Quantities still available?
  - Costs still accurate?
  - Items still exist?
  - Warehouses still active?
- Draft could be hours/days old with stale data

**Impact:**
- Post with negative stock if items were consumed elsewhere
- Use outdated costs
- Reference deleted items/warehouses

**Solution:**
Before posting, re-run all validations:
```typescript
// 1. Re-validate stock availability
validateStockAvailability(items);
// 2. Re-validate item existence & status
validateItemsExist(items);
// 3. Re-validate warehouses
validateWarehouses(entry);
// 4. Optionally: warn if costs changed significantly
```

**Effort:** Low (2-3 days)

---

### 7. **Balance Check Limitations**
**Severity:** MEDIUM
**Location:** `validateStockAvailability()`

**Problem:**
- Only sums movements (doesn't check valuation table)
- No unit conversion support
- Ignores reservations/allocations
- Doesn't account for quality holds

**Impact:**
- Can issue stock that's:
  - Reserved for other orders
  - In quality hold
  - In different UOM
  - Pending transfer

**Solution:**
Enhanced availability check:
```typescript
Available = Movements.sum()
  - Reservations.sum()
  - QualityHold.sum()
  - PendingTransfers.sum()
```
Plus unit conversion logic.

**Effort:** Medium (1 week)

---

## Medium Priority Issues

### 8. **Frontend Alignment Issues**
**Severity:** LOW
**Location:** `project/src/components/Stock/ItemManagement.tsx`

**Problems Identified:**
- "Low stock only" filter used `is_low_stock` flag only
- Badge showed `is_low_stock OR quantity < minimum_threshold`
- Items could show badge but disappear when filter toggled
- `maintain_stock` field stripped before API (unused field)
- Low stock alerts never rendered due to guard condition bug
- Unused `useFarmStockLevels` hook imported but not needed

**Status:** FIXED and VERIFIED in commit 9e40304
- ✅ Low stock filter now mirrors badge logic exactly (lines 747-767, 922-924)
  - Filter: `is_low_stock || (minimum_stock_level && total_quantity < minimum_stock_level)`
  - Badge: `is_low_stock || (minimum_stock_level && total_quantity < minimum_stock_level)`
- ✅ `maintain_stock` field never existed in form state (verified lines 233-286)
  - Only `organization_id` is stripped before API submission (line 329)
- ✅ Low stock alerts visibility guard correct: `selectedFarm === 'all'` (line 818)
- ✅ Unused hook removed

**Verification Date:** 2025-11-30
**Verified By:** Code inspection of current implementation

---

### 9. **Missing Audit Trail**
**Severity:** MEDIUM
**Problem:** No comprehensive log of:
- Who approved postings
- Why reconciliations happened
- What caused cancellations

**Solution:** Add audit_log table with detailed change tracking

**Effort:** Low (3-4 days)

---

### 10. **No Soft Deletes**
**Severity:** LOW
**Problem:** Hard deletes lose history

**Solution:** Add `deleted_at` column, filter with `WHERE deleted_at IS NULL`

**Effort:** Low (2 days)

---

## Recommendations

### Immediate (Sprint 1)
1. ✅ Document transaction limitation (Done)
2. Add stock valuation consumption (#2)
3. Fix race conditions with locking (#4)

### Short-term (Sprint 2-3)
4. Implement reconciliation (#3)
5. Add warehouse validation (#5)
6. Add re-validation on posting (#6)

### Medium-term (Quarter)
7. Migrate to PostgreSQL stored procedures for transactions
8. Implement reservation system
9. Add comprehensive audit logging

### Long-term (Roadmap)
10. Microservice for inventory with event sourcing
11. Real-time stock visibility
12. Multi-warehouse optimization

---

## Notes
- These issues don't prevent basic functionality
- They become critical at scale or with concurrent users
- Prioritize based on business risk and user volume
- Consider interim mitigations (lower concurrency, manual reconciliation)
