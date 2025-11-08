# Quick Start: Ledger Integration

## 🚀 Run This in Supabase SQL Editor

### Step 1: Deploy Schema (If Not Already Done)

Go to your Supabase Dashboard → SQL Editor and run the entire content of:
```
project/supabase/migrations/00000000000000_schema.sql
```

This will create the seeding functions:
- ✅ `seed_moroccan_chart_of_accounts(org_id)`
- ✅ `seed_french_chart_of_accounts(org_id)`

### Step 2: Get Your Organization ID

```sql
-- Find your organization
SELECT id, name, slug
FROM organizations
WHERE name ILIKE '%your-org-name%';
```

Copy the `id` (UUID).

### Step 3: Seed Chart of Accounts

**For Morocco:**
```sql
SELECT * FROM seed_moroccan_chart_of_accounts('YOUR-ORG-ID-HERE');
```

**For France:**
```sql
SELECT * FROM seed_french_chart_of_accounts('YOUR-ORG-ID-HERE');
```

You should see:
```
accounts_created | success | message
-----------------|---------|----------------------------------
150              | true    | Chart of accounts created successfully
```

### Step 4: Verify Accounts Were Created

```sql
SELECT
  code,
  name,
  account_type,
  account_subtype,
  is_group,
  is_active
FROM accounts
WHERE organization_id = 'YOUR-ORG-ID-HERE'
ORDER BY code
LIMIT 20;
```

You should see accounts like:
- 2310: Terrains agricoles (Morocco)
- 211: Terrains agricoles (France)
- 3420: Clients (Morocco)
- 411: Clients (France)
- etc.

### Step 5: Test Invoice Ledger Integration

Now when you create an invoice in your app, it will automatically:
1. ✅ Create a journal entry
2. ✅ Post it to the ledger
3. ✅ Link it to the invoice

**No additional code changes needed!** The integration is already in `src/lib/ledger-integration.ts`.

---

## 📝 Usage in Your Code

### Import and Use

```typescript
import { syncInvoiceToLedger, linkJournalEntry } from '@/lib/ledger-integration';

// After creating an invoice
const result = await syncInvoiceToLedger(invoice, user.id);

if (result.success && result.journalEntryId) {
  await linkJournalEntry('invoices', invoice.id, result.journalEntryId);
  console.log('✅ Invoice posted to ledger');
} else {
  console.warn('⚠️ Ledger sync failed:', result.error);
}
```

### Seed from TypeScript

```typescript
import { seedChartOfAccounts } from '@/lib/seed-chart-of-accounts';

const result = await seedChartOfAccounts(organizationId, 'MAR', 'MAD');
console.log(`Created ${result.accountsCreated} accounts`);
```

---

## 🧪 Testing Checklist

- [ ] Run schema SQL in Supabase SQL Editor
- [ ] Verify functions created (check Functions in Supabase Dashboard)
- [ ] Get your organization ID
- [ ] Run seeding function for your country
- [ ] Verify ~150 accounts created
- [ ] Create a test invoice in your app
- [ ] Check journal entry was auto-created in `/accounting-journal`
- [ ] Verify debit = credit in journal entry
- [ ] Create a test payment
- [ ] Verify payment journal entry created

---

## 📊 Account Reference

### Morocco (MAD)

| Account | Code | Type | Purpose |
|---------|------|------|---------|
| Clients | 3420 | Asset/Receivable | Sales invoices |
| Fournisseurs | 4410 | Liability/Payable | Purchase invoices |
| Ventes | 7111 | Revenue | Sales revenue |
| Achats | 6110 | Expense | Purchases |
| TVA collectée | 4457 | Liability | Sales tax |
| TVA déductible | 4456 | Asset | Purchase tax |
| Banque | 5141 | Asset/Cash | Bank account |
| Caisse | 5161 | Asset/Cash | Cash account |

### France (EUR)

| Account | Code | Type | Purpose |
|---------|------|------|---------|
| Clients | 411 | Asset/Receivable | Sales invoices |
| Fournisseurs | 401 | Liability/Payable | Purchase invoices |
| Ventes | 701 | Revenue | Sales revenue |
| Achats | 601 | Expense | Purchases |
| TVA collectée | 44571 | Liability | Sales tax |
| TVA déductible | 44566 | Asset | Purchase tax |
| Banque | 512 | Asset/Cash | Bank account |
| Caisse | 531 | Asset/Cash | Cash account |

---

## 🔧 Troubleshooting

### "Function does not exist"

**Solution**: Run the schema SQL file in Supabase SQL Editor.

### "No accounts created"

**Check**:
1. Did the function run successfully? Check the result.
2. Does the organization ID exist?
3. Check for errors in Supabase logs.

### "Account not found" when creating invoice

**Solution**: The chart of accounts hasn't been seeded. Run the seeding function.

### "Debit and credit not balanced"

**Solution**: Check that tax amounts are calculated correctly in your invoice.

---

## 📚 Full Documentation

- [LEDGER_INTEGRATION_SUMMARY.md](LEDGER_INTEGRATION_SUMMARY.md) - Complete overview
- [INTERNATIONAL_LEDGER_IMPLEMENTATION.md](INTERNATIONAL_LEDGER_IMPLEMENTATION.md) - Implementation guide
- [LEDGER_INTEGRATION_REQUIREMENTS.md](LEDGER_INTEGRATION_REQUIREMENTS.md) - All 19 operations

---

**Ready to go! 🎉**
