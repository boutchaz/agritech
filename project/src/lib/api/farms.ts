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

    try {
      // API returns { success: boolean, farms: FarmDto[], total: number }
      const response = await apiClient.get<{ success: boolean; farms: any[]; total: number } | Farm[]>(url, {}, organizationId);

      // Check if response is wrapped in success object
      if (response && typeof response === 'object' && 'success' in response) {
        const wrappedResponse = response as { success: boolean; farms: any[]; total: number };
        if (wrappedResponse.success && Array.isArray(wrappedResponse.farms)) {
          // Transform API response format to expected frontend format
          return wrappedResponse.farms.map((farm) => ({
            id: farm.farm_id,
            name: farm.farm_name,
            location: farm.farm_location || '',
            size: farm.farm_size || 0,
            size_unit: 'hectares',
            manager_name: farm.manager_name || '',
            organization_id: filters?.organization_id || organizationId || '',
            created_at: farm.created_at,
            updated_at: farm.updated_at,
          }));
        }
      }

      // Fallback: if response is already an array (backward compatibility)
      if (Array.isArray(response)) {
        return response;
      }

      return [];
    } catch (error) {
      console.error('Error fetching farms:', error);
      return [];
    }
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
