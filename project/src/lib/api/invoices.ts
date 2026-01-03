import { createCrudApi } from './createCrudApi';
import { apiClient } from '../api-client';
import type { Database } from '@/types/database.types';

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
  date_from?: string;
  date_to?: string;
  farm_id?: string;
  parcel_id?: string;
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
};
