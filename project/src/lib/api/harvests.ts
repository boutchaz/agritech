import { apiClient } from '../api-client';
import type {
  HarvestRecord,
  HarvestSummary,
  HarvestFilters,
  CreateHarvestRequest,
} from '../../types/harvests';

export const harvestsApi = {
  async getAll(filters?: HarvestFilters, organizationId?: string): Promise<HarvestSummary[]> {
    if (!organizationId) throw new Error('organizationId is required');
    
    const params = new URLSearchParams();

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      params.append('status', statuses.join(','));
    }

    if (filters?.farm_id) {
      params.append('farm_id', filters.farm_id);
    }

    if (filters?.parcel_id) {
      params.append('parcel_id', filters.parcel_id);
    }

    if (filters?.crop_id) {
      params.append('crop_id', filters.crop_id);
    }

    if (filters?.date_from) {
      params.append('date_from', filters.date_from);
    }

    if (filters?.date_to) {
      params.append('date_to', filters.date_to);
    }

    if (filters?.quality_grade) {
      const grades = Array.isArray(filters.quality_grade) ? filters.quality_grade : [filters.quality_grade];
      params.append('quality_grade', grades.join(','));
    }

    if (filters?.intended_for) {
      params.append('intended_for', filters.intended_for);
    }

    const queryString = params.toString();
    return apiClient.get<HarvestSummary[]>(
      `/api/v1/organizations/${organizationId}/harvests${queryString ? `?${queryString}` : ''}`
    );
  },

  async getOne(id: string, organizationId?: string): Promise<HarvestRecord> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.get<HarvestRecord>(
      `/api/v1/organizations/${organizationId}/harvests/${id}`
    );
  },

  // Alias for backwards compatibility
  async getById(organizationId: string, harvestId: string): Promise<HarvestRecord> {
    return this.getOne(harvestId, organizationId);
  },

  async create(data: CreateHarvestRequest, organizationId?: string): Promise<HarvestRecord> {
    if (!organizationId) throw new Error('organizationId is required');
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
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.patch<HarvestRecord>(
      `/api/v1/organizations/${organizationId}/harvests/${id}`,
      data
    );
  },

  async delete(id: string, organizationId?: string): Promise<void> {
    if (!organizationId) throw new Error('organizationId is required');
    return apiClient.delete(`/api/v1/organizations/${organizationId}/harvests/${id}`);
  },
};
