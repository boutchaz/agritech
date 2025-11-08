# Ledger Integration Requirements - Complete List

Based on the database schema, here are **ALL operations that should write to the ledger** (create journal entries).

## ✅ Currently Implemented

### 1. **Utilities / Fixed Expenses** ✅ IMPLEMENTED
**Table**: `utilities`
**Status**: ✅ Fully implemented in `UtilitiesManagement.tsx`

**Journal Entry**:
```
Dr. Utilities Expense (Operating Expense)    XXX.XX
   Cr. Cash (if paid) OR Accounts Payable          XXX.XX
```

**Trigger**: When adding or updating a utility expense
**Reference**: `utilities/[id]`
**Accounts Required**:
- Expense: Utilities (Operating Expense)
- Asset: Cash/Bank
- Liability: Accounts Payable

---

## 🔴 Not Yet Implemented

### 2. **Sales Invoices** 🔴 NOT IMPLEMENTED
**Table**: `invoices` (where `invoice_type = 'sales'`)
**Link**: `journal_entry_id` column exists

**Journal Entry**:
```
Dr. Accounts Receivable                      XXX.XX
   Cr. Sales Revenue                                XXX.XX
   Cr. Sales Tax Payable                             XX.XX
```

**Trigger**: When invoice is submitted/posted
**Reference**: `invoices/[id]`
**Accounts Required**:
- Asset: Accounts Receivable
- Revenue: Sales Revenue
- Liability: Sales Tax Payable

---

### 3. **Purchase Invoices** 🔴 NOT IMPLEMENTED
**Table**: `invoices` (where `invoice_type = 'purchase'`)
**Link**: `journal_entry_id` column exists

**Journal Entry**:
```
Dr. Purchase Expense / Inventory              XXX.XX
Dr. Purchase Tax Receivable                    XX.XX
   Cr. Accounts Payable                              XXX.XX
```

**Trigger**: When invoice is submitted/posted
**Reference**: `invoices/[id]`
**Accounts Required**:
- Expense: Purchases
- Asset: Purchase Tax Receivable
- Liability: Accounts Payable

---

### 4. **Customer Payments (Received)** 🔴 NOT IMPLEMENTED
**Table**: `accounting_payments` (where `payment_type = 'receive'`)
**Link**: `journal_entry_id` column exists

**Journal Entry**:
```
Dr. Cash / Bank Account                       XXX.XX
   Cr. Accounts Receivable                           XXX.XX
```

**Trigger**: When payment is submitted/reconciled
**Reference**: `payments/[id]`
**Accounts Required**:
- Asset: Cash/Bank
- Asset: Accounts Receivable

---

### 5. **Supplier Payments (Made)** 🔴 NOT IMPLEMENTED
**Table**: `accounting_payments` (where `payment_type = 'pay'`)
**Link**: `journal_entry_id` column exists

**Journal Entry**:
```
Dr. Accounts Payable                          XXX.XX
   Cr. Cash / Bank Account                           XXX.XX
```

**Trigger**: When payment is submitted/reconciled
**Reference**: `payments/[id]`
**Accounts Required**:
- Liability: Accounts Payable
- Asset: Cash/Bank

---

### 6. **Stock/Inventory Receipts** 🔴 NOT IMPLEMENTED
**Table**: `stock_entries` (where `entry_type = 'Material Receipt'`)
**Link**: `journal_entry_id` column exists

**Journal Entry** (Perpetual Inventory):
```
Dr. Inventory / Raw Materials                 XXX.XX
   Cr. Accounts Payable OR Cash                      XXX.XX
```

**Trigger**: When stock entry is posted
**Reference**: `stock-entries/[id]`
**Accounts Required**:
- Asset: Inventory
- Liability: Accounts Payable (if on credit)
- Asset: Cash (if paid immediately)

---

### 7. **Stock/Inventory Issues** 🔴 NOT IMPLEMENTED
**Table**: `stock_entries` (where `entry_type = 'Material Issue'`)
**Link**: `journal_entry_id` column exists

**Journal Entry**:
```
Dr. Cost of Goods Sold                        XXX.XX
   Cr. Inventory / Raw Materials                     XXX.XX
```

**Trigger**: When stock is issued/consumed
**Reference**: `stock-entries/[id]`
**Accounts Required**:
- Expense: Cost of Goods Sold (COGS)
- Asset: Inventory

---

### 8. **Harvest Revenues** 🔴 NOT IMPLEMENTED
**Table**: `revenues` (where `revenue_type = 'harvest'`)
**Link**: No `journal_entry_id` column (needs to be added)

**Journal Entry**:
```
Dr. Accounts Receivable OR Cash               XXX.XX
   Cr. Harvest Revenue                               XXX.XX
```

**Trigger**: When revenue is recorded
**Reference**: `revenues/[id]`
**Accounts Required**:
- Asset: Accounts Receivable OR Cash
- Revenue: Harvest Revenue / Agricultural Sales

---

### 9. **Subsidies / Grants** 🔴 NOT IMPLEMENTED
**Table**: `revenues` (where `revenue_type = 'subsidy'`)
**Link**: No `journal_entry_id` column (needs to be added)

**Journal Entry**:
```
Dr. Grants Receivable OR Cash                 XXX.XX
   Cr. Subsidy Revenue / Grant Income                XXX.XX
```

**Trigger**: When subsidy is recorded
**Reference**: `revenues/[id]`
**Accounts Required**:
- Asset: Grants Receivable OR Cash
- Revenue: Subsidy Income

---

### 10. **Worker Salary Payments** 🔴 NOT IMPLEMENTED
**Table**: `payment_records`
**Link**: No `journal_entry_id` column (needs to be added)

**Journal Entry**:
```
Dr. Salary Expense                            XXX.XX
Dr. Payroll Tax Expense                        XX.XX
   Cr. Cash / Bank Account                           XXX.XX
   Cr. Social Security Payable                        XX.XX
   Cr. Tax Withholding Payable                        XX.XX
```

**Trigger**: When payment is made (status = 'paid')
**Reference**: `payment-records/[id]`
**Accounts Required**:
- Expense: Salary Expense
- Expense: Payroll Tax
- Asset: Cash/Bank
- Liability: Social Security Payable
- Liability: Tax Withholding Payable

---

### 11. **Purchase Orders (Upon Receipt)** 🔴 NOT IMPLEMENTED
**Table**: `purchase_orders`
**Link**: No `journal_entry_id` column

**Journal Entry** (when goods are received):
```
Dr. Inventory / Purchases                     XXX.XX
Dr. Purchase Tax Receivable                    XX.XX
   Cr. Accounts Payable                              XXX.XX
```

**Trigger**: When status changes to 'received' or 'billed'
**Reference**: `purchase-orders/[id]`
**Accounts Required**:
- Asset: Inventory
- Asset: Purchase Tax Receivable
- Liability: Accounts Payable

---

### 12. **Sales Orders (Upon Delivery)** 🔴 NOT IMPLEMENTED
**Table**: `sales_orders`
**Link**: No `journal_entry_id` column

**Journal Entry** (when goods are delivered):
```
Dr. Accounts Receivable                       XXX.XX
   Cr. Sales Revenue                                 XXX.XX
   Cr. Sales Tax Payable                              XX.XX

Dr. Cost of Goods Sold                        XXX.XX
   Cr. Inventory                                      XXX.XX
```

**Trigger**: When status changes to 'delivered' or 'invoiced'
**Reference**: `sales-orders/[id]`
**Accounts Required**:
- Asset: Accounts Receivable
- Revenue: Sales Revenue
- Liability: Sales Tax Payable
- Expense: COGS
- Asset: Inventory

---

### 13. **Depreciation (Farm Equipment)** 🔴 NOT IMPLEMENTED
**Table**: None (would need `fixed_assets` table)
**Link**: Would need `journal_entry_id` column

**Journal Entry** (periodic):
```
Dr. Depreciation Expense                      XXX.XX
   Cr. Accumulated Depreciation                      XXX.XX
```

**Trigger**: Monthly/yearly depreciation calculation
**Reference**: `depreciation/[period]`
**Accounts Required**:
- Expense: Depreciation Expense
- Contra-Asset: Accumulated Depreciation

---

### 14. **Opening Stock Balance** 🔴 NOT IMPLEMENTED
**Table**: `opening_stock_balances`
**Link**: No `journal_entry_id` column

**Journal Entry**:
```
Dr. Inventory                                 XXX.XX
   Cr. Opening Balance Equity                        XXX.XX
```

**Trigger**: When opening stock is recorded
**Reference**: `opening-stock/[id]`
**Accounts Required**:
- Asset: Inventory
- Equity: Opening Balance Equity

---

### 15. **Stock Valuation Adjustments** 🔴 NOT IMPLEMENTED
**Table**: `stock_valuation`
**Link**: No `journal_entry_id` column

**Journal Entry** (revaluation):
```
Dr. Inventory Revaluation Loss                XXX.XX
   Cr. Inventory                                      XXX.XX
```
or
```
Dr. Inventory                                 XXX.XX
   Cr. Inventory Revaluation Gain                    XXX.XX
```

**Trigger**: When stock valuation changes
**Reference**: `stock-valuation/[id]`
**Accounts Required**:
- Asset: Inventory
- Expense: Inventory Revaluation Loss
- Revenue: Inventory Revaluation Gain

---

### 16. **Harvest Records (Cost Recording)** 🔴 NOT IMPLEMENTED
**Table**: `harvest_records`
**Link**: No `journal_entry_id` column

**Journal Entry** (recording harvest cost):
```
Dr. Work in Progress / Harvest Inventory      XXX.XX
   Cr. Accumulated Production Costs                  XXX.XX
```

**Trigger**: When harvest is recorded
**Reference**: `harvest-records/[id]`
**Accounts Required**:
- Asset: Work in Progress
- Asset: Accumulated Production Costs

---

### 17. **Payment Advances to Workers** 🔴 NOT IMPLEMENTED
**Table**: `payment_advances`
**Link**: No `journal_entry_id` column

**Journal Entry**:
```
Dr. Employee Advances (Asset)                 XXX.XX
   Cr. Cash / Bank Account                           XXX.XX
```

**Trigger**: When advance is given
**Reference**: `payment-advances/[id]`
**Accounts Required**:
- Asset: Employee Advances
- Asset: Cash/Bank

---

### 18. **Loan Disbursement** 🔴 NOT IMPLEMENTED
**Table**: None (would need `loans` table)

**Journal Entry**:
```
Dr. Cash / Bank Account                       XXX.XX
   Cr. Loan Payable                                  XXX.XX
```

---

### 19. **Loan Repayment** 🔴 NOT IMPLEMENTED
**Table**: None (would need `loan_payments` table)

**Journal Entry**:
```
Dr. Loan Payable                              XXX.XX
Dr. Interest Expense                           XX.XX
   Cr. Cash / Bank Account                           XXX.XX
```

---

## Summary Statistics

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Implemented | 1 | 5% |
| 🔴 Not Implemented | 18 | 95% |

## Priority Implementation Order

### High Priority (Core Accounting)
1. ✅ **Utilities/Expenses** - DONE
2. 🔴 **Sales Invoices** - Critical for revenue tracking
3. 🔴 **Purchase Invoices** - Critical for expense tracking
4. 🔴 **Customer Payments** - Critical for cash flow
5. 🔴 **Supplier Payments** - Critical for cash flow

### Medium Priority (Inventory)
6. 🔴 **Stock Receipts** - Important for inventory management
7. 🔴 **Stock Issues** - Important for COGS calculation
8. 🔴 **Opening Stock** - Important for initial setup

### Medium Priority (Operations)
9. 🔴 **Worker Payments** - Important for labor cost tracking
10. 🔴 **Harvest Revenues** - Important for agricultural operations
11. 🔴 **Subsidies** - Important for grant tracking

### Lower Priority (Advanced)
12. 🔴 **Sales Orders** - Can use invoices instead
13. 🔴 **Purchase Orders** - Can use invoices instead
14. 🔴 **Stock Valuation** - Periodic adjustment
15. 🔴 **Depreciation** - Periodic adjustment
16. 🔴 **Payment Advances** - Can track manually initially
17. 🔴 **Harvest Cost Recording** - Advanced cost accounting
18. 🔴 **Loans** - Not all farms need this

## Implementation Pattern

All ledger integrations should follow the same pattern established in `UtilitiesManagement.tsx`:

```typescript
// 1. Create/Update the transaction record
const { data: record } = await supabase.from('table_name').insert(data);

// 2. Sync with ledger
try {
  const journalEntryId = await syncToLedger(record);

  // 3. Link journal entry to record
  await supabase.from('table_name')
    .update({ journal_entry_id: journalEntryId })
    .eq('id', record.id);
} catch (error) {
  // Record is saved but ledger sync failed
  console.error('Ledger sync error:', error);
  setError('Transaction saved but accounting entry failed');
}
```

## Database Schema Changes Needed

### Add `journal_entry_id` columns to:
- ✅ `invoices` - Already exists
- ✅ `accounting_payments` - Already exists
- ✅ `stock_entries` - Already exists
- 🔴 `revenues` - Need to add
- 🔴 `payment_records` - Need to add
- 🔴 `payment_advances` - Need to add
- 🔴 `harvest_records` - Need to add
- 🔴 `opening_stock_balances` - Need to add
- 🔴 `stock_valuation` - Need to add
- 🔴 `sales_orders` - Need to add
- 🔴 `purchase_orders` - Need to add

## Next Steps

1. **Immediate**: Set up Chart of Accounts with all required accounts
2. **Phase 1**: Implement Sales & Purchase Invoices (weeks 1-2)
3. **Phase 2**: Implement Payments (weeks 3-4)
4. **Phase 3**: Implement Inventory/Stock (weeks 5-6)
5. **Phase 4**: Implement Worker Payments & Revenues (weeks 7-8)
6. **Phase 5**: Advanced features (depreciation, loans, etc.)

## Testing Checklist

For each implementation:
- [ ] Create transaction → Journal entry created
- [ ] Update transaction → Journal entry updated
- [ ] Delete transaction → Journal entry deleted/cancelled
- [ ] Verify debit = credit (balanced entry)
- [ ] Verify correct accounts used
- [ ] Verify amounts match
- [ ] Check that entry is auto-posted
- [ ] Test with missing accounts (error handling)
- [ ] Test concurrent updates
- [ ] Verify reports reflect the transaction

---

**Last Updated**: 2025-11-07
**Status**: 1/19 operations implemented (5.3%)
