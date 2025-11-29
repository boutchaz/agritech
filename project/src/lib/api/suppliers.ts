import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/suppliers';

export interface SupplierFilters {
  name?: string;
  supplier_code?: string;
  supplier_type?: string;
  is_active?: boolean;
  assigned_to?: string;
}

export interface CreateSupplierInput {
  name: string;
  supplier_code?: string;
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
  currency_code?: string;
  supplier_type?: string;
  assigned_to?: string;
  notes?: string;
  is_active?: boolean;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export const suppliersApi = {
  /**
   * Get all suppliers with optional filters
   */
  async getAll(filters?: SupplierFilters, organizationId?: string) {
    const params = new URLSearchParams();
    if (filters?.name) params.append('name', filters.name);
    if (filters?.supplier_code) params.append('supplier_code', filters.supplier_code);
    if (filters?.supplier_type) params.append('supplier_type', filters.supplier_type);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);

    const url = `${BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get(url, {}, organizationId);
  },

  /**
   * Get a single supplier by ID
   */
  async getOne(id: string, organizationId?: string) {
    return apiClient.get(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Create a new supplier
   */
  async create(data: CreateSupplierInput, organizationId?: string) {
    return apiClient.post(BASE_URL, data, {}, organizationId);
  },

  /**
   * Update a supplier
   */
  async update(id: string, data: UpdateSupplierInput, organizationId?: string) {
    return apiClient.patch(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  /**
   * Delete a supplier (soft delete)
   */
  async delete(id: string, organizationId?: string) {
    return apiClient.delete(`${BASE_URL}/${id}`, {}, organizationId);
  },
};
