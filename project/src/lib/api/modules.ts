import { apiClient } from '../api-client';
import { requireOrganizationId } from './createCrudApi';

export interface ModuleMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface OrganizationModule {
  id: string;
  slug: string;
  name: string;
  icon: string;
  category: 'core' | 'production' | 'operations' | 'hr' | 'inventory' | 'sales' | 'purchasing' | 'accounting' | 'analytics' | 'agriculture' | 'elevage';
  description: string;
  required_plan: 'essential' | 'professional' | 'enterprise' | null;
  is_required: boolean;
  is_active: boolean;
  settings: Record<string, unknown>;
}

export interface UpdateModuleInput {
  is_active?: boolean;
  settings?: Record<string, unknown>;
}

const getBaseUrl = (organizationId: string) =>
  `/api/v1/organizations/${organizationId}/modules`;

export const modulesApi = {
  /**
   * Get all modules for an organization
   */
  async getAll(_filters?: undefined, organizationId?: string): Promise<OrganizationModule[]> {
    requireOrganizationId(organizationId, 'modulesApi.getAll');
    return apiClient.get<OrganizationModule[]>(getBaseUrl(organizationId));
  },

  /**
   * Update module activation status or settings
   */
  async update(
    organizationId: string,
    moduleId: string,
    data: UpdateModuleInput,
  ): Promise<OrganizationModule> {
    return apiClient.patch<OrganizationModule>(
      `${getBaseUrl(organizationId)}/${moduleId}`,
      data,
      {},
      organizationId,
    );
  },
};
