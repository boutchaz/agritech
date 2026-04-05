import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/soil-analyses';

export interface SoilAnalysis {
  id: string;
  analysis_date: string;
  parcel_id: string;
  test_type_id?: string;
  physical?: Record<string, unknown>;
  chemical?: Record<string, unknown>;
  biological?: Record<string, unknown>;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface SoilAnalysisFilters {
  parcel_id?: string;
  parcel_ids?: string[];
  test_type_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface CreateSoilAnalysisInput {
  analysis_date: string;
  parcel_id: string;
  test_type_id?: string;
  physical?: Record<string, unknown>;
  chemical?: Record<string, unknown>;
  biological?: Record<string, unknown>;
  notes?: string;
}

export type UpdateSoilAnalysisInput = Partial<Omit<CreateSoilAnalysisInput, 'parcel_id'>>;

export const soilAnalysesApi = {
  /**
   * Get all soil analyses with optional filters
   */
  async getAll(filters?: SoilAnalysisFilters, organizationId?: string) {
    const params = new URLSearchParams();
    if (filters?.parcel_id) params.append('parcel_id', filters.parcel_id);
    if (filters?.parcel_ids?.length) params.append('parcel_ids', filters.parcel_ids.join(','));
    if (filters?.test_type_id) params.append('test_type_id', filters.test_type_id);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const url = `${BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await apiClient.get<{ data: SoilAnalysis[] }>(url, {}, organizationId);
    return res?.data || [];
  },

  /**
   * Get a single soil analysis by ID
   */
  async getOne(id: string, organizationId?: string) {
    return apiClient.get(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Create a new soil analysis
   */
  async create(data: CreateSoilAnalysisInput, organizationId?: string) {
    return apiClient.post(BASE_URL, data, {}, organizationId);
  },

  /**
   * Update a soil analysis
   */
  async update(id: string, data: UpdateSoilAnalysisInput, organizationId?: string) {
    return apiClient.patch(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  /**
   * Delete a soil analysis
   */
  async delete(id: string, organizationId?: string) {
    return apiClient.delete(`${BASE_URL}/${id}`, {}, organizationId);
  },
};
