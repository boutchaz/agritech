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
  irrigation_frequency?: string;
  water_quantity_per_session?: number;
  water_quantity_unit?: string;
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

export interface ParcelApplication {
  id: string;
  product_id: string;
  application_date: string;
  quantity_used: number;
  area_treated: number;
  notes?: string;
  cost?: number;
  currency?: string;
  task_id?: string;
  created_at: string;
  inventory: {
    name: string;
    unit: string;
  };
}

export interface ParcelApplicationsResponse {
  success: boolean;
  parcel_id: string;
  applications: ParcelApplication[];
  total: number;
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
  async listParcels(farmId?: string, organizationId?: string | null): Promise<Parcel[]> {
    const orgId = organizationId || getCurrentOrganizationId();

    if (!orgId) {
      throw new OrganizationRequiredError();
    }

    const url = new URL('/api/v1/parcels', 'http://dummy');
    url.searchParams.append('organization_id', orgId);

    if (farmId) {
      url.searchParams.append('farm_id', farmId);
    }

    // Pass organizationId in header as well
    const result = await apiClient.get<ListParcelsResponse>(
      url.pathname + url.search,
      {},
      orgId
    );
    type ListResponse = { data?: Parcel[]; parcels?: Parcel[] };
    const resp = result as unknown as ListResponse;
    return resp.data || resp.parcels || [];
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
      irrigation_frequency?: string;
      water_quantity_per_session?: number;
      water_quantity_unit?: string;
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
      irrigation_frequency?: string;
      water_quantity_per_session?: number;
      water_quantity_unit?: string;
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

  async archiveParcel(parcelId: string): Promise<{ success: boolean; archived_parcel?: { id: string; name: string } }> {
    const { apiRequest } = await import('../lib/api-client');
    const organizationId = getCurrentOrganizationId();
    return apiRequest<{ success: boolean; archived_parcel?: { id: string; name: string } }>(
      '/api/v1/parcels',
      {
        method: 'DELETE',
        body: JSON.stringify({ parcel_id: parcelId }),
      },
      organizationId
    );
  }

  async restoreParcel(parcelId: string): Promise<{ success: boolean; restored_parcel?: { id: string; name: string } }> {
    const { apiRequest } = await import('../lib/api-client');
    const organizationId = getCurrentOrganizationId();
    return apiRequest<{ success: boolean; restored_parcel?: { id: string; name: string } }>(
      `/api/v1/parcels/${parcelId}/restore`,
      { method: 'PATCH' },
      organizationId
    );
  }

  async getParcelApplications(parcelId: string): Promise<ParcelApplicationsResponse> {
    const organizationId = getCurrentOrganizationId();
    return apiClient.get<ParcelApplicationsResponse>(
      `/api/v1/parcels/${parcelId}/applications`,
      {},
      organizationId
    );
  }
}

export const parcelsService = new ParcelsService();
