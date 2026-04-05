import { createCrudApi } from './createCrudApi';
import { apiClient } from '../api-client';
import type {
  Quote,
  QuoteFilters,
  PaginatedQuoteQuery,
  PaginatedResponse,
  UpdateQuoteStatusInput,
  QuoteItemInput,
  CreateQuoteInput,
  UpdateQuoteInput,
} from '../../types/quotes';

const BASE_URL = '/api/v1/quotes';

export type {
  Quote,
  QuoteFilters,
  PaginatedQuoteQuery,
  PaginatedResponse,
  UpdateQuoteStatusInput,
  QuoteItemInput,
  CreateQuoteInput,
  UpdateQuoteInput,
} from '../../types/quotes';

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
   * Get paginated quotes with server-side sorting, filtering, and search
   */
  async getPaginated(
    query: PaginatedQuoteQuery,
    organizationId?: string,
  ): Promise<PaginatedResponse<Quote>> {
    const params = new URLSearchParams();

    if (query.page) params.append('page', String(query.page));
    if (query.pageSize) params.append('pageSize', String(query.pageSize));
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortDir) params.append('sortDir', query.sortDir);
    if (query.search) params.append('search', query.search);
    if (query.status) params.append('status', query.status);
    if (query.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query.dateTo) params.append('dateTo', query.dateTo);

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
    return apiClient.get<PaginatedResponse<Quote>>(url, {}, organizationId);
  },

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
