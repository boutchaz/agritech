import { apiClient } from '../api-client';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
type Tax = Tables['taxes']['Row'];

export interface TaxFilters {
  tax_type?: 'sales' | 'purchase' | 'both';
  is_active?: boolean;
  search?: string;
}

export const taxesApi = {
  async getAll(organizationId: string, filters?: TaxFilters): Promise<Tax[]> {
    const params = new URLSearchParams();
      if (filters?.tax_type) params.append('tax_type', filters.tax_type);
      if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
      if (filters?.search) params.append('search', filters.search);
    const queryString = params.toString();
    return apiClient.get<Tax[]>(`/api/v1/taxes${queryString ? `?${queryString}` : ''}`);
  },

  async getById(taxId: string): Promise<Tax> {
    return apiClient.get<Tax>(`/api/v1/taxes/${taxId}`);
  },

  async create(tax: any): Promise<Tax> {
    return apiClient.post<Tax>(`/api/v1/taxes`, tax);
  },

  async update(taxId: string, updates: Partial<Tax>): Promise<Tax> {
    return apiClient.patch<Tax>(`/api/v1/taxes/${taxId}`, updates);
  },

  async delete(taxId: string): Promise<void> {
    await apiClient.delete(`/api/v1/taxes/${taxId}`);
  },
};
