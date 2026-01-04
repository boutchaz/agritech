/**
 * Purchase Orders API Client
 *
 * Provides functions for interacting with the purchase orders NestJS API
 */

import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/purchase-orders';

export interface PurchaseOrderItem {
  line_number: number;
  item_name: string;
  description?: string;
  quantity: number;
  unit_of_measure?: string;
  unit_price: number;
  discount_percent?: number;
  tax_rate?: number;
  item_id?: string;
  account_id?: string;
}

export interface CreatePurchaseOrderInput {
  order_number?: string;
  order_date: string;
  expected_delivery_date?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_contact?: string;
  status?: string;
  notes?: string;
  terms_and_conditions?: string;
  stock_entry_id?: string;
  stock_received?: boolean;
  stock_received_date?: string;
  items: PurchaseOrderItem[];
}

export interface UpdatePurchaseOrderInput {
  order_date?: string;
  expected_delivery_date?: string;
  supplier_id?: string;
  supplier_name?: string;
  supplier_contact?: string;
  status?: string;
  notes?: string;
  terms_and_conditions?: string;
  stock_entry_id?: string;
  stock_received?: boolean;
  stock_received_date?: string;
}

export interface PurchaseOrderFilters {
  status?: string;
  supplier_id?: string;
  supplier_name?: string;
  order_number?: string;
  dateFrom?: string;
  dateTo?: string;
  stock_received?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedPurchaseOrderQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UpdateStatusInput {
  status: string;
  notes?: string;
}

export const purchaseOrdersApi = {
  /**
   * Get all purchase orders with optional filters
   */
  async getAll(filters?: PurchaseOrderFilters, organizationId?: string) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id);
    if (filters?.supplier_name) params.append('supplier_name', filters.supplier_name);
    if (filters?.order_number) params.append('order_number', filters.order_number);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.stock_received) params.append('stock_received', filters.stock_received);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.pageSize) params.append('pageSize', String(filters.pageSize));

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
    return apiClient.get(url, {}, organizationId);
  },

  // Alias for backwards compatibility
  async getPurchaseOrders(filters?: PurchaseOrderFilters, organizationId?: string) {
    return this.getAll(filters, organizationId);
  },

  async getPaginated(
    query: PaginatedPurchaseOrderQuery,
    organizationId?: string,
  ): Promise<PaginatedResponse<unknown>> {
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
    return apiClient.get<PaginatedResponse<unknown>>(url, {}, organizationId);
  },

  /**
   * Get a single purchase order by ID
   */
  async getOne(id: string, organizationId?: string) {
    return apiClient.get(`${BASE_URL}/${id}`, {}, organizationId);
  },

  // Alias for backwards compatibility
  async getPurchaseOrder(id: string, organizationId?: string) {
    return this.getOne(id, organizationId);
  },

  /**
   * Create a new purchase order
   */
  async create(data: CreatePurchaseOrderInput, organizationId?: string) {
    return apiClient.post(BASE_URL, data, {}, organizationId);
  },

  // Alias for backwards compatibility
  async createPurchaseOrder(input: CreatePurchaseOrderInput, organizationId?: string) {
    return this.create(input, organizationId);
  },

  /**
   * Update an existing purchase order
   */
  async update(id: string, data: UpdatePurchaseOrderInput, organizationId?: string) {
    return apiClient.patch(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  // Alias for backwards compatibility
  async updatePurchaseOrder(id: string, input: UpdatePurchaseOrderInput, organizationId?: string) {
    return this.update(id, input, organizationId);
  },

  /**
   * Update purchase order status
   */
  async updatePurchaseOrderStatus(id: string, input: UpdateStatusInput, organizationId?: string) {
    return apiClient.patch(`${BASE_URL}/${id}/status`, input, {}, organizationId);
  },

  /**
   * Delete a purchase order (only drafts)
   */
  async delete(id: string, organizationId?: string) {
    return apiClient.delete(`${BASE_URL}/${id}`, {}, organizationId);
  },

  // Alias for backwards compatibility
  async deletePurchaseOrder(id: string, organizationId?: string) {
    return this.delete(id, organizationId);
  },

  /**
   * Convert purchase order to bill (purchase invoice)
   */
  async convertToBill(id: string, params?: { invoice_date?: string; due_date?: string }, organizationId?: string) {
    return apiClient.post(`${BASE_URL}/${id}/convert-to-bill`, params || {}, {}, organizationId);
  },
};
