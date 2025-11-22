import { apiClient } from '../lib/api-client';

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

class FarmsService {
  async getFarm(farmId: string): Promise<Farm> {
    return apiClient.get<Farm>(`/api/v1/farms/${farmId}`);
  }

  async getOrganization(organizationId: string): Promise<Organization> {
    return apiClient.get<Organization>(`/api/v1/organizations/${organizationId}`);
  }

  async getRelatedDataCounts(farmId: string): Promise<RelatedDataCounts> {
    return apiClient.get<RelatedDataCounts>(`/api/v1/farms/${farmId}/related-data-counts`);
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
      throw new Error('Organization ID is required. Please select an organization first.');
    }

    // Note: The API expects X-Organization-Id header, which is automatically added by apiClient
    return apiClient.post<Farm>('/api/v1/farms', data);
  }

  async deleteFarm(farmId: string): Promise<{ success: boolean; deleted_farm?: { id: string; name: string } }> {
    // Use apiRequest directly since DELETE with body is needed
    const { apiRequest } = await import('../lib/api-client');
    return apiRequest<{ success: boolean; deleted_farm?: { id: string; name: string } }>('/api/v1/farms', {
      method: 'DELETE',
      body: JSON.stringify({ farm_id: farmId }),
    });
  }

  async batchDeleteFarms(farmIds: string[]): Promise<{ deleted: number; failed: number; errors?: Array<{ name: string; error: string }> }> {
    return apiClient.post<{ deleted: number; failed: number; errors?: Array<{ name: string; error: string }> }>('/api/v1/farms/batch-delete', {
      farm_ids: farmIds,
    });
  }

  async exportFarm(data: {
    farm_id?: string;
    organization_id?: string;
    include_sub_farms?: boolean;
  }): Promise<{ success: boolean; data?: unknown; error?: string }> {
    return apiClient.post<{ success: boolean; data?: unknown; error?: string }>('/api/v1/farms/export', data);
  }
}

export const farmsService = new FarmsService();
