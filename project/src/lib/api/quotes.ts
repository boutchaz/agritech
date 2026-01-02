import { createCrudApi } from './createCrudApi';
import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/quotes';

export interface Quote {
  id: string;
  organization_id: string;
  customer_id: string;
  quote_number: string;
  quote_date: string;
  valid_until: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted' | 'cancelled';
  subtotal: number;
  tax_total: number;
  grand_total: number;
  payment_terms?: string;
  delivery_terms?: string;
  terms_and_conditions?: string;
  notes?: string;
  reference_number?: string;
  created_at: string;
  updated_at: string;
  items?: QuoteItemInput[];
}

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

export interface QuoteItemInput {
  line_number?: number;
  item_id?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  account_id: string;
  tax_id?: string | null;
}

export interface CreateQuoteInput {
  customer_id: string;
  quote_date: string;
  valid_until: string;
  items: QuoteItemInput[];
  payment_terms?: string;
  delivery_terms?: string;
  terms_and_conditions?: string;
  notes?: string;
  reference_number?: string;
}

export type UpdateQuoteInput = Partial<CreateQuoteInput>;

// Transform frontend input to API format
function transformQuoteForApi(data: CreateQuoteInput) {
  return {
    ...data,
    items: data.items.map((item, index) => ({
      line_number: item.line_number || index + 1,
      item_id: item.item_id,
      item_name: item.item_name,
      description: item.description,
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      account_id: item.account_id,
      tax_id: item.tax_id || undefined,
    })),
  };
}

// Base CRUD operations
const baseCrud = createCrudApi<Quote, CreateQuoteInput, QuoteFilters>(BASE_URL);

// Extended API with additional methods and transformations
export const quotesApi = {
  // Use base getAll and getOne
  getAll: baseCrud.getAll,
  getOne: baseCrud.getOne,
  delete: baseCrud.delete,

  /**
   * Create a new quote (with transformation)
   */
  async create(data: CreateQuoteInput, organizationId?: string) {
    const transformedData = transformQuoteForApi(data);
    return apiClient.post(BASE_URL, transformedData, {}, organizationId);
  },

  /**
   * Update a quote (with transformation, only drafts)
   */
  async update(id: string, data: UpdateQuoteInput, organizationId?: string) {
    const transformedData = data.items
      ? transformQuoteForApi(data as CreateQuoteInput)
      : data;
    return apiClient.patch(`${BASE_URL}/${id}`, transformedData, {}, organizationId);
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
};
