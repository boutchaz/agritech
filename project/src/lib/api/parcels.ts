import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/parcels';

export interface Parcel {
  id: string;
  name: string;
  description?: string;
  boundary?: number[][];
  farm_id: string;
  crop_category?: string;
  crop_type?: string;
  variety?: string;
  soil_type?: string;
  area?: number;
  area_unit?: string;
  calculated_area?: number;
  perimeter?: number;
  planting_system?: string;
  spacing?: string;
  density_per_hectare?: number;
  plant_count?: number;
  planting_date?: string;
  planting_year?: number;
  rootstock?: string;
  irrigation_type?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  organization_id?: string;
}

export interface CreateParcelDto {
  name: string;
  farm_id: string;
  organization_id?: string;
  description?: string;
  boundary?: number[][];
  area: number;
  area_unit?: string;
  crop_category?: string;
  crop_type?: string;
  variety?: string;
  planting_system?: string;
  spacing?: string;
  density_per_hectare?: number;
  plant_count?: number;
  planting_date?: string;
  planting_year?: number;
  rootstock?: string;
  soil_type?: string;
  irrigation_type?: string;
  calculated_area?: number;
  perimeter?: number;
}

export interface UpdateParcelDto {
  name?: string;
  description?: string;
  boundary?: number[][];
  area?: number;
  area_unit?: string;
  crop_category?: string;
  crop_type?: string;
  variety?: string;
  planting_system?: string;
  spacing?: string;
  density_per_hectare?: number;
  plant_count?: number;
  planting_date?: string;
  planting_year?: number;
  rootstock?: string;
  soil_type?: string;
  irrigation_type?: string;
  calculated_area?: number;
  perimeter?: number;
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
    // Use organizationId param first, then fall back to filters.organization_id
    const orgId = organizationId || filters.organization_id;
    if (orgId) {
      params.append('organization_id', orgId);
    }
    if (filters.farm_id) {
      params.append('farm_id', filters.farm_id);
    }
    const url = `${BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;

    try {
      // Backend returns { success: boolean, parcels: Parcel[] }
      const response = await apiClient.get<{ success: boolean; parcels: Parcel[] } | Parcel[]>(url, {}, organizationId);

      // Check if response is wrapped in success object
      if (response && typeof response === 'object' && 'success' in response) {
        const wrappedResponse = response as { success: boolean; parcels: Parcel[] };
        if (wrappedResponse.success && Array.isArray(wrappedResponse.parcels)) {
          return wrappedResponse.parcels;
        }
      }

      // Fallback: if response is already an array (backward compatibility)
      if (Array.isArray(response)) {
        return response;
      }

      return [];
    } catch (error) {
      console.error('Error fetching parcels:', error);
      return [];
    }
  },

  /**
   * Create a new parcel
   */
  async create(data: CreateParcelDto, organizationId?: string): Promise<Parcel> {
    return apiClient.post(BASE_URL, data, {}, organizationId);
  },

  /**
   * Update an existing parcel
   */
  async update(id: string, data: UpdateParcelDto, organizationId?: string): Promise<Parcel> {
    return apiClient.put(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  /**
   * Delete a parcel
   */
  async delete(parcelId: string, farmId: string, organizationId?: string): Promise<{ success: boolean; message?: string }> {
    // Backend expects DELETE with body containing parcel_id and farm_id
    return apiClient.delete(BASE_URL, { body: JSON.stringify({ parcel_id: parcelId, farm_id: farmId }) }, organizationId);
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
