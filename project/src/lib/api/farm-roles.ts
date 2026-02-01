import { apiClient } from '../api-client';

export interface FarmRole {
  id: string;
  farm_id: string;
  user_id: string;
  role: 'main_manager' | 'sub_manager' | 'supervisor' | 'coordinator';
  permissions: Record<string, boolean>;
  assigned_by: string;
  assigned_at: string;
  is_active: boolean;
  user_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface FarmPermission {
  role: string;
  permissions: Record<string, boolean>;
  description: string;
}

export interface OrganizationUser {
  user_id: string;
  role_id: string;
  user_profile?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface AssignFarmRoleInput {
  farm_id: string;
  user_id: string;
  role: string;
  permissions?: Record<string, boolean>;
}

export const farmRolesApi = {
  async getRolesForFarm(farmId: string, organizationId?: string): Promise<FarmRole[]> {
    return apiClient.get<FarmRole[]>(`/api/v1/farms/${farmId}/roles`, {}, organizationId);
  },

  async getAvailableRoles(): Promise<FarmPermission[]> {
    return apiClient.get<FarmPermission[]>('/api/v1/farms/roles/available');
  },

  async getOrganizationUsersForFarm(farmId: string, organizationId?: string): Promise<OrganizationUser[]> {
    return apiClient.get<OrganizationUser[]>(
      `/api/v1/farms/${farmId}/organization-users`,
      {},
      organizationId,
    );
  },

  async assignRole(input: AssignFarmRoleInput, organizationId?: string): Promise<void> {
    await apiClient.post(
      `/api/v1/farms/${input.farm_id}/roles`,
      {
        user_id: input.user_id,
        role: input.role,
        permissions: input.permissions || {},
      },
      {},
      organizationId,
    );
  },

  async removeRole(roleId: string, farmId: string, organizationId?: string): Promise<void> {
    await apiClient.delete(
      `/api/v1/farms/${farmId}/roles/${roleId}`,
      {},
      organizationId,
    );
  },
};
