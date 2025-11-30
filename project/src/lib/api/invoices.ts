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
  async getAll(organizationId: string, filters?: InvoiceFilters): Promise<InvoiceWithItems[]> {
    const params = new URLSearchParams();
    if (filters?.invoice_type) params.append('invoice_type', filters.invoice_type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.party_id) params.append('party_id', filters.party_id);
    if (filters?.party_name) params.append('party_name', filters.party_name);
    if (filters?.invoice_number) params.append('invoice_number', filters.invoice_number);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    const queryString = params.toString();
    return apiClient.get<InvoiceWithItems[]>(`/api/v1/invoices${queryString ? `?${queryString}` : ''}`);
  },

  async getById(invoiceId: string): Promise<InvoiceWithItems> {
    return apiClient.get<InvoiceWithItems>(`/api/v1/invoices/${invoiceId}`);
  },

  async create(invoice: any): Promise<InvoiceWithItems> {
    return apiClient.post<InvoiceWithItems>(`/api/v1/invoices`, invoice);
  },

  async updateStatus(invoiceId: string, status: string): Promise<Invoice> {
    return apiClient.patch<Invoice>(`/api/v1/invoices/${invoiceId}/status`, { status });
  },

  async delete(invoiceId: string): Promise<void> {
    await apiClient.delete(`/api/v1/invoices/${invoiceId}`);
  },
};
