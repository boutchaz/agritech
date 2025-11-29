import { apiClient } from '../api-client';
import type { Tax } from '../taxCalculations';

const BASE_URL = '/api/v1/taxes';

export interface CreateTaxInput {
  tax_name: string;
  tax_rate: number;
  tax_type: 'sales' | 'purchase' | 'both';
  is_active?: boolean;
  description?: string;
}

export interface UpdateTaxInput {
  tax_name?: string;
  tax_rate?: number;
  tax_type?: 'sales' | 'purchase' | 'both';
  is_active?: boolean;
  description?: string;
}

export interface TaxFilters {
  tax_type?: 'sales' | 'purchase' | 'both';
  is_active?: boolean;
  search?: string;
}

export const taxesApi = {
  /**
   * Get all taxes with optional filters
   */
  async getAll(filters?: TaxFilters, organizationId?: string): Promise<Tax[]> {
    const params = new URLSearchParams();

    if (filters?.tax_type) params.append('tax_type', filters.tax_type);
    if (filters?.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString());
    }
    if (filters?.search) params.append('search', filters.search);

    const url = `${BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<Tax[]>(url, {}, organizationId);
  },

  /**
   * Get a single tax by ID
   */
  async getOne(id: string, organizationId?: string): Promise<Tax> {
    return apiClient.get<Tax>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Create a new tax
   */
  async create(data: CreateTaxInput, organizationId?: string): Promise<Tax> {
    return apiClient.post<Tax>(BASE_URL, data, {}, organizationId);
  },

  /**
   * Update a tax
   */
  async update(id: string, data: UpdateTaxInput, organizationId?: string): Promise<Tax> {
    return apiClient.patch<Tax>(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  /**
   * Delete a tax
   */
  async delete(id: string, organizationId?: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`${BASE_URL}/${id}`, {}, organizationId);
  },
};
