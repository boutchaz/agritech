import { apiClient } from '../api-client';

export interface HierarchyFarm {
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
}

export interface UserFarmRole {
  farm_id: string;
  farm_name: string;
  role: string;
  permissions: Record<string, boolean>;
  assigned_at: string;
  is_active: boolean;
}

export const farmHierarchyApi = {
  async getOrganizationFarms(organizationId: string): Promise<HierarchyFarm[]> {
    const response = await apiClient.get<any>('/api/v1/farms', {}, organizationId);
    const farms = Array.isArray(response) ? response : response?.data || [];

    return farms.map((farm: Record<string, unknown>) => ({
      farm_id: farm.farm_id ? (farm.farm_id as string) : (farm.id as string),
      farm_name: (farm.farm_name as string) || (farm.name as string) || '',
      farm_location: (farm.farm_location as string) || (farm.location as string) || '',
      farm_size: (farm.farm_size as number) || (farm.size as number) || 0,
      farm_type: (farm.farm_type as 'main' | 'sub') || 'main',
      parent_farm_id: (farm.parent_farm_id as string) || null,
      hierarchy_level: (farm.hierarchy_level as number) || 1,
      manager_name: (farm.manager_name as string) || 'No Manager',
      sub_farms_count: (farm.sub_farms_count as number) || 0,
      is_active: farm.is_active === undefined ? true : Boolean(farm.is_active),
    }));
  },

  async getUserFarmRoles(userId: string, organizationId: string): Promise<UserFarmRole[]> {
    return apiClient.get<UserFarmRole[]>(
      `/api/v1/farms/user-roles/${userId}`,
      {},
      organizationId,
    );
  },

  async getBasicUserRoles(
    organizationId: string,
    userId: string,
    farms: HierarchyFarm[]
  ): Promise<UserFarmRole[]> {
    try {
      const orgUser = await apiClient.get<any>(
        `/api/v1/organization-users/${userId}`,
        {},
        organizationId,
      );

      const roleName = orgUser?.roles?.name || orgUser?.role?.name || orgUser?.role;
      const isAdmin = roleName === 'admin' || roleName === 'organization_admin';
      const isManager = roleName === 'manager' || roleName === 'farm_manager';
      const isBasicUser = roleName === 'member' || roleName === 'viewer';

      return farms.map(farm => ({
        farm_id: farm.farm_id,
        farm_name: farm.farm_name,
        role: isAdmin ? 'main_manager' : isManager ? 'sub_manager' : 'supervisor',
        permissions: {
          manage_farms: isAdmin,
          manage_sub_farms: !isBasicUser,
          manage_users: isAdmin,
          view_reports: true,
          manage_crops: true,
          manage_parcels: !isBasicUser,
          manage_inventory: !isBasicUser,
          manage_activities: true,
        },
        assigned_at: new Date().toISOString(),
        is_active: true,
      }));
    } catch (error) {
      console.error('Error fetching organization role:', error);
      return [];
    }
  },
};
