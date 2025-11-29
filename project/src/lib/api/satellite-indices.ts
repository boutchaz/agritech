import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/satellite-indices';

export interface SatelliteIndex {
  id: string;
  organization_id: string;
  parcel_id: string;
  farm_id: string;
  index_name: string;
  index_value: number;
  date: string;
  cloud_coverage?: number;
  image_url?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface SatelliteIndexFilters {
  parcel_id?: string;
  farm_id?: string;
  index_name?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface CreateSatelliteIndexInput {
  parcel_id: string;
  farm_id: string;
  index_name: string;
  index_value: number;
  date: string;
  cloud_coverage?: number;
  image_url?: string;
  metadata?: Record<string, any>;
}

export type UpdateSatelliteIndexInput = Partial<Omit<CreateSatelliteIndexInput, 'parcel_id' | 'farm_id'>>;

export const satelliteIndicesApi = {
  /**
   * Get all satellite indices with optional filters
   */
  async getAll(filters?: SatelliteIndexFilters, organizationId?: string) {
    const params = new URLSearchParams();
    if (filters?.parcel_id) params.append('parcel_id', filters.parcel_id);
    if (filters?.farm_id) params.append('farm_id', filters.farm_id);
    if (filters?.index_name) params.append('index_name', filters.index_name);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const url = `${BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get(url, {}, organizationId);
  },

  /**
   * Get a single satellite index by ID
   */
  async getOne(id: string, organizationId?: string) {
    return apiClient.get(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Create a new satellite index record
   */
  async create(data: CreateSatelliteIndexInput, organizationId?: string) {
    return apiClient.post(BASE_URL, data, {}, organizationId);
  },

  /**
   * Update a satellite index record
   */
  async update(id: string, data: UpdateSatelliteIndexInput, organizationId?: string) {
    return apiClient.patch(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  /**
   * Delete a satellite index record
   */
  async delete(id: string, organizationId?: string) {
    return apiClient.delete(`${BASE_URL}/${id}`, {}, organizationId);
  },
};
