import { createCrudApi } from './createCrudApi';
import { apiClient } from '../api-client';
import type { Database } from '@/types/database.types';
import { type PaginatedQuery, type PaginatedResponse } from './types';

const BASE_URL = '/api/v1/invoices';

type Tables = Database['public']['Tables'];
export type Invoice = Tables['invoices']['Row'];
export type InvoiceItem = Tables['invoice_items']['Row'];

export interface InvoiceWithItems extends Invoice {
  invoice_items: InvoiceItem[];
}

export interface InvoiceFilters {
  invoice_type?: 'sales' | 'purchase';
  status?: 'draft' | 'submitted' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  party_id?: string;
  party_name?: string;
  invoice_number?: string;
  dateFrom?: string;
  dateTo?: string;
  farm_id?: string;
  parcel_id?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedInvoiceQuery extends PaginatedQuery {
  invoice_type?: 'sales' | 'purchase';
  status?: 'draft' | 'submitted' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  party_id?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateInvoiceInput {
  invoice_type: 'sales' | 'purchase';
  party_id?: string;
  party_name?: string;
  invoice_date: string;
  due_date: string;
  payment_terms?: string;
  notes?: string;
  items: Array<{
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    tax_id?: string;
    income_account_id?: string;
    expense_account_id?: string;
    item_id?: string;
  }>;
}

export interface UpdateInvoiceInput {
  party_id?: string;
  party_name?: string;
  invoice_date?: string;
  due_date?: string;
  payment_terms?: string;
  notes?: string;
  items?: Array<{
    id?: string;
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    amount: number;
    tax_id?: string;
    tax_rate?: number;
    tax_amount: number;
    line_total: number;
    income_account_id?: string;
    expense_account_id?: string;
    item_id?: string;
  }>;
}

// Base CRUD operations
const baseCrud = createCrudApi<InvoiceWithItems, CreateInvoiceInput, InvoiceFilters>(BASE_URL);

// Extended API with additional methods
export const invoicesApi = {
  getAll: baseCrud.getAll,
  getOne: baseCrud.getOne,
  create: baseCrud.create,
  delete: baseCrud.delete,

  async getPaginated(
    query: PaginatedInvoiceQuery,
    organizationId?: string,
  ): Promise<PaginatedResponse<InvoiceWithItems>> {
    const params = new URLSearchParams();

    if (query.page) params.append('page', String(query.page));
    if (query.pageSize) params.append('pageSize', String(query.pageSize));
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortDir) params.append('sortDir', query.sortDir);
    if (query.search) params.append('search', query.search);
    if (query.invoice_type) params.append('invoice_type', query.invoice_type);
    if (query.status) params.append('status', query.status);
    if (query.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query.dateTo) params.append('dateTo', query.dateTo);

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
    return apiClient.get<PaginatedResponse<InvoiceWithItems>>(url, {}, organizationId);
  },

  /**
   * Update a draft invoice
   */
  async update(invoiceId: string, data: UpdateInvoiceInput, organizationId?: string): Promise<InvoiceWithItems> {
    return apiClient.patch<InvoiceWithItems>(`${BASE_URL}/${invoiceId}`, data, {}, organizationId);
  },

  /**
   * Update invoice status
   */
  async updateStatus(invoiceId: string, data: { status: string; remarks?: string }, organizationId?: string): Promise<Invoice> {
    return apiClient.patch<Invoice>(`${BASE_URL}/${invoiceId}/status`, data, {}, organizationId);
  },

  async postInvoice(
    invoiceId: string,
    postingDate: string,
    organizationId?: string
  ): Promise<{ success: boolean; message: string; data: { invoice_id: string; journal_entry_id: string } }> {
    return apiClient.post(`${BASE_URL}/${invoiceId}/post`, { posting_date: postingDate }, {}, organizationId);
  },

  async sendEmail(
    invoiceId: string,
    email?: string,
    organizationId?: string
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post(`${BASE_URL}/${invoiceId}/send-email`, { email }, {}, organizationId);
  },

  async createCreditNote(
    originalInvoiceId: string,
    data: CreateCreditNoteInput,
    organizationId?: string,
  ): Promise<InvoiceWithItems> {
    return apiClient.post<InvoiceWithItems>(
      `${BASE_URL}/${originalInvoiceId}/credit-notes`,
      data,
      {},
      organizationId,
    );
  },
};

export interface CreditNoteLineInput {
  original_item_id: string;
  quantity: number;
  unit_price?: number;
}

export interface CreateCreditNoteInput {
  lines?: CreditNoteLineInput[];
  credit_reason: string;
  restore_stock?: boolean;
  invoice_date?: string;
  notes?: string;
}
