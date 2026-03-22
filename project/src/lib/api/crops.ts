import { apiClient } from '../api-client';
import { buildQueryUrl, requireOrganizationId } from './createCrudApi';

export interface Crop {
  id: string;
  farm_id: string;
  organization_id?: string;
  parcel_id?: string;
  variety_id: string;
  name: string;
  planting_date?: string;
  expected_harvest_date?: string;
  actual_harvest_date?: string;
  planted_area?: number;
  expected_yield?: number;
  actual_yield?: number;
  yield_unit?: string;
  status?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  farm_name?: string;
  parcel_name?: string;
  variety_name?: string;
}

export interface CropFilters {
  farm_id?: string;
  parcel_id?: string;
  variety_id?: string;
  status?: string;
  search?: string;
}

export interface CreateCropInput {
  farm_id: string;
  parcel_id?: string;
  variety_id: string;
  name: string;
  planting_date?: string;
  expected_harvest_date?: string;
  actual_harvest_date?: string;
  planted_area?: number;
  expected_yield?: number;
  actual_yield?: number;
  yield_unit?: string;
  status?: string;
  notes?: string;
}

export const cropsApi = {
  async getAll(organizationId: string, farmId?: string, parcelId?: string): Promise<Crop[]> {
    requireOrganizationId(organizationId, 'cropsApi.getAll');

    const filters: CropFilters = {};
    if (farmId) filters.farm_id = farmId;
    if (parcelId) filters.parcel_id = parcelId;

    const url = buildQueryUrl(`/api/v1/organizations/${organizationId}/crops`, { ...filters, pageSize: 100 } as Record<string, unknown>);
    const res = await apiClient.get<{ data: Crop[] }>(url);
    return res.data || [];
  },

  async getById(organizationId: string, cropId: string): Promise<Crop | null> {
    requireOrganizationId(organizationId, 'cropsApi.getById');

    try {
      return await apiClient.get<Crop>(`/api/v1/organizations/${organizationId}/crops/${cropId}`);
    } catch (error) {
      // Return null if not found (404)
      if ((error as { status?: number })?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async create(organizationId: string, data: CreateCropInput): Promise<Crop> {
    requireOrganizationId(organizationId, 'cropsApi.create');

    return apiClient.post<Crop>(`/api/v1/organizations/${organizationId}/crops`, data);
  },

  async update(organizationId: string, cropId: string, data: Partial<CreateCropInput>): Promise<Crop> {
    requireOrganizationId(organizationId, 'cropsApi.update');

    return apiClient.patch<Crop>(`/api/v1/organizations/${organizationId}/crops/${cropId}`, data);
  },

  async delete(organizationId: string, cropId: string): Promise<void> {
    requireOrganizationId(organizationId, 'cropsApi.delete');

    return apiClient.delete(`/api/v1/organizations/${organizationId}/crops/${cropId}`);
  },
};
