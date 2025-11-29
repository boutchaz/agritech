/**
 * Purchase Orders API Client
 *
 * Provides functions for interacting with the purchase orders NestJS API
 */

import { apiClient } from '../api-client';

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
  async getPurchaseOrders(filters?: PurchaseOrderFilters) {
    const { data } = await apiClient.get('/purchase-orders', { params: filters });
    return data;
  },

  /**
   * Get a single purchase order by ID
   */
  async getPurchaseOrder(id: string) {
    const { data } = await apiClient.get(`/purchase-orders/${id}`);
    return data;
  },

  /**
   * Create a new purchase order
   */
  async createPurchaseOrder(input: CreatePurchaseOrderInput) {
    const { data } = await apiClient.post('/purchase-orders', input);
    return data;
  },

  /**
   * Update an existing purchase order
   */
  async updatePurchaseOrder(id: string, input: UpdatePurchaseOrderInput) {
    const { data } = await apiClient.patch(`/purchase-orders/${id}`, input);
    return data;
  },

  /**
   * Update purchase order status
   */
  async updatePurchaseOrderStatus(id: string, input: UpdateStatusInput) {
    const { data } = await apiClient.patch(`/purchase-orders/${id}/status`, input);
    return data;
  },

  /**
   * Delete a purchase order (only drafts)
   */
  async deletePurchaseOrder(id: string) {
    const { data } = await apiClient.delete(`/purchase-orders/${id}`);
    return data;
  },

  /**
   * Convert purchase order to bill (purchase invoice)
   */
  async convertToBill(id: string, params?: { invoice_date?: string; due_date?: string }) {
    const { data } = await apiClient.post(`/purchase-orders/${id}/convert-to-bill`, params || {});
    return data;
  },
};
