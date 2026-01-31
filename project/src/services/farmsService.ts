import { apiClient } from '../lib/api-client';
import { useOrganizationStore } from '../stores/organizationStore';
import { OrganizationRequiredError, ErrorHandlers } from '../lib/errors';

export interface Farm {
  id: string;
  organization_id: string;
  name: string;
  location?: string;
  size?: number;
  size_unit?: string;
  description?: string;
  manager_name?: string;
  manager_email?: string;
  manager_phone?: string;
  status?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  currency_code?: string;
  timezone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RelatedDataCounts {
  parcels: number;
  workers: number;
  tasks: number;
  satellite_data: number;
  warehouses: number;
  inventory_items: number;
  structures: number;
}

/**
 * Get the current organization ID from Zustand store or localStorage fallback
 */
function getCurrentOrganizationId(): string | null {
  try {
    // Try Zustand store first (preferred)
    const storeOrg = useOrganizationStore.getState().currentOrganization;
    if (storeOrg?.id) {
      return storeOrg.id;
    }

    // Fallback to localStorage (legacy key)
    const orgStr = localStorage.getItem('currentOrganization');
    if (orgStr) {
      const org = JSON.parse(orgStr);
      if (org.id) return org.id;
    }

    // Try Zustand persisted storage key
    const zustandStorage = localStorage.getItem('organization-storage');
    if (zustandStorage) {
      const parsed = JSON.parse(zustandStorage);
      if (parsed?.state?.currentOrganization?.id) {
        return parsed.state.currentOrganization.id;
      }
    }

    return null;
  } catch (error) {
    ErrorHandlers.log(error, 'Error reading organization');
    return null;
  }
}

class FarmsService {
  async getFarmHierarchy(organizationId: string): Promise<Array<{
    farm_id: string;
    farm_name: string;
    farm_location: string;
    farm_size: number;
    farm_type: 'main' | 'sub';
    parent_farm_id: string | null;
    hierarchy_level: number;
    manager_name: string;
    sub_farms_count: number;
    is_active: boolean;
  }>> {
    return apiClient.get(
      `/api/v1/farms/hierarchy?organization_id=${organizationId}`,
      {},
      organizationId
    );
  }

  async getFarm(farmId: string, organizationId?: string): Promise<Farm> {
    // Pass organizationId in header if provided
    const orgId = organizationId || getCurrentOrganizationId();
    return apiClient.get<Farm>(
      `/api/v1/farms/${farmId}`,
      {},
      orgId
    );
  }

  async listFarms(organizationId: string): Promise<Farm[]> {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const url = `${apiUrl}/api/v1/farms?organization_id=${organizationId}`;
    // Pass organizationId in header as well
    const result = await apiClient.get<{ success: boolean; farms: Farm[] }>(
      url,
      {},
      organizationId
    );
    return result.farms || [];
  }

  async getOrganization(organizationId: string): Promise<Organization> {
    // Pass organizationId both in URL and as header (required by backend)
    return apiClient.get<Organization>(
      `/api/v1/organizations/${organizationId}`,
      {}, // options
      organizationId // organizationId for header
    );
  }

  async getRelatedDataCounts(farmId: string, organizationId?: string): Promise<RelatedDataCounts> {
    // Pass organizationId in header if provided
    const orgId = organizationId || getCurrentOrganizationId();
    return apiClient.get<RelatedDataCounts>(
      `/api/v1/farms/${farmId}/related-data-counts`,
      {},
      orgId
    );
  }

  async createFarm(data: {
    name: string;
    location?: string;
    size?: number;
    size_unit?: string;
    description?: string;
    manager_name?: string;
    manager_email?: string;
    manager_phone?: string;
    is_active?: boolean;
    status?: string;
  }): Promise<Farm> {
    const organizationId = getCurrentOrganizationId();
    if (!organizationId) {
      throw new OrganizationRequiredError();
    }

    // Pass organizationId explicitly in header
    return apiClient.post<Farm>(
      '/api/v1/farms',
      data,
      {},
      organizationId
    );
  }

  async deleteFarm(farmId: string): Promise<{ success: boolean; deleted_farm?: { id: string; name: string } }> {
    // Use apiRequest directly since DELETE with body is needed
    const { apiRequest } = await import('../lib/api-client');
    const organizationId = getCurrentOrganizationId();
    return apiRequest<{ success: boolean; deleted_farm?: { id: string; name: string } }>(
      '/api/v1/farms',
      {
        method: 'DELETE',
        body: JSON.stringify({ farm_id: farmId }),
      },
      organizationId
    );
  }

  async batchDeleteFarms(farmIds: string[]): Promise<{ deleted: number; failed: number; errors?: Array<{ name: string; error: string }> }> {
    const organizationId = getCurrentOrganizationId();
    return apiClient.post<{ deleted: number; failed: number; errors?: Array<{ name: string; error: string }> }>(
      '/api/v1/farms/batch-delete',
      { farm_ids: farmIds },
      {},
      organizationId
    );
  }

  async exportFarm(data: {
    farm_id?: string;
    organization_id?: string;
    include_sub_farms?: boolean;
  }): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const organizationId = data.organization_id || getCurrentOrganizationId();
    return apiClient.post<{ success: boolean; data?: unknown; error?: string }>(
      '/api/v1/farms/export',
      data,
      {},
      organizationId
    );
  }
}

export const farmsService = new FarmsService();
