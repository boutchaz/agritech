# Double-Entry Bookkeeping - Quick Reference

## The Golden Rule

**Every journal entry MUST have: Total Debits = Total Credits**

Tolerance: 0.01 (for rounding)

---

## Account Types & Normal Balances

| Account Type | Increase | Decrease | Examples |
|-------------|----------|----------|----------|
| **Asset** | Debit ↑ | Credit ↓ | Cash, Receivables, Inventory, Equipment |
| **Liability** | Credit ↑ | Debit ↓ | Payables, Loans, Taxes Payable |
| **Equity** | Credit ↑ | Debit ↓ | Capital, Retained Earnings |
| **Revenue** | Credit ↑ | Debit ↓ | Sales, Service Revenue |
| **Expense** | Debit ↑ | Credit ↓ | Salaries, Rent, Utilities, Cost of Goods |

---

## Common Journal Entries

### 1. Sale on Credit
```
Dr. Accounts Receivable     500
   Cr. Sales Revenue            500
```

### 2. Purchase on Credit
```
Dr. Expense/Inventory       1,000
   Cr. Accounts Payable          1,000
```

### 3. Receive Payment
```
Dr. Cash                    500
   Cr. Accounts Receivable       500
```

### 4. Make Payment
```
Dr. Accounts Payable        1,000
   Cr. Cash                      1,000
```

### 5. Pay Expense
```
Dr. Expense                 200
   Cr. Cash                      200
```

### 6. Sale with Tax (20%)
```
Dr. Accounts Receivable     1,200
   Cr. Sales Revenue             1,000
   Cr. Tax Payable                 200
```

---

## System Architecture

### Three-Layer Protection

```
┌─────────────────────────────────────────┐
│  Layer 1: Application Validation        │
│  - NestJS Service                       │
│  - Edge Functions                       │
│  - Validates BEFORE insert              │
│  - Fast failure with clear errors       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Layer 2: Database Trigger              │
│  - Auto-calculates totals               │
│  - Fires on INSERT/UPDATE/DELETE        │
│  - Updates journal_entries              │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  Layer 3: Database Constraint           │
│  - CHECK (|debit - credit| < 0.01)      │
│  - Final enforcement                    │
│  - Cannot be bypassed                   │
└─────────────────────────────────────────┘
```

---

## Creating Journal Entries

### Option A: Through Invoices (Automatic)

```typescript
// Frontend: Post invoice
await postInvoice(invoiceId, postingDate);

// Backend: Edge function creates journal entry automatically
// - Sales invoice: Dr. AR, Cr. Revenue + Tax Payable
// - Purchase invoice: Dr. Expense + Tax Receivable, Cr. AP
```

### Option B: Through Payments (Automatic)

```typescript
// Frontend: Allocate payment to invoices
await allocatePayment(paymentId, allocations);

// Backend: Edge function creates journal entry automatically
// - Receive: Dr. Cash, Cr. AR
// - Pay: Dr. AP, Cr. Cash
```

### Option C: Through NestJS (Cost/Revenue)

```typescript
// Backend: Create cost entry
await accountingAutomationService.createJournalEntryFromCost(
  organizationId,
  costId,
  'labor',
  200,
  new Date(),
  'Harvesting labor',
  userId
);

// Creates: Dr. Labor Expense, Cr. Cash
```

### Option D: Manual Entry (Future Feature)

```typescript
// Planned: Manual journal entry form
const entry = {
  entry_date: '2025-12-01',
  description: 'Adjustment entry',
  items: [
    { account_id: 'xxx', debit: 100, credit: 0 },
    { account_id: 'yyy', debit: 0, credit: 100 }
  ]
};
```

---

## Validation Rules

### ✅ Valid Entry

```typescript
const items = [
  { account_id: 'cash', debit: 500, credit: 0 },
  { account_id: 'revenue', debit: 0, credit: 500 }
];

const totalDebit = items.reduce((sum, i) => sum + i.debit, 0);  // 500
const totalCredit = items.reduce((sum, i) => sum + i.credit, 0); // 500

Math.abs(totalDebit - totalCredit) < 0.01  // true ✅
```

### ❌ Invalid Entry

```typescript
const items = [
  { account_id: 'cash', debit: 500, credit: 0 },
  { account_id: 'revenue', debit: 0, credit: 400 }  // Unbalanced!
];

// Error: "Journal entry is not balanced: debits=500, credits=400"
```

---

## Troubleshooting

### Problem: Entry won't save

**Check 1**: Are debits = credits?
```sql
SELECT
  SUM(debit) as debits,
  SUM(credit) as credits,
  SUM(debit) - SUM(credit) as difference
FROM journal_items
WHERE journal_entry_id = '<id>';
```

**Check 2**: Is the difference within tolerance?
```javascript
Math.abs(totalDebit - totalCredit) < 0.01  // Must be true
```

**Check 3**: Does the trigger exist?
```sql
SELECT * FROM pg_trigger
WHERE tgname = 'trg_recalculate_journal_totals';
```

---

### Problem: Totals show 0

**Cause**: Trigger not calculating

**Fix**: Manually recalculate
```sql
UPDATE journal_entries je
SET
  total_debit = (SELECT COALESCE(SUM(debit), 0) FROM journal_items WHERE journal_entry_id = je.id),
  total_credit = (SELECT COALESCE(SUM(credit), 0) FROM journal_items WHERE journal_entry_id = je.id)
WHERE id = '<entry_id>';
```

---

### Problem: Account mapping missing

**Error**: `Account mapping missing for cost_type: labor`

**Fix**: Create mapping
```sql
INSERT INTO account_mappings (
  organization_id,
  mapping_type,
  mapping_key,
  account_id,
  is_active
) VALUES (
  '<org_id>',
  'cost_type',
  'labor',
  '<labor_expense_account_id>',
  true
);
```

---

## Required GL Accounts

Your organization needs these accounts for automatic journal entries:

| Code | Name | Type | Used For |
|------|------|------|----------|
| **1110** | Cash/Bank | Asset | All cash transactions |
| **1200** | Accounts Receivable | Asset | Sales invoices |
| **1400** | Tax Receivable (VAT Input) | Asset | Purchase tax |
| **2110** | Accounts Payable | Liability | Purchase invoices |
| **2150** | Tax Payable (VAT Output) | Liability | Sales tax |
| **4000** | Sales Revenue | Revenue | Sales invoices |
| **5xxx** | Various Expenses | Expense | Cost entries |

---

## Code Locations

### Frontend
- **Route**: `project/src/routes/accounting-journal.tsx`
- **Hook**: `project/src/hooks/useJournalEntries.ts`

### Backend - NestJS
- **Service**: `agritech-api/src/modules/journal-entries/accounting-automation.service.ts`
- **Controller**: `agritech-api/src/modules/journal-entries/journal-entries.controller.ts`
- **DTO**: `agritech-api/src/modules/journal-entries/dto/create-journal-entry.dto.ts`

### Backend - Edge Functions
- **Invoice**: `project/supabase/functions/post-invoice/index.ts`
- **Payment**: `project/supabase/functions/allocate-payment/index.ts`
- **Helpers**: `project/supabase/functions/_shared/ledger.ts`

### Database
- **Schema**: `project/supabase/migrations/00000000000000_schema.sql` (lines 1150-1200)
- **Trigger**: `project/supabase/migrations/20251201000000_fix_journal_entry_totals.sql`

---

## Testing

### Test Balanced Entry
```typescript
// Should succeed
const balancedEntry = {
  items: [
    { account_id: 'cash', debit: 100, credit: 0 },
    { account_id: 'revenue', debit: 0, credit: 100 }
  ]
};
```

### Test Unbalanced Entry
```typescript
// Should fail with clear error
const unbalancedEntry = {
  items: [
    { account_id: 'cash', debit: 100, credit: 0 },
    { account_id: 'revenue', debit: 0, credit: 90 }
  ]
};
// Error: "Journal entry is not balanced: debits=100, credits=90"
```

---

## Key Takeaways

1. **Always validate** before inserting journal_items
2. **Trigger calculates** totals automatically
3. **Constraint enforces** balance at database level
4. **Use account mappings** for dynamic account selection
5. **Start with DRAFT**, post after validation
6. **Rollback on failure** to maintain consistency
7. **Document references** for audit trail

---

## Learn More

- Full documentation: `.claude/accounting.md`
- Fix summary: `DOUBLE_ENTRY_FIX_SUMMARY.md`
- External resources:
  - [Accounting Coach](https://www.accountingcoach.com/debits-and-credits/explanation)
  - [Martin Fowler Patterns](https://martinfowler.com/bliki/AccountingPatterns.html)
