import { apiClient } from '../api-client';
import type {
  HarvestRecord,
  HarvestSummary,
  HarvestFilters,
  CreateHarvestRequest,
} from '../../types/harvests';

export const harvestsApi = {
  async getAll(organizationId: string, filters?: HarvestFilters): Promise<HarvestSummary[]> {
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

  async getById(organizationId: string, harvestId: string): Promise<HarvestRecord> {
    return apiClient.get<HarvestRecord>(
      `/api/v1/organizations/${organizationId}/harvests/${harvestId}`
    );
  },

  async create(organizationId: string, data: CreateHarvestRequest): Promise<HarvestRecord> {
    return apiClient.post<HarvestRecord>(
      `/api/v1/organizations/${organizationId}/harvests`,
      data
    );
  },

  async update(
    organizationId: string,
    harvestId: string,
    data: Partial<HarvestRecord>
  ): Promise<HarvestRecord> {
    return apiClient.patch<HarvestRecord>(
      `/api/v1/organizations/${organizationId}/harvests/${harvestId}`,
      data
    );
  },

  async delete(organizationId: string, harvestId: string): Promise<void> {
    return apiClient.delete(`/api/v1/organizations/${organizationId}/harvests/${harvestId}`);
  },
};
