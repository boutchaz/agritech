# International Ledger Integration - Implementation Guide

## Overview

This guide shows how to implement automatic ledger integration with international chart of accounts support for Morocco, France, USA, UK, and Germany.

## What's Been Created

### 1. Chart of Accounts Seed Scripts ✅

**Location**: `supabase/seed/chart-of-accounts/`

| File | Country | Currency | Standard | Accounts |
|------|---------|----------|----------|----------|
| `morocco-mad.sql` | 🇲🇦 Morocco | MAD | CGNC | ~150 |
| `france-eur.sql` | 🇫🇷 France | EUR | PCG | ~120 |
| `usa-usd.sql` | 🇺🇸 USA | USD | GAAP | TBD |
| `uk-gbp.sql` | 🇬🇧 UK | GBP | UK GAAP | TBD |
| `germany-eur.sql` | 🇩🇪 Germany | EUR | HGB | TBD |

**Features**:
- Complete agricultural chart of accounts
- Asset, Liability, Equity, Revenue, Expense accounts
- Inventory management accounts
- Tax accounts (TVA, Sales Tax, etc.)
- Depreciation accounts
- Bilingual descriptions (FR/AR for Morocco)
- Hierarchical structure with groups and detail accounts

### 2. TypeScript Seeding Utility ✅

**File**: `src/lib/seed-chart-of-accounts.ts`

**Functions**:
```typescript
// Seed chart based on country
await seedChartOfAccounts(orgId, 'MAR', 'MAD');

// Auto-seed during onboarding
await autoSeedChartOfAccounts(orgId, 'MA', 'MAD');

// Check if accounts exist
const hasAccounts = await hasExistingAccounts(orgId);

// Get country info
const currency = getDefaultCurrency('MAR');
const chartName = getChartName('MAR');
```

### 3. Ledger Integration Library ✅

**File**: `src/lib/ledger-integration.ts`

**Functions**:
```typescript
// Invoices
await syncInvoiceToLedger(invoice, userId);
await syncSalesInvoiceToLedger(invoice, userId);
await syncPurchaseInvoiceToLedger(invoice, userId);

// Payments
await syncPaymentToLedger(payment, userId);
await syncCustomerPaymentToLedger(payment, userId);
await syncSupplierPaymentToLedger(payment, userId);

// Utilities
await linkJournalEntry('invoices', invoiceId, journalEntryId);
await deleteLinkedJournalEntry(journalEntryId);
clearAccountCache();
```

---

## Step-by-Step Implementation

### Step 1: Deploy Seed Functions to Database

```bash
# Apply the seed functions
cd project

# Apply Morocco chart
psql -h your-host -U postgres -d postgres \
  -f supabase/seed/chart-of-accounts/morocco-mad.sql

# Apply France chart
psql -h your-host -U postgres -d postgres \
  -f supabase/seed/chart-of-accounts/france-eur.sql

# Or use Supabase CLI
npx supabase db push
```

### Step 2: Integrate Chart Seeding into Onboarding

Update your onboarding flow to automatically seed accounts:

**File**: `src/components/OnboardingFlow.tsx` or `src/utils/authSetup.ts`

```typescript
import { autoSeedChartOfAccounts } from '@/lib/seed-chart-of-accounts';

// After organization creation
const { data: org } = await supabase
  .from('organizations')
  .insert({ name, slug, country: 'MA', currency_code: 'MAD' })
  .select()
  .single();

// Automatically seed chart of accounts
const seedResult = await autoSeedChartOfAccounts(
  org.id,
  org.country || 'MA',
  org.currency_code || 'MAD'
);

if (!seedResult.success) {
  console.error('Failed to seed accounts:', seedResult.message);
  // Show warning but don't block onboarding
}
```

### Step 3: Implement Invoice Ledger Integration

**Example**: Update your invoice creation/update logic

**File**: `src/components/Invoices/InvoiceForm.tsx` or API route

```typescript
import { syncInvoiceToLedger, linkJournalEntry } from '@/lib/ledger-integration';

async function handleSaveInvoice(invoiceData) {
  try {
    // 1. Save invoice to database
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (error) throw error;

    // 2. Sync to ledger (resilient - won't fail if accounts missing)
    try {
      const result = await syncInvoiceToLedger(invoice, user.id);

      if (result.success && result.journalEntryId) {
        // Link journal entry to invoice
        await linkJournalEntry('invoices', invoice.id, result.journalEntryId);

        showSuccess('Invoice created and posted to ledger');
      } else {
        // Invoice saved but ledger sync failed
        showWarning(
          `Invoice created successfully.\n\n` +
          `⚠️ Ledger entry not created: ${result.error}\n\n` +
          `→ Please configure your chart of accounts.`
        );
      }
    } catch (ledgerError) {
      console.error('Ledger sync error:', ledgerError);
      showWarning('Invoice created but ledger sync failed');
    }

  } catch (error) {
    showError('Failed to create invoice');
  }
}
```

### Step 4: Implement Payment Ledger Integration

**Example**: Update your payment creation logic

```typescript
import { syncPaymentToLedger, linkJournalEntry } from '@/lib/ledger-integration';

async function handleCreatePayment(paymentData) {
  try {
    // 1. Save payment
    const { data: payment, error } = await supabase
      .from('accounting_payments')
      .insert(paymentData)
      .select()
      .single();

    if (error) throw error;

    // 2. Sync to ledger
    try {
      const result = await syncPaymentToLedger(payment, user.id);

      if (result.success && result.journalEntryId) {
        await linkJournalEntry('accounting_payments', payment.id, result.journalEntryId);
        showSuccess('Payment recorded and posted to ledger');
      } else {
        showWarning(`Payment recorded but ledger entry failed: ${result.error}`);
      }
    } catch (ledgerError) {
      console.error('Ledger sync error:', ledgerError);
    }

  } catch (error) {
    showError('Failed to create payment');
  }
}
```

### Step 5: Handle Updates and Deletions

```typescript
// Update invoice - update journal entry
async function handleUpdateInvoice(invoiceId, updates) {
  const { data: invoice } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', invoiceId)
    .select()
    .single();

  if (invoice.journal_entry_id) {
    // Delete old entry and create new one
    await deleteLinkedJournalEntry(invoice.journal_entry_id);
    const result = await syncInvoiceToLedger(invoice, user.id);
    if (result.success) {
      await linkJournalEntry('invoices', invoice.id, result.journalEntryId);
    }
  }
}

// Delete invoice - delete journal entry
async function handleDeleteInvoice(invoice) {
  if (invoice.journal_entry_id) {
    await deleteLinkedJournalEntry(invoice.journal_entry_id);
  }
  await supabase.from('invoices').delete().eq('id', invoice.id);
}
```

---

## Testing the Implementation

### Test 1: Seed Chart of Accounts

```typescript
// In browser console or test file
import { seedChartOfAccounts } from '@/lib/seed-chart-of-accounts';

// Get your organization ID
const orgId = 'your-org-id-here';

// Seed Moroccan chart
const result = await seedChartOfAccounts(orgId, 'MAR', 'MAD');
console.log(result);
// Expected: { accountsCreated: 150, success: true, message: '...' }

// Verify accounts were created
const { data: accounts } = await supabase
  .from('accounts')
  .select('code, name, account_type')
  .eq('organization_id', orgId)
  .order('code');

console.log(accounts); // Should show ~150 accounts
```

### Test 2: Create Sales Invoice with Ledger Sync

```typescript
const invoice = {
  invoice_type: 'sales',
  invoice_number: 'INV-001',
  invoice_date: '2025-11-07',
  customer_id: 'customer-id',
  subtotal: 1000,
  tax_amount: 200,
  total_amount: 1200,
  organization_id: orgId,
  status: 'posted',
};

const result = await syncInvoiceToLedger(invoice, userId);
console.log(result);
// Expected: { journalEntryId: 'uuid', success: true }

// Check journal entry was created
const { data: entry } = await supabase
  .from('journal_entries')
  .select('*, journal_items(*)')
  .eq('id', result.journalEntryId)
  .single();

console.log(entry);
// Expected:
// - entry.reference_type === 'sales_invoice'
// - entry.items.length === 3 (receivable, revenue, tax)
// - sum(debit) === sum(credit) === 1200
```

### Test 3: Create Payment with Ledger Sync

```typescript
const payment = {
  payment_type: 'receive',
  payment_number: 'PAY-001',
  payment_date: '2025-11-07',
  amount: 1200,
  payment_method: 'bank_transfer',
  customer_id: 'customer-id',
  organization_id: orgId,
};

const result = await syncPaymentToLedger(payment, userId);
console.log(result);
// Expected: { journalEntryId: 'uuid', success: true }
```

---

## Account Mapping Reference

### Sales Invoice Mapping

| Line Item | Account Type | Moroccan Code | French Code |
|-----------|--------------|---------------|-------------|
| Accounts Receivable (Dr) | Asset - Receivable | 3420 | 411 |
| Sales Revenue (Cr) | Revenue - Operating | 7111 | 701 |
| Sales Tax Payable (Cr) | Liability - Tax | 4457 | 44571 |

### Purchase Invoice Mapping

| Line Item | Account Type | Moroccan Code | French Code |
|-----------|--------------|---------------|-------------|
| Purchase Expense (Dr) | Expense - Operating | 6110 | 601 |
| Purchase Tax Receivable (Dr) | Asset - Tax | 4456 | 44566 |
| Accounts Payable (Cr) | Liability - Payable | 4410 | 401 |

### Customer Payment Mapping

| Line Item | Account Type | Moroccan Code | French Code |
|-----------|--------------|---------------|-------------|
| Cash/Bank (Dr) | Asset - Cash | 5141 | 512 |
| Accounts Receivable (Cr) | Asset - Receivable | 3420 | 411 |

### Supplier Payment Mapping

| Line Item | Account Type | Moroccan Code | French Code |
|-----------|--------------|---------------|-------------|
| Accounts Payable (Dr) | Liability - Payable | 4410 | 401 |
| Cash/Bank (Cr) | Asset - Cash | 5141 | 512 |

---

## Error Handling

The ledger integration is designed to be **resilient**:

1. ✅ **Transaction never fails** - Original transaction (invoice, payment) is always saved
2. ⚠️ **Ledger sync failures are logged** - User is informed but can continue
3. 🔄 **Can retry later** - Journal entries can be created manually later
4. 📊 **Clear error messages** - Users know exactly what's missing

### Common Errors and Solutions

#### Error: "Account of type 'X' not found"

**Cause**: Chart of accounts not seeded or incomplete

**Solution**:
1. Run the seeding script for your country
2. Or create the missing accounts manually in `/accounting-accounts`

#### Error: "Organization ID is required"

**Cause**: Invoice/payment missing organization_id

**Solution**: Ensure all records include organization_id

#### Error: "Debit and credit must be balanced"

**Cause**: Math error in journal entry calculation

**Solution**: Check tax calculation and subtotals

---

## Next Steps

### Immediate (This Sprint)
1. ✅ Deploy seed functions to database
2. ✅ Test seeding with your organization
3. 🔄 Integrate invoice ledger sync
4. 🔄 Integrate payment ledger sync
5. 🔄 Test end-to-end workflow

### Short Term (Next Sprint)
6. Implement stock movement ledger sync
7. Implement worker payment ledger sync
8. Implement harvest revenue ledger sync

### Long Term
9. Add USA, UK, Germany chart seed scripts
10. Add depreciation automation
11. Add bank reconciliation integration

---

## Files Reference

| File | Purpose |
|------|---------|
| `supabase/seed/chart-of-accounts/morocco-mad.sql` | Moroccan chart seeding function |
| `supabase/seed/chart-of-accounts/france-eur.sql` | French chart seeding function |
| `src/lib/seed-chart-of-accounts.ts` | TypeScript seeding utility |
| `src/lib/ledger-integration.ts` | Core ledger sync functions |
| `src/lib/accounting-api.ts` | Accounting API client |
| `LEDGER_INTEGRATION_REQUIREMENTS.md` | Complete list of operations needing integration |
| `INTERNATIONAL_LEDGER_IMPLEMENTATION.md` | This guide |

---

## Support

For questions or issues:
1. Check the error messages - they're designed to be helpful
2. Review the account mapping reference above
3. Check browser console for detailed logs
4. Verify chart of accounts exists in `/accounting-accounts`

**Status**: Ready for implementation 🚀
**Estimated Effort**: 2-3 days for complete integration
**Priority**: High - Core accounting functionality
