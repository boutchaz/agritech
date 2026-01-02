import { createCrudApi } from './createCrudApi';
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

export interface CreateFarmInput {
  name: string;
  location?: string;
  size?: number;
  size_unit?: string;
  manager_name?: string;
}

export interface UpdateFarmInput {
  name?: string;
  location?: string;
  size?: number;
  size_unit?: string;
  manager_name?: string;
}

export interface FarmFilters {
  organization_id?: string;
}

const baseCrud = createCrudApi<Farm, CreateFarmInput, FarmFilters, UpdateFarmInput>(BASE_URL);

export const farmsApi = {
  ...baseCrud,

  /**
   * Get related data counts for a farm
   */
  async getRelatedDataCounts(id: string, organizationId?: string) {
    return apiClient.get(`${BASE_URL}/${id}/related-data-counts`, {}, organizationId);
  },
};
