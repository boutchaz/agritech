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
  async getSalesOrders(filters?: SalesOrderFilters, organizationId?: string) {
    const { data } = await apiClient.get(BASE_URL, {}, organizationId);
    return data;
  },

  /**
   * Get a single sales order by ID
   */
  async getSalesOrder(id: string, organizationId?: string) {
    const { data } = await apiClient.get(`${BASE_URL}/${id}`, {}, organizationId);
    return data;
  },

  /**
   * Create a new sales order
   */
  async createSalesOrder(input: CreateSalesOrderInput, organizationId?: string) {
    const { data } = await apiClient.post(BASE_URL, input, {}, organizationId);
    return data;
  },

  /**
   * Update an existing sales order
   */
  async updateSalesOrder(id: string, input: UpdateSalesOrderInput, organizationId?: string) {
    const { data } = await apiClient.patch(`${BASE_URL}/${id}`, input, {}, organizationId);
    return data;
  },

  /**
   * Update sales order status
   */
  async updateSalesOrderStatus(id: string, input: UpdateStatusInput, organizationId?: string) {
    const { data } = await apiClient.patch(`${BASE_URL}/${id}/status`, input, {}, organizationId);
    return data;
  },

  /**
   * Delete a sales order (only drafts)
   */
  async deleteSalesOrder(id: string, organizationId?: string) {
    const { data} = await apiClient.delete(`${BASE_URL}/${id}`, {}, organizationId);
    return data;
  },

  /**
   * Convert sales order to invoice
   */
  async convertToInvoice(id: string, params?: { invoice_date?: string; due_date?: string }, organizationId?: string) {
    const { data } = await apiClient.post(`${BASE_URL}/${id}/convert-to-invoice`, params || {}, {}, organizationId);
    return data;
  },
};
