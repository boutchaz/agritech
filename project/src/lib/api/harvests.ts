import { apiClient } from '../api-client';
import { buildQueryUrl, requireOrganizationId } from './createCrudApi';
import type {
  HarvestRecord,
  HarvestSummary,
  HarvestFilters,
  CreateHarvestRequest,
} from '../../types/harvests';

export const harvestsApi = {
  async getAll(filters?: HarvestFilters, organizationId?: string): Promise<HarvestSummary[]> {
    requireOrganizationId(organizationId, 'harvestsApi.getAll');
    
    const url = buildQueryUrl(`/api/v1/organizations/${organizationId}/harvests`, filters as Record<string, unknown>);
    return apiClient.get<HarvestSummary[]>(url);
  },

  async getOne(id: string, organizationId?: string): Promise<HarvestRecord> {
    requireOrganizationId(organizationId, 'harvestsApi.getOne');
    return apiClient.get<HarvestRecord>(
      `/api/v1/organizations/${organizationId}/harvests/${id}`
    );
  },

  // Alias for backwards compatibility
  async getById(organizationId: string, harvestId: string): Promise<HarvestRecord> {
    return this.getOne(harvestId, organizationId);
  },

  async create(data: CreateHarvestRequest, organizationId?: string): Promise<HarvestRecord> {
    requireOrganizationId(organizationId, 'harvestsApi.create');
    return apiClient.post<HarvestRecord>(
      `/api/v1/organizations/${organizationId}/harvests`,
      data
    );
  },

  async update(
    id: string,
    data: Partial<HarvestRecord>,
    organizationId?: string
  ): Promise<HarvestRecord> {
    requireOrganizationId(organizationId, 'harvestsApi.update');
    return apiClient.patch<HarvestRecord>(
      `/api/v1/organizations/${organizationId}/harvests/${id}`,
      data
    );
  },

  async delete(id: string, organizationId?: string): Promise<void> {
    requireOrganizationId(organizationId, 'harvestsApi.delete');
    return apiClient.delete(`/api/v1/organizations/${organizationId}/harvests/${id}`);
  },
};
