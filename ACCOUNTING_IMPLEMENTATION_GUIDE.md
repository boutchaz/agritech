# Accounting Module - Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the accounting module in the AgriTech platform.

## Phase 1: Database Setup ✅ COMPLETE

### Files Created:

1. **Migration File**: `project/supabase/migrations/20251029203204_create_accounting_module.sql`
   - 11 core accounting tables
   - RLS policies for multi-tenant security
   - Triggers for automatic calculations
   - Helper functions for number generation
   - Views for reporting

2. **Schema File**: `ACCOUNTING_MODULE_SPEC.md`
   - Complete database schema documentation
   - Integration patterns
   - UI component structure
   - Success metrics

3. **Validation Schemas**: `project/src/schemas/accounting.ts`
   - Zod schemas for all accounting entities
   - TypeScript types exported
   - Form validation ready

## Phase 2: Apply Database Migration

### Step 1: Test Locally (Recommended)

```bash
cd project

# Start local Supabase
npm run db:start

# Apply migration
npm run db:reset

# Verify tables created
# Check Supabase Studio: http://localhost:54323
```

### Step 2: Generate TypeScript Types

```bash
# Generate types from local database
npm run db:generate-types

# Or from remote (if you've already pushed)
npm run db:generate-types-remote
```

Expected output: `src/types/database.types.ts` will now include:
- `accounts` table types
- `journal_entries` table types
- `invoices` table types
- `payments` table types
- All accounting enums

### Step 3: Push to Remote (Production)

```bash
# Review changes
npm run db:diff

# Push migration
npm run db:push

# Verify in Supabase Dashboard
```

## Phase 3: Seed Default Chart of Accounts

### Create Seeding Script

Create `project/scripts/seed-accounts.ts`:

```typescript
import { supabase } from '../src/lib/supabase';

const defaultAccounts = [
  // Assets
  { code: '1000', name: 'Assets', account_type: 'Asset', is_group: true, parent_id: null },
  { code: '1100', name: 'Current Assets', account_type: 'Asset', is_group: true, parent_code: '1000' },
  { code: '1110', name: 'Cash and Bank', account_type: 'Asset', is_group: false, parent_code: '1100', account_subtype: 'Cash' },
  { code: '1120', name: 'Accounts Receivable', account_type: 'Asset', is_group: false, parent_code: '1100', account_subtype: 'Receivable' },
  { code: '1130', name: 'Inventory', account_type: 'Asset', is_group: false, parent_code: '1100', account_subtype: 'Stock' },

  { code: '1200', name: 'Fixed Assets', account_type: 'Asset', is_group: true, parent_code: '1000' },
  { code: '1210', name: 'Equipment', account_type: 'Asset', is_group: false, parent_code: '1200', account_subtype: 'Fixed Asset' },
  { code: '1220', name: 'Vehicles', account_type: 'Asset', is_group: false, parent_code: '1200', account_subtype: 'Fixed Asset' },

  // Liabilities
  { code: '2000', name: 'Liabilities', account_type: 'Liability', is_group: true, parent_id: null },
  { code: '2100', name: 'Current Liabilities', account_type: 'Liability', is_group: true, parent_code: '2000' },
  { code: '2110', name: 'Accounts Payable', account_type: 'Liability', is_group: false, parent_code: '2100', account_subtype: 'Payable' },
  { code: '2120', name: 'Accrued Expenses', account_type: 'Liability', is_group: false, parent_code: '2100', account_subtype: 'Current Liability' },

  { code: '2200', name: 'Long-term Liabilities', account_type: 'Liability', is_group: true, parent_code: '2000' },
  { code: '2210', name: 'Loans Payable', account_type: 'Liability', is_group: false, parent_code: '2200', account_subtype: 'Long-term Liability' },

  // Equity
  { code: '3000', name: 'Equity', account_type: 'Equity', is_group: true, parent_id: null },
  { code: '3100', name: "Owner's Equity", account_type: 'Equity', is_group: false, parent_code: '3000', account_subtype: 'Capital' },
  { code: '3200', name: 'Retained Earnings', account_type: 'Equity', is_group: false, parent_code: '3000', account_subtype: 'Retained Earnings' },

  // Revenue
  { code: '4000', name: 'Revenue', account_type: 'Revenue', is_group: true, parent_id: null },
  { code: '4100', name: 'Harvest Sales', account_type: 'Revenue', is_group: false, parent_code: '4000', account_subtype: 'Product Sales' },
  { code: '4200', name: 'Service Revenue', account_type: 'Revenue', is_group: false, parent_code: '4000', account_subtype: 'Service Income' },

  // Expenses
  { code: '5000', name: 'Expenses', account_type: 'Expense', is_group: true, parent_id: null },
  { code: '5100', name: 'Cost of Goods Sold', account_type: 'Expense', is_group: true, parent_code: '5000' },
  { code: '5110', name: 'Direct Materials', account_type: 'Expense', is_group: false, parent_code: '5100', account_subtype: 'COGS' },

  { code: '5200', name: 'Operating Expenses', account_type: 'Expense', is_group: true, parent_code: '5000' },
  { code: '5210', name: 'Labor Costs', account_type: 'Expense', is_group: false, parent_code: '5200', account_subtype: 'Operating Expense' },
  { code: '5220', name: 'Materials and Supplies', account_type: 'Expense', is_group: false, parent_code: '5200', account_subtype: 'Operating Expense' },
  { code: '5230', name: 'Utilities', account_type: 'Expense', is_group: false, parent_code: '5200', account_subtype: 'Operating Expense' },
  { code: '5240', name: 'Depreciation', account_type: 'Expense', is_group: false, parent_code: '5200', account_subtype: 'Depreciation' },
];

async function seedAccounts(organizationId: string) {
  const accountMap = new Map<string, string>();

  for (const account of defaultAccounts) {
    const { parent_code, ...accountData } = account;
    const parent_id = parent_code ? accountMap.get(parent_code) : null;

    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ...accountData,
        organization_id: organizationId,
        parent_id,
      })
      .select('id, code')
      .single();

    if (error) {
      console.error(`Failed to create account ${account.code}:`, error);
    } else {
      accountMap.set(data.code, data.id);
      console.log(`✓ Created account: ${data.code} - ${account.name}`);
    }
  }
}

// Usage: npx tsx scripts/seed-accounts.ts <organization_id>
const orgId = process.argv[2];
if (!orgId) {
  console.error('Usage: npx tsx scripts/seed-accounts.ts <organization_id>');
  process.exit(1);
}

seedAccounts(orgId).then(() => console.log('✓ Chart of Accounts seeded successfully'));
```

Run seeding:
```bash
npx tsx scripts/seed-accounts.ts <your-org-id>
```

## Phase 4: Implement CASL Permissions

### Update `src/lib/casl/defineAbilityFor.ts`

Add accounting permissions:

```typescript
// In the role-based permission section

// All authenticated users can read accounting data
if (user) {
  can('read', 'Account');
  can('read', 'Invoice');
  can('read', 'Payment');
  can('read', 'JournalEntry');
}

// Farm workers and above can create invoices and payments
if (isAtLeastRole('farm_worker')) {
  can('create', 'Invoice');
  can('create', 'Payment');
  can('update', 'Invoice', { status: 'draft' }); // Only draft invoices
}

// Farm managers can manage invoices and payments
if (isAtLeastRole('farm_manager')) {
  can('manage', 'Invoice');
  can('manage', 'Payment');
  can('create', 'JournalEntry');
  can('update', 'JournalEntry', { status: 'draft' });
}

// Organization admins have full accounting control
if (isAtLeastRole('organization_admin')) {
  can('manage', 'Account');
  can('manage', 'JournalEntry');
  can('manage', 'CostCenter');
  can('manage', 'Tax');
  can('manage', 'BankAccount');
  can('approve', 'JournalEntry'); // Post journals
  can('close', 'Period'); // Period closing
}
```

### Update CASL subjects

Add to `src/lib/casl/AbilityContext.tsx`:

```typescript
export type Subjects =
  | 'all'
  | 'Farm'
  | 'Parcel'
  | 'User'
  | 'SatelliteReport'
  | 'Analysis'
  | 'Task'
  | 'Account'          // New
  | 'JournalEntry'     // New
  | 'Invoice'          // New
  | 'Payment'          // New
  | 'CostCenter'       // New
  | 'Tax'              // New
  | 'BankAccount'      // New
  | 'Period';          // New
```

## Phase 5: Create API Client and Hooks

### Create `src/lib/accounting-api.ts`

```typescript
import { supabase } from './supabase';
import type { Database } from '@/types/database.types';
import type {
  CreateInvoiceInput,
  CreatePaymentInput,
  CreateJournalEntryInput,
  InvoiceFilter,
  PaymentFilter,
} from '@/schemas/accounting';

type Tables = Database['public']['Tables'];
type Account = Tables['accounts']['Row'];
type Invoice = Tables['invoices']['Row'];
type Payment = Tables['payments']['Row'];
type JournalEntry = Tables['journal_entries']['Row'];

export const accountingApi = {
  // ===== ACCOUNTS =====
  async getAccounts(organizationId: string) {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('code');

    if (error) throw error;
    return data as Account[];
  },

  async createAccount(account: CreateAccountInput, organizationId: string) {
    const { data, error } = await supabase
      .from('accounts')
      .insert({ ...account, organization_id: organizationId })
      .select()
      .single();

    if (error) throw error;
    return data as Account;
  },

  // ===== INVOICES =====
  async getInvoices(organizationId: string, filter?: InvoiceFilter) {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        invoice_items(*)
      `)
      .eq('organization_id', organizationId);

    if (filter?.invoice_type) query = query.eq('invoice_type', filter.invoice_type);
    if (filter?.status) query = query.eq('status', filter.status);
    if (filter?.start_date) query = query.gte('invoice_date', filter.start_date);
    if (filter?.end_date) query = query.lte('invoice_date', filter.end_date);

    const { data, error } = await query.order('invoice_date', { ascending: false });

    if (error) throw error;
    return data as Invoice[];
  },

  async createInvoice(invoice: CreateInvoiceInput, organizationId: string) {
    // Generate invoice number
    const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number', {
      p_organization_id: organizationId,
      p_invoice_type: invoice.invoice_type,
    });

    // Create invoice
    const { items, ...invoiceData } = invoice;
    const { data: createdInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        ...invoiceData,
        invoice_number: invoiceNumber as string,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create invoice items
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(items.map(item => ({
        ...item,
        invoice_id: createdInvoice.id,
      })));

    if (itemsError) throw itemsError;

    return createdInvoice as Invoice;
  },

  async submitInvoice(invoiceId: string, userId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        status: 'submitted',
        submitted_by: userId,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;
    return data as Invoice;
  },

  // ===== PAYMENTS =====
  async getPayments(organizationId: string, filter?: PaymentFilter) {
    let query = supabase
      .from('payments')
      .select(`
        *,
        payment_allocations(
          *,
          invoices(invoice_number, party_name)
        )
      `)
      .eq('organization_id', organizationId);

    if (filter?.payment_type) query = query.eq('payment_type', filter.payment_type);
    if (filter?.status) query = query.eq('status', filter.status);

    const { data, error } = await query.order('payment_date', { ascending: false });

    if (error) throw error;
    return data as Payment[];
  },

  async createPayment(payment: CreatePaymentInput, organizationId: string) {
    // Generate payment number
    const { data: paymentNumber } = await supabase.rpc('generate_payment_number', {
      p_organization_id: organizationId,
      p_payment_type: payment.payment_type,
    });

    // Create payment
    const { allocations, ...paymentData } = payment;
    const { data: createdPayment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        ...paymentData,
        payment_number: paymentNumber as string,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Create allocations if provided
    if (allocations && allocations.length > 0) {
      const { error: allocError } = await supabase
        .from('payment_allocations')
        .insert(allocations.map(alloc => ({
          ...alloc,
          payment_id: createdPayment.id,
        })));

      if (allocError) throw allocError;
    }

    return createdPayment as Payment;
  },

  // ===== JOURNAL ENTRIES =====
  async getJournalEntries(organizationId: string) {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_items(
          *,
          accounts(code, name)
        )
      `)
      .eq('organization_id', organizationId)
      .order('entry_date', { ascending: false });

    if (error) throw error;
    return data as JournalEntry[];
  },

  async createJournalEntry(entry: CreateJournalEntryInput, organizationId: string) {
    const { items, ...entryData } = entry;

    const { data: createdEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        ...entryData,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (entryError) throw entryError;

    // Create journal items
    const { error: itemsError } = await supabase
      .from('journal_items')
      .insert(items.map(item => ({
        ...item,
        journal_entry_id: createdEntry.id,
      })));

    if (itemsError) throw itemsError;

    return createdEntry as JournalEntry;
  },

  async postJournalEntry(entryId: string, userId: string) {
    const { data, error } = await supabase
      .from('journal_entries')
      .update({
        status: 'posted',
        posted_by: userId,
        posted_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;
    return data as JournalEntry;
  },
};
```

### Create Custom Hooks

Create `src/hooks/useAccounting.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountingApi } from '@/lib/accounting-api';
import { useAuth } from '@/hooks/useAuth';
import type {
  CreateInvoiceInput,
  CreatePaymentInput,
  CreateJournalEntryInput,
} from '@/schemas/accounting';

export const accountingKeys = {
  accounts: (orgId: string) => ['accounting', 'accounts', orgId] as const,
  invoices: (orgId: string, filter?: any) => ['accounting', 'invoices', orgId, filter] as const,
  invoice: (id: string) => ['accounting', 'invoice', id] as const,
  payments: (orgId: string, filter?: any) => ['accounting', 'payments', orgId, filter] as const,
  payment: (id: string) => ['accounting', 'payment', id] as const,
  journals: (orgId: string) => ['accounting', 'journals', orgId] as const,
};

// Accounts
export const useAccounts = () => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: accountingKeys.accounts(currentOrganization?.id || ''),
    queryFn: () => accountingApi.getAccounts(currentOrganization!.id),
    enabled: !!currentOrganization,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Invoices
export const useInvoices = (filter?: any) => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: accountingKeys.invoices(currentOrganization?.id || '', filter),
    queryFn: () => accountingApi.getInvoices(currentOrganization!.id, filter),
    enabled: !!currentOrganization,
  });
};

export const useCreateInvoice = () => {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoice: CreateInvoiceInput) =>
      accountingApi.createInvoice(invoice, currentOrganization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountingKeys.invoices(currentOrganization!.id),
      });
    },
  });
};

// Payments
export const usePayments = (filter?: any) => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: accountingKeys.payments(currentOrganization?.id || '', filter),
    queryFn: () => accountingApi.getPayments(currentOrganization!.id, filter),
    enabled: !!currentOrganization,
  });
};

export const useCreatePayment = () => {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payment: CreatePaymentInput) =>
      accountingApi.createPayment(payment, currentOrganization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountingKeys.payments(currentOrganization!.id),
      });
      queryClient.invalidateQueries({
        queryKey: accountingKeys.invoices(currentOrganization!.id),
      });
    },
  });
};

// Journal Entries
export const useJournalEntries = () => {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: accountingKeys.journals(currentOrganization?.id || ''),
    queryFn: () => accountingApi.getJournalEntries(currentOrganization!.id),
    enabled: !!currentOrganization,
  });
};

export const useCreateJournalEntry = () => {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entry: CreateJournalEntryInput) =>
      accountingApi.createJournalEntry(entry, currentOrganization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountingKeys.journals(currentOrganization!.id),
      });
    },
  });
};
```

## Phase 6: Build UI Components

### 1. Create Accounting Routes

```
project/src/routes/
├── _authenticated.accounting.tsx           # Layout
├── _authenticated.accounting.index.tsx     # Dashboard
├── _authenticated.accounting.accounts.tsx  # Chart of Accounts
├── _authenticated.accounting.invoices.tsx  # Invoice list
├── _authenticated.accounting.invoices.$id.tsx # Invoice detail
├── _authenticated.accounting.payments.tsx  # Payment list
├── _authenticated.accounting.journal.tsx   # Journal entries
└── _authenticated.accounting.reports.tsx   # Reports
```

### 2. Create Component Structure

```
project/src/components/Accounting/
├── Accounts/
│   └── ChartOfAccounts.tsx
├── Invoices/
│   ├── InvoiceList.tsx
│   ├── InvoiceForm.tsx
│   └── InvoiceView.tsx
├── Payments/
│   ├── PaymentList.tsx
│   └── PaymentForm.tsx
├── Journal/
│   ├── JournalList.tsx
│   └── JournalForm.tsx
└── Reports/
    ├── BalanceSheet.tsx
    └── ProfitAndLoss.tsx
```

## Phase 7: Integration with Existing Modules

### 1. Purchases Integration

In `src/components/Stock/StockManagement.tsx`, add invoice creation:

```typescript
const createInvoiceFromPurchase = async (purchase) => {
  await accountingApi.createInvoice({
    invoice_type: 'purchase',
    party_type: 'Supplier',
    party_id: purchase.supplier_id,
    party_name: purchase.supplier_name,
    invoice_date: new Date(purchase.date),
    due_date: new Date(purchase.due_date),
    items: purchase.items.map(item => ({
      item_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.quantity * item.unit_price,
    })),
  }, organizationId);
};
```

### 2. Harvests Integration

When harvest is sold, create sales invoice automatically.

### 3. Tasks Integration

Monthly cron job to create labor cost journals.

## Next Steps

1. **Apply migration**: Run `npm run db:push`
2. **Generate types**: Run `npm run db:generate-types-remote`
3. **Seed accounts**: Run seeding script for your organization
4. **Update CASL**: Add accounting permissions
5. **Build UI**: Create routes and components
6. **Test workflow**: Create invoice → record payment → check ledger
7. **Build reports**: Implement Balance Sheet and P&L queries
8. **Integration**: Connect with purchases and harvests

## Testing Checklist

- [ ] Create sales invoice with multiple items
- [ ] Submit invoice (should auto-post to GL)
- [ ] Record payment and allocate to invoice
- [ ] Verify invoice status changes to 'paid'
- [ ] Check journal entries are balanced
- [ ] View ledger for each account
- [ ] Generate Balance Sheet
- [ ] Generate Profit & Loss
- [ ] Test RLS policies (different users/roles)
- [ ] Test multi-currency support

## Documentation

- Spec: `ACCOUNTING_MODULE_SPEC.md`
- Migration: `project/supabase/migrations/20251029203204_create_accounting_module.sql`
- Schemas: `project/src/schemas/accounting.ts`
- CLAUDE.md: Updated with accounting section
