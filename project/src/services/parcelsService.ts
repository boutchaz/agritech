import { apiClient } from '../lib/api-client';
import { useOrganizationStore } from '../stores/organizationStore';
import { OrganizationRequiredError, ErrorHandlers } from '../lib/errors';

export interface Parcel {
  id: string;
  farm_id: string;
  organization_id?: string;
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
  boundary?: number[][];
  calculated_area?: number;
  perimeter?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListParcelsResponse {
  success: boolean;
  parcels: Parcel[];
}

/**
 * Get the current organization ID from Zustand store
 * This matches the approach used in api-client.ts for consistency
 */
function getCurrentOrganizationId(): string | null {
  try {
    const currentOrganization = useOrganizationStore.getState().currentOrganization;
    return currentOrganization?.id || null;
  } catch (error) {
    ErrorHandlers.log(error, '[ParcelsService] Error reading organization from store');
    return null;
  }
}

class ParcelsService {
  async listParcels(farmId?: string): Promise<Parcel[]> {
    const organizationId = getCurrentOrganizationId();

    if (!organizationId) {
      throw new OrganizationRequiredError();
    }

    const url = new URL('/api/v1/parcels', 'http://dummy');
    url.searchParams.append('organization_id', organizationId);

    if (farmId) {
      url.searchParams.append('farm_id', farmId);
    }

    // Pass organizationId in header as well
    const result = await apiClient.get<ListParcelsResponse>(
      url.pathname + url.search,
      {},
      organizationId
    );
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
    const organizationId = getCurrentOrganizationId();
    return apiClient.post<Parcel>(
      '/api/v1/parcels',
      data,
      {},
      organizationId
    );
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
    const organizationId = getCurrentOrganizationId();
    return apiClient.put<Parcel>(
      `/api/v1/parcels/${parcelId}`,
      data,
      {},
      organizationId
    );
  }

  async getParcelById(parcelId: string): Promise<Parcel | null> {
    // Fetch all parcels for organization and find by ID
    // TODO: Add dedicated GET /api/v1/parcels/:id endpoint in backend
    const parcels = await this.listParcels();
    return parcels.find(p => p.id === parcelId) || null;
  }

  async deleteParcel(parcelId: string): Promise<{ success: boolean; deleted_parcel?: { id: string; name: string } }> {
    // Use apiRequest directly since DELETE with body is needed
    const { apiRequest } = await import('../lib/api-client');
    const organizationId = getCurrentOrganizationId();
    return apiRequest<{ success: boolean; deleted_parcel?: { id: string; name: string } }>(
      '/api/v1/parcels',
      {
        method: 'DELETE',
        body: JSON.stringify({ parcel_id: parcelId }),
      },
      organizationId
    );
  }
}

export const parcelsService = new ParcelsService();

