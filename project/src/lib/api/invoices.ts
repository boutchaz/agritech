import { apiClient } from '../api-client';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
type Invoice = Tables['invoices']['Row'];
type InvoiceItem = Tables['invoice_items']['Row'];

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

export const invoicesApi = {
  async getAll(filters: InvoiceFilters, organizationId: string): Promise<InvoiceWithItems[]> {
    const params = new URLSearchParams();
    if (filters?.invoice_type) params.append('invoice_type', filters.invoice_type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.party_id) params.append('party_id', filters.party_id);
    if (filters?.party_name) params.append('party_name', filters.party_name);
    if (filters?.invoice_number) params.append('invoice_number', filters.invoice_number);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    const queryString = params.toString();
    return apiClient.get<InvoiceWithItems[]>(`/invoices${queryString ? `?${queryString}` : ''}`);
  },

  async getOne(invoiceId: string, organizationId: string): Promise<InvoiceWithItems> {
    return apiClient.get<InvoiceWithItems>(`/invoices/${invoiceId}`);
  },

  async create(invoice: any, organizationId: string): Promise<InvoiceWithItems> {
    return apiClient.post<InvoiceWithItems>(`/invoices`, invoice);
  },

  async updateStatus(
    invoiceId: string,
    data: { status: string; remarks?: string },
    organizationId: string
  ): Promise<Invoice> {
    return apiClient.patch<Invoice>(`/invoices/${invoiceId}/status`, data);
  },

  /**
   * Post an invoice (creates journal entry)
   * Replaces Supabase Edge Function call
   */
  async postInvoice(
    invoiceId: string,
    postingDate: string,
    organizationId: string
  ): Promise<{ success: boolean; message: string; data: { invoice_id: string; journal_entry_id: string } }> {
    return apiClient.post(`/invoices/${invoiceId}/post`, { posting_date: postingDate });
  },

  async delete(invoiceId: string, organizationId: string): Promise<void> {
    await apiClient.delete(`/invoices/${invoiceId}`);
  },

  /**
   * Update a draft invoice
   */
  async update(
    invoiceId: string,
    data: {
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
    },
    organizationId: string
  ): Promise<InvoiceWithItems> {
    return apiClient.patch<InvoiceWithItems>(`/invoices/${invoiceId}`, data);
  },
};
