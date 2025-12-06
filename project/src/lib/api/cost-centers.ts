import { apiClient } from '../api-client';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
type CostCenter = Tables['cost_centers']['Row'];

export interface CostCenterFilters {
  is_active?: boolean;
  search?: string;
}

export interface CreateCostCenterInput {
  code: string;
  name: string;
  description?: string;
  parent_id?: string;
  is_active?: boolean;
}

export interface UpdateCostCenterInput {
  code?: string;
  name?: string;
  description?: string;
  parent_id?: string;
  is_active?: boolean;
}

export const costCentersApi = {
  async getAll(filters?: CostCenterFilters): Promise<CostCenter[]> {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.search) params.append('search', filters.search);
    const queryString = params.toString();
    return apiClient.get<CostCenter[]>(`/cost-centers${queryString ? `?${queryString}` : ''}`);
  },

  async getOne(id: string): Promise<CostCenter> {
    return apiClient.get<CostCenter>(`/cost-centers/${id}`);
  },

  async create(data: CreateCostCenterInput): Promise<CostCenter> {
    return apiClient.post<CostCenter>('/cost-centers', data);
  },

  async update(id: string, data: UpdateCostCenterInput): Promise<CostCenter> {
    return apiClient.patch<CostCenter>(`/cost-centers/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/cost-centers/${id}`);
  },
};
