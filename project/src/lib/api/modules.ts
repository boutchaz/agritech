import { apiClient } from '../api-client';

export interface ModuleMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface OrganizationModule {
  id: string;
  name: string;
  icon: string;
  category: 'agriculture' | 'elevage' | 'general';
  description: string;
  required_plan: 'essential' | 'professional' | 'enterprise' | null;
  is_active: boolean;
  settings: Record<string, any>;
}

export interface UpdateModuleInput {
  is_active?: boolean;
  settings?: Record<string, any>;
}

const getBaseUrl = (organizationId: string) =>
  `/api/v1/organizations/${organizationId}/modules`;

export const modulesApi = {
  /**
   * Get all modules for an organization
   */
  async getAll(organizationId: string): Promise<OrganizationModule[]> {
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
    );
  },
};
