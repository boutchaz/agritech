import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/work-units';

export enum UnitCategory {
  COUNT = 'count',
  WEIGHT = 'weight',
  VOLUME = 'volume',
  AREA = 'area',
  LENGTH = 'length',
}

export interface WorkUnit {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  unit_category: UnitCategory;
  description?: string;
  base_rate?: number;
  is_active: boolean;
  usage_count: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface WorkUnitFilters {
  is_active?: boolean;
  unit_category?: UnitCategory;
  code?: string;
  name?: string;
}

export interface CreateWorkUnitInput {
  code: string;
  name: string;
  unit_category: UnitCategory;
  description?: string;
  base_rate?: number;
  is_active?: boolean;
}

export type UpdateWorkUnitInput = Partial<Omit<CreateWorkUnitInput, 'code'>>;

export const workUnitsApi = {
  /**
   * Get all work units with optional filters
   */
  async getAll(filters?: WorkUnitFilters, organizationId?: string) {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.unit_category) params.append('unit_category', filters.unit_category);
    if (filters?.code) params.append('code', filters.code);
    if (filters?.name) params.append('name', filters.name);

    const url = `${BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await apiClient.get<{ data: any[] }>(url, {}, organizationId);
    return res?.data || [];
  },

  /**
   * Get a single work unit by ID
   */
  async getOne(id: string, organizationId?: string) {
    return apiClient.get(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Create a new work unit
   */
  async create(data: CreateWorkUnitInput, organizationId?: string) {
    return apiClient.post(BASE_URL, data, {}, organizationId);
  },

  /**
   * Update a work unit
   */
  async update(id: string, data: UpdateWorkUnitInput, organizationId?: string) {
    return apiClient.patch(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  /**
   * Delete a work unit (only if usage_count is 0)
   */
  async delete(id: string, organizationId?: string) {
    return apiClient.delete(`${BASE_URL}/${id}`, {}, organizationId);
  },
};
