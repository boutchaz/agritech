# Technical Debt - Stock Entries Module

## Critical Issues

### 1. **No True Database Transactions**
**Severity:** CRITICAL
**Location:** `stock-entries.service.ts:709-731`

**Problem:**
- `executeInTransaction()` doesn't implement real ACID transactions
- Uses same Supabase client without BEGIN/COMMIT/ROLLBACK
- Partial writes can occur if operations fail mid-way
- Example: Stock entry created, but items insert fails → orphaned entry

**Impact:**
- Data integrity violations
- Inconsistent inventory state
- Race conditions in concurrent operations

**Solution Options:**
1. Migrate to PostgreSQL stored procedures with proper transaction blocks
2. Use direct `pg` library client with transaction support
3. Implement saga pattern with compensation logic
4. Add cleanup/rollback logic for partial failures

**Effort:** High (2-3 weeks)

---

### 2. **Stock Valuation Not Consumed on Issue/Transfer**
**Severity:** HIGH
**Location:** `processMaterialIssue()`, `processStockTransfer()`

**Problem:**
- Material Issue and Stock Transfer deduct from `stock_movements`
- But never consume from `stock_valuation` table
- TODO comments acknowledge this gap
- Results in:
  - Inflated valuation (ghost stock value)
  - Incorrect COGS calculations
  - Balance sheet discrepancies

**Impact:**
- Financial reports show incorrect inventory value
- COGS not properly allocated
- Audit trail incomplete

**Solution:**
```typescript
// After deducting from stock_movements, also:
1. Identify valuation batches (FIFO/LIFO/Avg)
2. Consume from stock_valuation proportionally
3. Update remaining_quantity in valuation rows
4. Mark fully consumed batches
```

**Effort:** Medium (1 week)

---

### 3. **Stock Reconciliation Unimplemented**
**Severity:** MEDIUM
**Location:** `processStockReconciliation()` - stub only

**Problem:**
- Entry type exists but process is empty
- Cannot adjust inventory to match physical counts
- No variance tracking
- Stock discrepancies accumulate without resolution path

**Impact:**
- System stock diverges from physical stock over time
- No mechanism to correct errors
- Manual DB updates required for adjustments

**Solution:**
Implement full reconciliation logic:
1. Calculate variance: `physical_quantity - system_quantity`
2. Create adjustment movements
3. Update valuations at weighted average cost
4. Log variance reasons
5. Generate variance reports

**Effort:** Medium (1 week)

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

**Impact:**
- Negative inventory
- Overselling
- Customer service issues

**Solution:**
1. Add `SELECT ... FOR UPDATE` locking
2. Or use optimistic locking with version numbers
3. Or implement reservation system
4. Move to PostgreSQL function with proper locking

**Effort:** Medium (4-5 days)

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

**Problems:**
- "Low stock only" filter uses `is_low_stock` flag
- Badge shows `is_low_stock OR quantity < minimum_threshold`
- Items can show badge but disappear when filter toggled
- `maintain_stock` field stripped before API (unused)

**Status:** FIXED in commit 9e40304

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
