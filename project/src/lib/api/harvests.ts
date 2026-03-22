import { apiClient } from '../api-client';
import { buildQueryUrl, requireOrganizationId } from './createCrudApi';
import type { PaginatedQuery, PaginatedResponse } from './types';
import type {
  HarvestRecord,
  HarvestSummary,
  HarvestFilters,
  CreateHarvestRequest,
} from '../../types/harvests';

export interface PaginatedHarvestQuery extends PaginatedQuery {
  parcel_id?: string;
  crop_id?: string;
  status?: string;
  quality_grade?: string;
}

export const harvestsApi = {
  async getAll(filters?: HarvestFilters, organizationId?: string): Promise<HarvestSummary[]> {
    requireOrganizationId(organizationId, 'harvestsApi.getAll');

    const url = buildQueryUrl(`/api/v1/organizations/${organizationId}/harvests`, filters as Record<string, unknown>);
    const response = await apiClient.get<PaginatedResponse<HarvestSummary>>(url);
    return response.data || [];
  },

  async getPaginated(organizationId: string, query: PaginatedHarvestQuery): Promise<PaginatedResponse<HarvestSummary>> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', String(query.page));
    if (query.pageSize) params.append('pageSize', String(query.pageSize));
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortDir) params.append('sortDir', query.sortDir);
    if (query.search) params.append('search', query.search);
    if (query.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query.dateTo) params.append('dateTo', query.dateTo);
    if (query.parcel_id) params.append('parcel_id', query.parcel_id);
    if (query.crop_id) params.append('crop_id', query.crop_id);
    if (query.status) params.append('status', query.status);
    if (query.quality_grade) params.append('quality_grade', query.quality_grade);
    const queryString = params.toString();
    return apiClient.get<PaginatedResponse<HarvestSummary>>(`/api/v1/organizations/${organizationId}/harvests${queryString ? `?${queryString}` : ''}`);
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
