import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/farms';

export interface Farm {
  id: string;
  name: string;
  location?: string;
  size?: number;
  size_unit?: string;
  manager_name?: string;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface FarmFilters {
  organization_id?: string;
}

export const farmsApi = {
  /**
   * Get all farms for an organization
   */
  async getAll(filters?: FarmFilters, organizationId?: string): Promise<Farm[]> {
    const params = new URLSearchParams();
    if (filters?.organization_id) {
      params.append('organization_id', filters.organization_id);
    }
    const url = `${BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get(url, {}, organizationId);
  },

  /**
   * Get a single farm by ID
   */
  async getOne(id: string, organizationId?: string): Promise<Farm> {
    return apiClient.get(`${BASE_URL}/${id}`, {}, organizationId);
  },

  /**
   * Get related data counts for a farm
   */
  async getRelatedDataCounts(id: string, organizationId?: string) {
    return apiClient.get(`${BASE_URL}/${id}/related-data-counts`, {}, organizationId);
  },
};
