import { apiClient } from '../api-client';

export interface ModuleMetric {
  name: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface UpdateModuleInput {
  is_active?: boolean;
  settings?: Record<string, unknown>;
}

const getBaseUrl = (organizationId: string) =>
  `/api/v1/organizations/${organizationId}/modules`;

export const modulesApi = {
  /**
   * Update module activation status or settings.
   * Listing is handled by useModuleConfig (org-scoped catalog with isActive).
   */
  async update(
    organizationId: string,
    moduleId: string,
    data: UpdateModuleInput,
  ): Promise<unknown> {
    return apiClient.patch<unknown>(
      `${getBaseUrl(organizationId)}/${moduleId}`,
      data,
      {},
      organizationId,
    );
  },
};
