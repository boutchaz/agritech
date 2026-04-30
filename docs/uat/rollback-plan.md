# ERPNext Adaptation — Rollback Plan

## Pre-Deployment Baseline

Before deploying, capture:
- `pg_dump` of current database state
- Git commit hash of current `main` branch
- Current stock_valuation snapshot per warehouse
- Current GL balances for inventory accounts

## Rollback Scenarios

### Scenario 1: Post-Deploy Data Corruption

**Detection:** Reconciliation report shows unexpected drift > 1%

**Steps:**
1. Stop API: `docker stop agritech-api`
2. Restore DB from pre-deploy snapshot: `pg_restore -d postgres backup.sql`
3. Revert code: `git checkout <baseline-commit> -- .`
4. Rebuild: `docker compose build agritech-api`
5. Restart: `docker compose up -d agritech-api`
6. Verify: Run reconciliation report, confirm drift = 0

**RTO:** ~15 minutes
**RPO:** Zero (full snapshot restore)

### Scenario 2: Valuation Method Change Causes Incorrect COGS

**Detection:** Finance team reports unexpected COGS values

**Steps:**
1. Identify affected items: Query `items` WHERE `valuation_method` was changed
2. For each affected item, restore original valuation_method
3. Recalculate stock_valuation from stock_movements (replay from backup)
4. Post correcting journal entries if GL already posted

### Scenario 3: Delivery Note Submit Fails Mid-Transaction

**Detection:** Stock entry created but SO status not updated (or vice versa)

**Steps:**
1. Check `delivery_notes` status — if `submitted`, check if `stock_entry_id` exists
2. If stock entry exists but SO not updated: manually update `sales_order_items.delivered_quantity`
3. If SO updated but no stock entry: create compensating Material Issue
4. If both missing: delivery note submit failed, retry

### Scenario 4: Reservation Leak

**Detection:** Items show reserved qty with no open sales orders

**Steps:**
1. Query: `SELECT * FROM stock_reservations WHERE status != 'fulfilled' AND status != 'expired'`
2. Cross-reference with sales orders — if SO is cancelled/delivered, release orphaned reservations
3. Run: `releaseReservationsForReference()` for orphaned references

## Rollback Command Reference

```bash
# Full database restore
pg_restore --clean --if-exists -d postgres /backups/pre-erpnext-deploy.sql

# Code rollback
cd /path/to/agritech
git stash
git checkout <baseline-commit>
git checkout -b rollback-erpnext
pnpm install
pnpm build

# Verify reconciliation
curl -H "x-organization-id: <org-id>" -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/v1/stock-entries/gl-reconciliation
```

## Post-Rollback Verification

1. Reconciliation report shows `balanced` status
2. All stock movements are intact
3. PO/SO flows work as before
4. No orphaned reservations exist
5. Performance indexes still present (or recreated)
