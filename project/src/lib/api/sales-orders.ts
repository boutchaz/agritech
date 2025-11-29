/**
 * Sales Orders API Client
 *
 * Provides functions for interacting with the sales orders NestJS API
 */

import { apiClient } from '../api-client';

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
  async getSalesOrders(filters?: SalesOrderFilters) {
    const { data } = await apiClient.get('/sales-orders', { params: filters });
    return data;
  },

  /**
   * Get a single sales order by ID
   */
  async getSalesOrder(id: string) {
    const { data } = await apiClient.get(`/sales-orders/${id}`);
    return data;
  },

  /**
   * Create a new sales order
   */
  async createSalesOrder(input: CreateSalesOrderInput) {
    const { data } = await apiClient.post('/sales-orders', input);
    return data;
  },

  /**
   * Update an existing sales order
   */
  async updateSalesOrder(id: string, input: UpdateSalesOrderInput) {
    const { data } = await apiClient.patch(`/sales-orders/${id}`, input);
    return data;
  },

  /**
   * Update sales order status
   */
  async updateSalesOrderStatus(id: string, input: UpdateStatusInput) {
    const { data } = await apiClient.patch(`/sales-orders/${id}/status`, input);
    return data;
  },

  /**
   * Delete a sales order (only drafts)
   */
  async deleteSalesOrder(id: string) {
    const { data } = await apiClient.delete(`/sales-orders/${id}`);
    return data;
  },

  /**
   * Convert sales order to invoice
   */
  async convertToInvoice(id: string) {
    const { data } = await apiClient.post(`/sales-orders/${id}/convert-to-invoice`);
    return data;
  },
};
