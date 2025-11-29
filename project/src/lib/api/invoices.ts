import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/invoices';

export interface InvoiceFilters {
  invoice_type?: 'sales' | 'purchase';
  status?: 'draft' | 'submitted' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  party_id?: string;
  party_name?: string;
  invoice_number?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface UpdateInvoiceStatusInput {
  status: 'draft' | 'submitted' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  remarks?: string;
}

export const invoicesApi = {
  /**
   * Get all invoices with optional filters
   */
  async getAll(filters?: InvoiceFilters, organizationId?: string) {
    return apiClient.get(BASE_URL, {}, organizationId);
  },

  /**
   * Get a single invoice by ID with items
   */
  async getOne(id: string, organizationId?: string) {
    return apiClient.get(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Update invoice status
   */
  async updateStatus(id: string, data: UpdateInvoiceStatusInput, organizationId?: string) {
    return apiClient.patch(`${BASE_URL}/${id}/status`, data, {}, organizationId);
  },

  /**
   * Delete an invoice (only drafts)
   */
  async delete(id: string, organizationId?: string) {
    return apiClient.delete(`${BASE_URL}/${id}`, {}, organizationId);
  },
};
