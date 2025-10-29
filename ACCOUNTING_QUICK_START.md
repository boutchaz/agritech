# Accounting Module - Quick Start Guide

## 1-Minute Setup

```bash
cd project

# Apply migration
npm run db:push

# Generate types
npm run db:generate-types-remote

# Done! ✅
```

---

## What You Got

### Database Tables (11)
- `accounts` - Chart of Accounts
- `journal_entries` + `journal_items` - General Ledger
- `invoices` + `invoice_items` - AR/AP
- `payments` + `payment_allocations` - Payment matching
- `cost_centers` - Farm/parcel tracking
- `taxes` - Tax definitions
- `bank_accounts` - Bank management
- `currencies` - Multi-currency

### Features
- ✅ Double-entry bookkeeping
- ✅ Automatic GL posting from invoices
- ✅ Payment allocation
- ✅ Multi-currency support
- ✅ Cost center tracking (farms/parcels)
- ✅ Invoice aging
- ✅ Tax calculation
- ✅ RLS security

---

## File Reference

| File | Purpose |
|------|---------|
| `ACCOUNTING_MODULE_SPEC.md` | Complete technical specification |
| `ACCOUNTING_IMPLEMENTATION_GUIDE.md` | Step-by-step implementation |
| `ACCOUNTING_MODULE_SUMMARY.md` | Executive summary |
| `project/supabase/migrations/20251029203204_create_accounting_module.sql` | Database migration |
| `project/src/schemas/accounting.ts` | Zod validation schemas |

---

## Quick Commands

```bash
# Database
npm run db:push                    # Apply migration
npm run db:generate-types-remote   # Generate TS types
npm run db:diff                    # Check differences

# Verify in Supabase Dashboard
# Tables → Should see 11 new accounting tables
```

---

## Default Chart of Accounts

Will be seeded with:
```
1000 - Assets
  1100 - Current Assets
    1110 - Cash and Bank
    1120 - Accounts Receivable
    1130 - Inventory
  1200 - Fixed Assets
    1210 - Equipment
    1220 - Vehicles

2000 - Liabilities
  2100 - Current Liabilities
    2110 - Accounts Payable
    2120 - Accrued Expenses
  2200 - Long-term Liabilities
    2210 - Loans Payable

3000 - Equity
  3100 - Owner's Equity
  3200 - Retained Earnings

4000 - Revenue
  4100 - Harvest Sales
  4200 - Service Revenue

5000 - Expenses
  5100 - Cost of Goods Sold
  5200 - Operating Expenses
    5210 - Labor Costs
    5220 - Materials
    5230 - Utilities
```

---

## Next Steps

### Phase 1 (Immediate)
1. ✅ Migration applied
2. ⏳ Update CASL permissions (see guide)
3. ⏳ Create API client (see guide)
4. ⏳ Build invoice UI
5. ⏳ Build payment UI

### Phase 2 (Later)
- Reports (Balance Sheet, P&L)
- Integration with purchases/harvests
- Bank reconciliation
- Fixed assets

---

## Testing

```bash
# Create invoice
POST /rest/v1/invoices
{
  "invoice_type": "sales",
  "party_name": "Test Customer",
  "invoice_date": "2024-10-29",
  "due_date": "2024-11-29",
  "items": [
    {
      "item_name": "Harvest Product",
      "quantity": 100,
      "unit_price": 50,
      "amount": 5000
    }
  ]
}

# Invoice auto-posts to GL when status = 'submitted'
```

---

## Common Patterns

### Create Invoice
```typescript
import { useCreateInvoice } from '@/hooks/useAccounting';

const { mutate: createInvoice } = useCreateInvoice();

createInvoice({
  invoice_type: 'sales',
  party_name: 'Customer Name',
  invoice_date: new Date(),
  due_date: new Date(),
  items: [
    {
      item_name: 'Product',
      quantity: 10,
      unit_price: 100,
      amount: 1000,
    }
  ],
});
```

### Record Payment
```typescript
import { useCreatePayment } from '@/hooks/useAccounting';

const { mutate: createPayment } = useCreatePayment();

createPayment({
  payment_type: 'receive',
  party_name: 'Customer Name',
  payment_date: new Date(),
  payment_method: 'bank_transfer',
  amount: 1000,
  allocations: [
    {
      invoice_id: 'invoice-uuid',
      allocated_amount: 1000,
    }
  ],
});
```

---

## Troubleshooting

**Migration fails**:
- Check Supabase connection: `npm run db:diff`
- Verify organization table exists
- Check for conflicting table names

**Types not generated**:
- Run `npm run db:generate-types-remote`
- Restart TypeScript server in VSCode
- Check `src/types/database.types.ts`

**RLS policies blocking queries**:
- Verify user is in organization: `SELECT * FROM organization_users WHERE user_id = auth.uid()`
- Check user role: `SELECT role FROM organization_users WHERE user_id = auth.uid()`

---

## Resources

- Full spec: `ACCOUNTING_MODULE_SPEC.md`
- Implementation guide: `ACCOUNTING_IMPLEMENTATION_GUIDE.md`
- Summary: `ACCOUNTING_MODULE_SUMMARY.md`
- Architecture: `CLAUDE.md` (updated)

---

## ERPNext/Odoo Feature Parity

| Feature | Status |
|---------|--------|
| Chart of Accounts | ✅ Phase 1 |
| Journal Entries | ✅ Phase 1 |
| Sales Invoices | ✅ Phase 1 |
| Purchase Invoices | ✅ Phase 1 |
| Payments | ✅ Phase 1 |
| Cost Centers | ✅ Phase 1 |
| Multi-currency | ✅ Phase 1 |
| Bank Accounts | ✅ Phase 1 |
| Balance Sheet | ⏳ Phase 2 |
| P&L Statement | ⏳ Phase 2 |
| Fixed Assets | ⏳ Phase 2 |
| Budgets | ⏳ Phase 2 |
| Bank Reconciliation | ⏳ Phase 2 |
| Period Closing | ⏳ Phase 3 |

---

**You're ready to build!** 🎉

Start with invoice UI → test workflow → build reports → integrate modules.
