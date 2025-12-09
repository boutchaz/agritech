import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/quotes';

export interface QuoteFilters {
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted' | 'cancelled';
  customer_id?: string;
  customer_name?: string;
  quote_number?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface UpdateQuoteStatusInput {
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted' | 'cancelled';
  remarks?: string;
}

export interface CreateQuoteInput {
  customer_id: string;
  quote_date: string;
  valid_until: string;
  items: Array<{
    line_number: number;
    item_id?: string;
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
    account_id: string;
    tax_id?: string | null;
  }>;
  payment_terms?: string;
  delivery_terms?: string;
  terms_and_conditions?: string;
  notes?: string;
  reference_number?: string;
}

// Transform frontend input to API format
function transformQuoteForApi(data: CreateQuoteInput) {
  return {
    ...data,
    items: data.items.map((item, index) => ({
      line_number: index + 1,
      item_id: item.item_id,
      item_name: item.item_name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.rate, // Map rate to unit_price
      account_id: item.account_id,
      tax_id: item.tax_id || undefined,
    })),
  };
}

export const quotesApi = {
  /**
   * Get all quotes with optional filters
   */
  async getAll(filters?: QuoteFilters, organizationId?: string) {
    return apiClient.get(BASE_URL, {}, organizationId);
  },

  /**
   * Get a single quote by ID with items
   */
  async getOne(id: string, organizationId?: string) {
    return apiClient.get(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Create a new quote
   */
  async create(data: CreateQuoteInput, organizationId?: string) {
    const transformedData = transformQuoteForApi(data);
    return apiClient.post(BASE_URL, transformedData, {}, organizationId);
  },

  /**
   * Update quote status
   */
  async updateStatus(id: string, data: UpdateQuoteStatusInput, organizationId?: string) {
    return apiClient.patch(`${BASE_URL}/${id}/status`, data, {}, organizationId);
  },

  /**
   * Convert a quote to a sales order
   */
  async convertToOrder(id: string, organizationId?: string) {
    return apiClient.post(`${BASE_URL}/${id}/convert-to-order`, {}, {}, organizationId);
  },

  /**
   * Delete a quote (only drafts)
   */
  async delete(id: string, organizationId?: string) {
    return apiClient.delete(`${BASE_URL}/${id}`, {}, organizationId);
  },
};
