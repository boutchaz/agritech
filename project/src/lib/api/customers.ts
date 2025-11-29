import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/customers';

export interface CustomerFilters {
  name?: string;
  customer_code?: string;
  customer_type?: string;
  is_active?: boolean;
  assigned_to?: string;
}

export interface CreateCustomerInput {
  name: string;
  customer_code?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  website?: string;
  tax_id?: string;
  payment_terms?: string;
  credit_limit?: number;
  currency_code?: string;
  customer_type?: string;
  price_list?: string;
  assigned_to?: string;
  notes?: string;
  is_active?: boolean;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export const customersApi = {
  /**
   * Get all customers with optional filters
   */
  async getAll(filters?: CustomerFilters, organizationId?: string) {
    const params = new URLSearchParams();
    if (filters?.name) params.append('name', filters.name);
    if (filters?.customer_code) params.append('customer_code', filters.customer_code);
    if (filters?.customer_type) params.append('customer_type', filters.customer_type);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);

    const url = `${BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get(url, {}, organizationId);
  },

  /**
   * Get a single customer by ID
   */
  async getOne(id: string, organizationId?: string) {
    return apiClient.get(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Create a new customer
   */
  async create(data: CreateCustomerInput, organizationId?: string) {
    return apiClient.post(BASE_URL, data, {}, organizationId);
  },

  /**
   * Update a customer
   */
  async update(id: string, data: UpdateCustomerInput, organizationId?: string) {
    return apiClient.patch(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  /**
   * Delete a customer (soft delete)
   */
  async delete(id: string, organizationId?: string) {
    return apiClient.delete(`${BASE_URL}/${id}`, {}, organizationId);
  },
};
