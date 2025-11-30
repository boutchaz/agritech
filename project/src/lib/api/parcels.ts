import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/parcels';

export interface Parcel {
  id: string;
  name: string;
  boundary: number[][];
  farm_id: string;
  crop_id?: string;
  soil_type?: string;
  area?: number;
  calculated_area?: number;
  perimeter?: number;
  planting_density?: number;
  irrigation_type?: string;
  variety?: string;
  planting_date?: string;
  planting_type?: string;
  created_at?: string;
  updated_at?: string;
  organization_id: string;
}

export interface CreateParcelDto {
  name: string;
  farm_id: string;
  boundary: number[][];
  soil_type?: string;
  area?: number;
  calculated_area?: number;
  perimeter?: number;
  planting_density?: number;
  irrigation_type?: string;
  crop_id?: string;
  variety?: string;
  planting_date?: string;
  planting_type?: string;
}

export interface UpdateParcelDto {
  name?: string;
  boundary?: number[][];
  soil_type?: string;
  area?: number;
  calculated_area?: number;
  perimeter?: number;
  planting_density?: number;
  irrigation_type?: string;
  crop_id?: string;
  variety?: string;
  planting_date?: string;
  planting_type?: string;
}

export interface ParcelFilters {
  organization_id?: string;
  farm_id?: string;
}

export interface PerformanceSummaryFilters {
  farmId?: string;
  parcelId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export const parcelsApi = {
  /**
   * Get all parcels for an organization, optionally filtered by farm
   */
  async getAll(filters: ParcelFilters, organizationId?: string): Promise<Parcel[]> {
    const params = new URLSearchParams();
    if (filters.organization_id) {
      params.append('organization_id', filters.organization_id);
    }
    if (filters.farm_id) {
      params.append('farm_id', filters.farm_id);
    }
    const url = `${BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get(url, {}, organizationId);
  },

  /**
   * Create a new parcel
   */
  async create(data: CreateParcelDto, organizationId?: string): Promise<Parcel> {
    return apiClient.post(BASE_URL, data, organizationId);
  },

  /**
   * Update an existing parcel
   */
  async update(id: string, data: UpdateParcelDto, organizationId?: string): Promise<Parcel> {
    return apiClient.put(`${BASE_URL}/${id}`, data, organizationId);
  },

  /**
   * Delete a parcel
   */
  async delete(parcelId: string, farmId: string, organizationId?: string): Promise<void> {
    return apiClient.delete(BASE_URL, { parcel_id: parcelId, farm_id: farmId }, organizationId);
  },

  /**
   * Get performance summary for parcels
   */
  async getPerformanceSummary(filters: PerformanceSummaryFilters, organizationId?: string) {
    const params = new URLSearchParams();
    if (filters.farmId) params.append('farmId', filters.farmId);
    if (filters.parcelId) params.append('parcelId', filters.parcelId);
    if (filters.fromDate) params.append('fromDate', filters.fromDate.toISOString());
    if (filters.toDate) params.append('toDate', filters.toDate.toISOString());

    const url = `${BASE_URL}/performance${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get(url, {}, organizationId);
  },
};
