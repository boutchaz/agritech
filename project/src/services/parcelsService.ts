import { apiClient } from '../lib/api-client';

export interface Parcel {
  id: string;
  farm_id: string;
  name: string;
  description?: string;
  area: number;
  area_unit: string;
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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListParcelsResponse {
  success: boolean;
  parcels: Parcel[];
}

/**
 * Get the current organization ID from localStorage
 */
function getCurrentOrganizationId(): string | null {
  try {
    const orgStr = localStorage.getItem('currentOrganization');
    if (orgStr) {
      const org = JSON.parse(orgStr);
      return org.id || null;
    }
    return null;
  } catch (error) {
    console.error('Error reading organization from localStorage:', error);
    return null;
  }
}

class ParcelsService {
  async listParcels(farmId?: string): Promise<Parcel[]> {
    const organizationId = getCurrentOrganizationId();
    
    if (!organizationId) {
      throw new Error('Organization ID is required. Please select an organization first.');
    }

    const url = new URL('/api/v1/parcels', 'http://dummy');
    url.searchParams.append('organization_id', organizationId);
    
    if (farmId) {
      url.searchParams.append('farm_id', farmId);
    }

    const result = await apiClient.get<ListParcelsResponse>(url.pathname + url.search);
    return result.parcels || [];
  }

  async createParcel(data: {
    farm_id: string;
    name: string;
    description?: string;
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
  }): Promise<Parcel> {
    return apiClient.post<Parcel>('/api/v1/parcels', data);
  }

  async updateParcel(
    parcelId: string,
    data: {
      name?: string;
      description?: string;
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
    }
  ): Promise<Parcel> {
    return apiClient.put<Parcel>(`/api/v1/parcels/${parcelId}`, data);
  }

  async deleteParcel(parcelId: string): Promise<{ success: boolean; deleted_parcel?: { id: string; name: string } }> {
    // Use apiRequest directly since DELETE with body is needed
    const { apiRequest } = await import('../lib/api-client');
    return apiRequest<{ success: boolean; deleted_parcel?: { id: string; name: string } }>('/api/v1/parcels', {
      method: 'DELETE',
      body: JSON.stringify({ parcel_id: parcelId }),
    });
  }
}

export const parcelsService = new ParcelsService();

