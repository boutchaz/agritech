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
  date_from?: string;
  date_to?: string;
  stock_received?: string;
  page?: number;
  limit?: number;
}

export interface UpdateStatusInput {
  status: string;
  notes?: string;
}

export const purchaseOrdersApi = {
  /**
   * Get all purchase orders with optional filters
   */
  async getPurchaseOrders(filters?: PurchaseOrderFilters, organizationId?: string) {
    const { data } = await apiClient.get(BASE_URL, {}, organizationId);
    return data;
  },

  /**
   * Get a single purchase order by ID
   */
  async getPurchaseOrder(id: string, organizationId?: string) {
    const { data } = await apiClient.get(`${BASE_URL}/${id}`, {}, organizationId);
    return data;
  },

  /**
   * Create a new purchase order
   */
  async createPurchaseOrder(input: CreatePurchaseOrderInput, organizationId?: string) {
    const { data } = await apiClient.post(BASE_URL, input, {}, organizationId);
    return data;
  },

  /**
   * Update an existing purchase order
   */
  async updatePurchaseOrder(id: string, input: UpdatePurchaseOrderInput, organizationId?: string) {
    const { data } = await apiClient.patch(`${BASE_URL}/${id}`, input, {}, organizationId);
    return data;
  },

  /**
   * Update purchase order status
   */
  async updatePurchaseOrderStatus(id: string, input: UpdateStatusInput, organizationId?: string) {
    const { data } = await apiClient.patch(`${BASE_URL}/${id}/status`, input, {}, organizationId);
    return data;
  },

  /**
   * Delete a purchase order (only drafts)
   */
  async deletePurchaseOrder(id: string, organizationId?: string) {
    const { data } = await apiClient.delete(`${BASE_URL}/${id}`, {}, organizationId);
    return data;
  },

  /**
   * Convert purchase order to bill (purchase invoice)
   */
  async convertToBill(id: string, params?: { invoice_date?: string; due_date?: string }, organizationId?: string) {
    const { data } = await apiClient.post(`${BASE_URL}/${id}/convert-to-bill`, params || {}, {}, organizationId);
    return data;
  },
};
