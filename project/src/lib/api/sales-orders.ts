/**
 * Sales Orders API Client
 *
 * Provides functions for interacting with the sales orders NestJS API
 */

import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/sales-orders';

export interface SalesOrderItem {
  line_number: number;
  item_name: string;
  description?: string;
  quantity: number;
  unit_of_measure?: string;
  unit_price: number;
  discount_percentage?: number;
  tax_rate?: number;
  item_id?: string;
  account_id?: string;
}

export interface CreateSalesOrderInput {
  order_number?: string;
  order_date: string;
  expected_delivery_date?: string;
  customer_id?: string;
  customer_name: string;
  customer_contact?: string;
  customer_address?: string;
  shipping_address?: string;
  tracking_number?: string;
  status?: string;
  notes?: string;
  terms_and_conditions?: string;
  stock_entry_id?: string;
  stock_issued?: boolean;
  stock_issued_date?: string;
  items: SalesOrderItem[];
}

export interface UpdateSalesOrderInput {
  order_date?: string;
  expected_delivery_date?: string;
  customer_id?: string;
  customer_name?: string;
  customer_contact?: string;
  customer_address?: string;
  shipping_address?: string;
  tracking_number?: string;
  status?: string;
  notes?: string;
  terms_and_conditions?: string;
  stock_entry_id?: string;
  stock_issued?: boolean;
  stock_issued_date?: string;
}

export interface SalesOrderFilters {
  status?: string;
  customer_id?: string;
  customer_name?: string;
  order_number?: string;
  date_from?: string;
  date_to?: string;
  stock_issued?: string;
  page?: number;
  limit?: number;
}

export interface UpdateStatusInput {
  status: string;
  notes?: string;
}

export const salesOrdersApi = {
  /**
   * Get all sales orders with optional filters
   */
  async getAll(filters?: SalesOrderFilters, organizationId?: string) {
    // Build query string from filters
    const queryParams = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const url = queryParams.toString() 
      ? `${BASE_URL}?${queryParams.toString()}`
      : BASE_URL;
    
    // The API returns { data: [...], pagination: {...} }
    const response = await apiClient.get<{ data: unknown[], pagination: unknown }>(url, {}, organizationId);
    return response;
  },

  // Alias for backwards compatibility
  async getSalesOrders(filters?: SalesOrderFilters, organizationId?: string) {
    return this.getAll(filters, organizationId);
  },

  /**
   * Get a single sales order by ID
   */
  async getOne(id: string, organizationId?: string) {
    // The API returns the sales order directly, not wrapped in { data }
    const response = await apiClient.get(`${BASE_URL}/${id}`, {}, organizationId);
    return response;
  },

  // Alias for backwards compatibility
  async getSalesOrder(id: string, organizationId?: string) {
    return this.getOne(id, organizationId);
  },

  /**
   * Create a new sales order
   */
  async create(data: CreateSalesOrderInput, organizationId?: string) {
    // The API returns the sales order directly, not wrapped in { data }
    const response = await apiClient.post(BASE_URL, data, {}, organizationId);
    return response;
  },

  // Alias for backwards compatibility
  async createSalesOrder(input: CreateSalesOrderInput, organizationId?: string) {
    return this.create(input, organizationId);
  },

  /**
   * Update an existing sales order
   */
  async update(id: string, data: UpdateSalesOrderInput, organizationId?: string) {
    // The API returns the sales order directly, not wrapped in { data }
    const response = await apiClient.patch(`${BASE_URL}/${id}`, data, {}, organizationId);
    return response;
  },

  // Alias for backwards compatibility
  async updateSalesOrder(id: string, input: UpdateSalesOrderInput, organizationId?: string) {
    return this.update(id, data, organizationId);
  },

  /**
   * Update sales order status
   */
  async updateSalesOrderStatus(id: string, input: UpdateStatusInput, organizationId?: string) {
    // The API returns the sales order directly, not wrapped in { data }
    const response = await apiClient.patch(`${BASE_URL}/${id}/status`, input, {}, organizationId);
    return response;
  },

  /**
   * Delete a sales order (only drafts)
   */
  async delete(id: string, organizationId?: string) {
    // The API returns success message directly
    const response = await apiClient.delete(`${BASE_URL}/${id}`, {}, organizationId);
    return response;
  },

  // Alias for backwards compatibility
  async deleteSalesOrder(id: string, organizationId?: string) {
    return this.delete(id, organizationId);
  },

  /**
   * Convert sales order to invoice
   */
  async convertToInvoice(id: string, params?: { invoice_date?: string; due_date?: string }, organizationId?: string) {
    // The API returns the invoice directly, not wrapped in { data }
    const response = await apiClient.post(`${BASE_URL}/${id}/convert-to-invoice`, params || {}, {}, organizationId);
    return response;
  },

  /**
   * Issue stock for a sales order
   * Creates a Material Issue stock entry and records COGS journal entry
   */
  async issueStock(id: string, warehouseId: string, organizationId?: string) {
    const response = await apiClient.post(
      `${BASE_URL}/${id}/issue-stock?warehouse_id=${encodeURIComponent(warehouseId)}`,
      {},
      {},
      organizationId
    );
    return response;
  },
};
