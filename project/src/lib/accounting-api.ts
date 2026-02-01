/**
 * Accounting API Client
 *
 * Provides functions for interacting with the accounting module.
 * All functions use NestJS API endpoints for proper business logic and ACID transactions.
 */

import { paymentsApi } from './api/payments';
import { accountsApi } from './api/accounts';
import { invoicesApi } from './api/invoices';
import { journalEntriesApi } from './api/journal-entries';
import { costCentersApi } from './api/cost-centers';
import { bankAccountsApi } from './api/bank-accounts';
import { taxesApi } from './api/taxes';
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
    return accountsApi.getAll(organizationId);
  },

  async getAccount(accountId: string) {
    return accountsApi.getById(accountId);
  },

  async createAccount(account: CreateAccountInput, _organizationId: string, _userId: string) {
    return accountsApi.create(account);
  },

  async updateAccount(accountUpdate: UpdateAccountInput) {
    const { id, ...updates } = accountUpdate;
    return accountsApi.update(id, updates);
  },

  async deleteAccount(accountId: string) {
    await accountsApi.delete(accountId);
  },

  // =====================================================
  // INVOICES
  // =====================================================

  async getInvoices(organizationId: string, filter?: InvoiceFilter) {
    const apiFilters: any = {};

    if (filter?.invoice_type) apiFilters.invoice_type = filter.invoice_type;
    if (filter?.status) apiFilters.status = filter.status;
    if (filter?.start_date) apiFilters.dateFrom = filter.start_date.toISOString().split('T')[0];
    if (filter?.end_date) apiFilters.dateTo = filter.end_date.toISOString().split('T')[0];
    if (filter?.party_name) apiFilters.party_name = filter.party_name;
    if (filter?.farm_id) apiFilters.farm_id = filter.farm_id;
    if (filter?.parcel_id) apiFilters.parcel_id = filter.parcel_id;

    const data = await invoicesApi.getAll(apiFilters, organizationId);
    return data as InvoiceWithItems[];
  },

  async getInvoice(invoiceId: string) {
    // Organization ID is validated via JWT auth header
    const data = await invoicesApi.getOne(invoiceId, '');
    return data as InvoiceWithItems;
  },

  async createInvoice(invoice: CreateInvoiceInput, organizationId: string, _userId: string) {
    const apiData = {
      ...invoice,
      invoice_date: invoice.invoice_date.toISOString().split('T')[0],
      due_date: invoice.due_date.toISOString().split('T')[0],
    };

    const data = await invoicesApi.create(apiData, organizationId);
    return data as InvoiceWithItems;
  },

  async updateInvoice(invoiceUpdate: UpdateInvoiceInput) {
    const { id, items, ...updates } = invoiceUpdate;

    const apiData: any = { ...updates };
    if (updates.invoice_date) {
      apiData.invoice_date = updates.invoice_date.toISOString().split('T')[0];
    }
    if (updates.due_date) {
      apiData.due_date = updates.due_date.toISOString().split('T')[0];
    }
    if (items) {
      apiData.items = items;
    }

    const data = await invoicesApi.update(id, apiData, '');
    return data as InvoiceWithItems;
  },

  async submitInvoice(invoiceId: string, _userId: string) {
    const data = await invoicesApi.updateStatus(invoiceId, { status: 'submitted' }, '');
    return data as Invoice;
  },

  async cancelInvoice(invoiceId: string) {
    const data = await invoicesApi.updateStatus(invoiceId, { status: 'cancelled' }, '');
    return data as Invoice;
  },

  async deleteInvoice(invoiceId: string) {
    await invoicesApi.delete(invoiceId, '');
  },

  // =====================================================
  // PAYMENTS
  // =====================================================

  async getPayments(organizationId: string, filter?: PaymentFilter) {
    const apiFilters: any = {};

    if (filter?.payment_type) {
      // Map frontend 'received'/'paid' to API 'receive'/'pay'
      apiFilters.payment_type = filter.payment_type === 'received' ? 'receive' : 'pay';
    }
    if (filter?.status) apiFilters.status = filter.status;
    if (filter?.start_date) apiFilters.date_from = filter.start_date.toISOString().split('T')[0];
    if (filter?.end_date) apiFilters.date_to = filter.end_date.toISOString().split('T')[0];

    const data = await paymentsApi.getAll(apiFilters, organizationId);
    return data as unknown as PaymentWithAllocations[];
  },

  async getPayment(paymentId: string) {
    const data = await paymentsApi.getOne(paymentId, undefined);
    return data as unknown as PaymentWithAllocations;
  },

  async createPayment(payment: CreatePaymentInput, organizationId: string, _userId: string) {
    const { allocations, ...paymentData } = payment;

    // Map frontend terminology to API
    const apiType = paymentData.payment_type === 'received' ? 'receive' : 'pay';

    // Create payment via API (payment number generated by backend)
    const createdPayment = await paymentsApi.create({
      payment_date: paymentData.payment_date.toISOString().split('T')[0],
      payment_type: apiType as 'receive' | 'pay',
      party_type: paymentData.party_type?.toLowerCase() as 'customer' | 'supplier',
      party_id: paymentData.party_id,
      party_name: paymentData.party_name,
      amount: paymentData.amount,
      payment_method: paymentData.payment_method,
      reference_number: paymentData.reference_number,
      notes: paymentData.remarks,
    }, organizationId);

    // Allocate payment if allocations provided
    if (allocations && allocations.length > 0) {
      await paymentsApi.allocate(createdPayment.id, {
        allocations: allocations.map(alloc => ({
          invoice_id: alloc.invoice_id,
          amount: alloc.allocated_amount,
        })),
      }, organizationId);
    }

    // Fetch and return complete payment
    return this.getPayment(createdPayment.id);
  },

  async updatePayment(paymentUpdate: UpdatePaymentInput) {
    const { id, allocations, status, ...updates } = paymentUpdate;

    // Only status updates are supported via API for financial integrity
    if (status) {
      await paymentsApi.updateStatus(id, { status: status as 'draft' | 'submitted' | 'reconciled' | 'cancelled' });
    }

    // Note: General field updates would need a new endpoint if required
    // For now, only status updates are supported

    // Fetch and return complete payment
    return this.getPayment(id);
  },

  async submitPayment(paymentId: string) {
    const data = await paymentsApi.updateStatus(paymentId, { status: 'submitted' });
    return data as unknown as AccountingPayment;
  },

  async cancelPayment(paymentId: string) {
    const data = await paymentsApi.updateStatus(paymentId, { status: 'cancelled' });
    return data as unknown as AccountingPayment;
  },

  async deletePayment(paymentId: string) {
    await paymentsApi.delete(paymentId);
  },

  // =====================================================
  // JOURNAL ENTRIES
  // =====================================================

  async getJournalEntries(organizationId: string, filter?: LedgerFilter) {
    const apiFilters: any = {};

    if (filter?.status) apiFilters.status = filter.status;
    if (filter?.start_date) apiFilters.date_from = filter.start_date.toISOString().split('T')[0];
    if (filter?.end_date) apiFilters.date_to = filter.end_date.toISOString().split('T')[0];
    if (filter?.account_id) apiFilters.account_id = filter.account_id;
    if (filter?.cost_center_id) apiFilters.cost_center_id = filter.cost_center_id;
    if (filter?.farm_id) apiFilters.farm_id = filter.farm_id;
    if (filter?.parcel_id) apiFilters.parcel_id = filter.parcel_id;

    const data = await journalEntriesApi.getAll(apiFilters);
    return data as JournalEntryWithItems[];
  },

  async getJournalEntry(entryId: string, organizationId?: string) {
    const data = await journalEntriesApi.getOne(entryId, organizationId);
    return data as JournalEntryWithItems;
  },

  async createJournalEntry(entry: CreateJournalEntryInput, organizationId: string, _userId: string) {
    const apiData = {
      entry_date: entry.entry_date.toISOString().split('T')[0],
      entry_type: entry.entry_type,
      description: entry.description,
      remarks: entry.remarks,
      reference_type: entry.reference_type,
      reference_number: entry.reference_number,
      items: entry.items.map(item => ({
        account_id: item.account_id,
        debit: item.debit || 0,
        credit: item.credit || 0,
        description: item.description,
        cost_center_id: item.cost_center_id,
        farm_id: item.farm_id,
        parcel_id: item.parcel_id,
      })),
    };

    const data = await journalEntriesApi.create(apiData, organizationId);
    return data as JournalEntryWithItems;
  },

  async updateJournalEntry(entryUpdate: UpdateJournalEntryInput, organizationId?: string) {
    const { id, items, ...updates } = entryUpdate;

    const apiData: any = { ...updates };
    if (updates.entry_date) {
      apiData.entry_date = updates.entry_date.toISOString().split('T')[0];
    }
    if (items) {
      apiData.items = items.map(item => ({
        account_id: item.account_id,
        debit: item.debit || 0,
        credit: item.credit || 0,
        description: item.description,
        cost_center_id: item.cost_center_id,
        farm_id: item.farm_id,
        parcel_id: item.parcel_id,
      }));
    }

    const data = await journalEntriesApi.update(id, apiData, organizationId);
    return data as JournalEntryWithItems;
  },

  async postJournalEntry(entryId: string, organizationId?: string, _userId?: string) {
    const data = await journalEntriesApi.post(entryId, organizationId);
    return data as JournalEntry;
  },

  async cancelJournalEntry(entryId: string, organizationId?: string) {
    const data = await journalEntriesApi.cancel(entryId, organizationId);
    return data as JournalEntry;
  },

  async deleteJournalEntry(entryId: string, organizationId?: string) {
    await journalEntriesApi.delete(entryId, organizationId);
  },

  // =====================================================
  // COST CENTERS
  // =====================================================

  async getCostCenters(_organizationId: string) {
    const data = await costCentersApi.getAll();
    return data as CostCenter[];
  },

  async createCostCenter(costCenter: CreateCostCenterInput, _organizationId: string, _userId: string) {
    const data = await costCentersApi.create(costCenter);
    return data as CostCenter;
  },

  async updateCostCenter(costCenterUpdate: UpdateCostCenterInput) {
    const { id, ...updates } = costCenterUpdate;
    const data = await costCentersApi.update(id, updates);
    return data as CostCenter;
  },

  // =====================================================
  // TAXES
  // =====================================================

  async getTaxes(organizationId: string) {
    const data = await taxesApi.getAll(organizationId);
    return data as Tax[];
  },

  async createTax(tax: CreateTaxInput, organizationId: string, _userId: string) {
    const data = await taxesApi.create(tax);
    return data as Tax;
  },

  async updateTax(taxUpdate: UpdateTaxInput) {
    const { id, ...updates } = taxUpdate;
    const data = await taxesApi.update(id, updates);
    return data as Tax;
  },

  // =====================================================
  // BANK ACCOUNTS
  // =====================================================

  async getBankAccounts(_organizationId: string) {
    const data = await bankAccountsApi.getAll();
    return data as BankAccount[];
  },

  async createBankAccount(bankAccount: CreateBankAccountInput, _organizationId: string, _userId: string) {
    const data = await bankAccountsApi.create(bankAccount);
    return data as BankAccount;
  },

  async updateBankAccount(bankAccountUpdate: UpdateBankAccountInput) {
    const { id, ...updates } = bankAccountUpdate;
    const data = await bankAccountsApi.update(id, updates);
    return data as BankAccount;
  },

  // =====================================================
  // REPORTING QUERIES
  // Note: These may need dedicated API endpoints for complex reporting
  // For now, these are placeholder implementations
  // =====================================================

  async getAccountBalances(_organizationId: string, _asOfDate?: Date) {
    // TODO: Create dedicated reporting endpoint
    // This should aggregate data from journal entries
    console.warn('getAccountBalances: Consider creating a dedicated reporting endpoint');
    return [];
  },

  async getLedger(_organizationId: string, _filter?: LedgerFilter) {
    // TODO: Create dedicated reporting endpoint
    // This should query journal items with proper filtering
    console.warn('getLedger: Consider creating a dedicated reporting endpoint');
    return [];
  },

  async getInvoiceAging(_organizationId: string) {
    // TODO: Create dedicated reporting endpoint
    // This should calculate aging buckets from invoice data
    console.warn('getInvoiceAging: Consider creating a dedicated reporting endpoint');
    return [];
  },
};
