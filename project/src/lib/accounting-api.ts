/**
 * Accounting API Client
 *
 * Provides functions for interacting with the accounting module tables.
 * All functions use Supabase client with RLS policies enforced.
 */

import { supabase } from './supabase';
import type { Database } from '@/types/database.types';
import type {
  CreateAccountInput,
  UpdateAccountInput,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  CreatePaymentInput,
  UpdatePaymentInput,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  CreateCostCenterInput,
  UpdateCostCenterInput,
  CreateTaxInput,
  UpdateTaxInput,
  CreateBankAccountInput,
  UpdateBankAccountInput,
  InvoiceFilter,
  PaymentFilter,
  LedgerFilter,
} from '@/schemas/accounting';

type Tables = Database['public']['Tables'];
type Account = Tables['accounts']['Row'];
type Invoice = Tables['invoices']['Row'];
type InvoiceWithItems = Invoice & { invoice_items: Tables['invoice_items']['Row'][] };
type AccountingPayment = Tables['accounting_payments']['Row'];
type PaymentWithAllocations = AccountingPayment & {
  payment_allocations: (Tables['payment_allocations']['Row'] & {
    invoices: Pick<Invoice, 'invoice_number' | 'party_name'> | null;
  })[];
};
type JournalEntry = Tables['journal_entries']['Row'];
type JournalEntryWithItems = JournalEntry & {
  journal_items: (Tables['journal_items']['Row'] & {
    accounts: Pick<Account, 'code' | 'name'> | null;
  })[];
};
type CostCenter = Tables['cost_centers']['Row'];
type Tax = Tables['taxes']['Row'];
type BankAccount = Tables['bank_accounts']['Row'];

export const accountingApi = {
  // =====================================================
  // ACCOUNTS (Chart of Accounts)
  // =====================================================

  async getAccounts(organizationId: string) {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('code');

    if (error) throw error;
    return data as Account[];
  },

  async getAccount(accountId: string) {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (error) throw error;
    return data as Account;
  },

  async createAccount(account: CreateAccountInput, organizationId: string, userId: string) {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        ...account,
        organization_id: organizationId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Account;
  },

  async updateAccount(accountUpdate: UpdateAccountInput) {
    const { id, ...updates } = accountUpdate;
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Account;
  },

  async deleteAccount(accountId: string) {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId);

    if (error) throw error;
  },

  // =====================================================
  // INVOICES
  // =====================================================

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
    if (filter?.start_date) query = query.gte('invoice_date', filter.start_date.toISOString().split('T')[0]);
    if (filter?.end_date) query = query.lte('invoice_date', filter.end_date.toISOString().split('T')[0]);
    if (filter?.party_name) query = query.ilike('party_name', `%${filter.party_name}%`);
    if (filter?.farm_id) query = query.eq('farm_id', filter.farm_id);
    if (filter?.parcel_id) query = query.eq('parcel_id', filter.parcel_id);

    const { data, error} = await query.order('invoice_date', { ascending: false });

    if (error) throw error;
    return data as InvoiceWithItems[];
  },

  async getInvoice(invoiceId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (error) throw error;
    return data as InvoiceWithItems;
  },

  async createInvoice(invoice: CreateInvoiceInput, organizationId: string, userId: string) {
    // Generate invoice number
    const { data: invoiceNumber, error: numberError } = await supabase.rpc('generate_invoice_number', {
      p_organization_id: organizationId,
      p_invoice_type: invoice.invoice_type,
    });

    if (numberError) throw numberError;

    // Create invoice
    const { items, ...invoiceData } = invoice;
    const { data: createdInvoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        ...invoiceData,
        invoice_date: invoiceData.invoice_date.toISOString().split('T')[0],
        due_date: invoiceData.due_date.toISOString().split('T')[0],
        invoice_number: invoiceNumber as string,
        organization_id: organizationId,
        created_by: userId,
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Create invoice items
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(
        items.map((item) => ({
          ...item,
          invoice_id: createdInvoice.id,
        }))
      );

    if (itemsError) throw itemsError;

    // Fetch and return complete invoice with items
    return this.getInvoice(createdInvoice.id);
  },

  async updateInvoice(invoiceUpdate: UpdateInvoiceInput) {
    const { id, items, ...updates } = invoiceUpdate;

    // Update invoice
    const invoiceUpdates: any = { ...updates };
    if (updates.invoice_date) {
      invoiceUpdates.invoice_date = updates.invoice_date.toISOString().split('T')[0];
    }
    if (updates.due_date) {
      invoiceUpdates.due_date = updates.due_date.toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(invoiceUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update items if provided
    if (items) {
      // Delete existing items
      await supabase.from('invoice_items').delete().eq('invoice_id', id);

      // Insert new items
      await supabase
        .from('invoice_items')
        .insert(
          items.map((item) => ({
            ...item,
            invoice_id: id,
          }))
        );
    }

    // Fetch and return complete invoice
    return this.getInvoice(id);
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

  async cancelInvoice(invoiceId: string) {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'cancelled' })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;
    return data as Invoice;
  },

  async deleteInvoice(invoiceId: string) {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) throw error;
  },

  // =====================================================
  // PAYMENTS
  // =====================================================

  async getPayments(organizationId: string, filter?: PaymentFilter) {
    let query = supabase
      .from('accounting_payments')
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
    if (filter?.start_date) query = query.gte('payment_date', filter.start_date.toISOString().split('T')[0]);
    if (filter?.end_date) query = query.lte('payment_date', filter.end_date.toISOString().split('T')[0]);
    if (filter?.party_name) query = query.ilike('party_name', `%${filter.party_name}%`);
    if (filter?.payment_method) query = query.eq('payment_method', filter.payment_method);

    const { data, error } = await query.order('payment_date', { ascending: false });

    if (error) throw error;
    return data as PaymentWithAllocations[];
  },

  async getPayment(paymentId: string) {
    const { data, error } = await supabase
      .from('accounting_payments')
      .select(`
        *,
        payment_allocations(
          *,
          invoices(invoice_number, party_name, outstanding_amount)
        )
      `)
      .eq('id', paymentId)
      .single();

    if (error) throw error;
    return data as PaymentWithAllocations;
  },

  async createPayment(payment: CreatePaymentInput, organizationId: string, userId: string) {
    // Generate payment number
    const { data: paymentNumber, error: numberError } = await supabase.rpc('generate_payment_number', {
      p_organization_id: organizationId,
      p_payment_type: payment.payment_type,
    });

    if (numberError) throw numberError;

    // Create payment
    const { allocations, ...paymentData } = payment;
    const { data: createdPayment, error: paymentError } = await supabase
      .from('accounting_payments')
      .insert({
        ...paymentData,
        payment_date: paymentData.payment_date.toISOString().split('T')[0],
        payment_number: paymentNumber as string,
        organization_id: organizationId,
        created_by: userId,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Create allocations if provided
    if (allocations && allocations.length > 0) {
      const { error: allocError } = await supabase
        .from('payment_allocations')
        .insert(
          allocations.map((alloc) => ({
            ...alloc,
            payment_id: createdPayment.id,
          }))
        );

      if (allocError) throw allocError;
    }

    // Fetch and return complete payment
    return this.getPayment(createdPayment.id);
  },

  async updatePayment(paymentUpdate: UpdatePaymentInput) {
    const { id, allocations, ...updates } = paymentUpdate;

    // Update payment
    const paymentUpdates: any = { ...updates };
    if (updates.payment_date) {
      paymentUpdates.payment_date = updates.payment_date.toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('accounting_payments')
      .update(paymentUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update allocations if provided
    if (allocations) {
      // Delete existing allocations
      await supabase.from('payment_allocations').delete().eq('payment_id', id);

      // Insert new allocations
      if (allocations.length > 0) {
        await supabase
          .from('payment_allocations')
          .insert(
            allocations.map((alloc) => ({
              ...alloc,
              payment_id: id,
            }))
          );
      }
    }

    // Fetch and return complete payment
    return this.getPayment(id);
  },

  async submitPayment(paymentId: string) {
    const { data, error } = await supabase
      .from('accounting_payments')
      .update({ status: 'submitted' })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;
    return data as AccountingPayment;
  },

  async cancelPayment(paymentId: string) {
    const { data, error } = await supabase
      .from('accounting_payments')
      .update({ status: 'cancelled' })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;
    return data as AccountingPayment;
  },

  async deletePayment(paymentId: string) {
    const { error } = await supabase
      .from('accounting_payments')
      .delete()
      .eq('id', paymentId);

    if (error) throw error;
  },

  // =====================================================
  // JOURNAL ENTRIES
  // =====================================================

  async getJournalEntries(organizationId: string, filter?: LedgerFilter) {
    let query = supabase
      .from('journal_entries')
      .select(`
        *,
        journal_items(
          *,
          accounts(code, name)
        )
      `)
      .eq('organization_id', organizationId);

    if (filter?.status) query = query.eq('status', filter.status);
    if (filter?.start_date) query = query.gte('entry_date', filter.start_date.toISOString().split('T')[0]);
    if (filter?.end_date) query = query.lte('entry_date', filter.end_date.toISOString().split('T')[0]);
    if (filter?.account_id) {
      query = query.filter('journal_items.account_id', 'eq', filter.account_id);
    }
    if (filter?.cost_center_id) {
      query = query.filter('journal_items.cost_center_id', 'eq', filter.cost_center_id);
    }
    if (filter?.farm_id) {
      query = query.filter('journal_items.farm_id', 'eq', filter.farm_id);
    }
    if (filter?.parcel_id) {
      query = query.filter('journal_items.parcel_id', 'eq', filter.parcel_id);
    }

    const { data, error } = await query.order('entry_date', { ascending: false });

    if (error) throw error;
    return data as JournalEntryWithItems[];
  },

  async getJournalEntry(entryId: string) {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_items(
          *,
          accounts(code, name)
        )
      `)
      .eq('id', entryId)
      .single();

    if (error) throw error;
    return data as JournalEntryWithItems;
  },

  async createJournalEntry(entry: CreateJournalEntryInput, organizationId: string, userId: string) {
    const { items, ...entryData } = entry;

    const { data: createdEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        ...entryData,
        entry_date: entryData.entry_date.toISOString().split('T')[0],
        posting_date: entryData.posting_date.toISOString().split('T')[0],
        organization_id: organizationId,
        created_by: userId,
      })
      .select()
      .single();

    if (entryError) throw entryError;

    // Create journal items
    const { error: itemsError } = await supabase
      .from('journal_items')
      .insert(
        items.map((item) => ({
          ...item,
          journal_entry_id: createdEntry.id,
        }))
      );

    if (itemsError) throw itemsError;

    // Fetch and return complete entry
    return this.getJournalEntry(createdEntry.id);
  },

  async updateJournalEntry(entryUpdate: UpdateJournalEntryInput) {
    const { id, items, ...updates } = entryUpdate;

    // Update entry
    const entryUpdates: any = { ...updates };
    if (updates.entry_date) {
      entryUpdates.entry_date = updates.entry_date.toISOString().split('T')[0];
    }
    if (updates.posting_date) {
      entryUpdates.posting_date = updates.posting_date.toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('journal_entries')
      .update(entryUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Update items if provided
    if (items) {
      // Delete existing items
      await supabase.from('journal_items').delete().eq('journal_entry_id', id);

      // Insert new items
      await supabase
        .from('journal_items')
        .insert(
          items.map((item) => ({
            ...item,
            journal_entry_id: id,
          }))
        );
    }

    // Fetch and return complete entry
    return this.getJournalEntry(id);
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

  async cancelJournalEntry(entryId: string) {
    const { data, error } = await supabase
      .from('journal_entries')
      .update({ status: 'cancelled' })
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw error;
    return data as JournalEntry;
  },

  async deleteJournalEntry(entryId: string) {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', entryId);

    if (error) throw error;
  },

  // =====================================================
  // COST CENTERS
  // =====================================================

  async getCostCenters(organizationId: string) {
    const { data, error } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('code');

    if (error) throw error;
    return data as CostCenter[];
  },

  async createCostCenter(costCenter: CreateCostCenterInput, organizationId: string, userId: string) {
    const { data, error } = await supabase
      .from('cost_centers')
      .insert({
        ...costCenter,
        organization_id: organizationId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as CostCenter;
  },

  async updateCostCenter(costCenterUpdate: UpdateCostCenterInput) {
    const { id, ...updates } = costCenterUpdate;
    const { data, error } = await supabase
      .from('cost_centers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as CostCenter;
  },

  // =====================================================
  // TAXES
  // =====================================================

  async getTaxes(organizationId: string) {
    const { data, error } = await supabase
      .from('taxes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('code');

    if (error) throw error;
    return data as Tax[];
  },

  async createTax(tax: CreateTaxInput, organizationId: string, userId: string) {
    const { data, error } = await supabase
      .from('taxes')
      .insert({
        ...tax,
        organization_id: organizationId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Tax;
  },

  async updateTax(taxUpdate: UpdateTaxInput) {
    const { id, ...updates } = taxUpdate;
    const { data, error } = await supabase
      .from('taxes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Tax;
  },

  // =====================================================
  // BANK ACCOUNTS
  // =====================================================

  async getBankAccounts(organizationId: string) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('account_name');

    if (error) throw error;
    return data as BankAccount[];
  },

  async createBankAccount(bankAccount: CreateBankAccountInput, organizationId: string, userId: string) {
    const { data, error } = await supabase
      .from('bank_accounts')
      .insert({
        ...bankAccount,
        organization_id: organizationId,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as BankAccount;
  },

  async updateBankAccount(bankAccountUpdate: UpdateBankAccountInput) {
    const { id, ...updates } = bankAccountUpdate;
    const { data, error } = await supabase
      .from('bank_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as BankAccount;
  },

  // =====================================================
  // REPORTING QUERIES
  // =====================================================

  async getAccountBalances(organizationId: string, asOfDate?: Date) {
    let query = supabase
      .from('vw_account_balances')
      .select('*')
      .eq('organization_id', organizationId);

    // TODO: Add date filter when implemented in view

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async getLedger(organizationId: string, filter?: LedgerFilter) {
    let query = supabase
      .from('vw_ledger')
      .select('*')
      .eq('organization_id', organizationId);

    if (filter?.account_id) query = query.eq('account_id', filter.account_id);
    if (filter?.start_date) query = query.gte('entry_date', filter.start_date.toISOString().split('T')[0]);
    if (filter?.end_date) query = query.lte('entry_date', filter.end_date.toISOString().split('T')[0]);
    if (filter?.cost_center_id) query = query.eq('cost_center_id', filter.cost_center_id);
    if (filter?.farm_id) query = query.eq('farm_id', filter.farm_id);
    if (filter?.parcel_id) query = query.eq('parcel_id', filter.parcel_id);

    const { data, error } = await query.order('entry_date', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getInvoiceAging(organizationId: string) {
    const { data, error } = await supabase
      .from('vw_invoice_aging')
      .select('*')
      .eq('organization_id', organizationId)
      .order('days_overdue', { ascending: false });

    if (error) throw error;
    return data;
  },
};
