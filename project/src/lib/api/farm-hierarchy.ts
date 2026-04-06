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

/** Raw farm shape from API before normalization (fields vary by endpoint version) */
interface RawFarmApiResponse {
  id?: string;
  farm_id?: string;
  name?: string;
  farm_name?: string;
  location?: string;
  farm_location?: string;
  size?: number;
  farm_size?: number;
  farm_type?: 'main' | 'sub';
  parent_farm_id?: string | null;
  hierarchy_level?: number;
  manager_name?: string;
  sub_farms_count?: number;
  is_active?: boolean;
  data?: RawFarmApiResponse[];
  farms?: RawFarmApiResponse[];
}

/** Raw organization user response with nested role info */
interface RawOrgUserResponse {
  roles?: { name?: string } | null;
  role?: { name?: string } | string | null;
}

export const farmHierarchyApi = {
  async getOrganizationFarms(organizationId: string): Promise<HierarchyFarm[]> {
    const response = await apiClient.get<RawFarmApiResponse | RawFarmApiResponse[]>('/api/v1/farms', {}, organizationId);
    const rawFarms: RawFarmApiResponse[] = Array.isArray(response)
      ? response
      : response?.data || response?.farms || [];

    return rawFarms.map((farm) => ({
      farm_id: farm.farm_id ?? farm.id ?? '',
      farm_name: farm.farm_name ?? farm.name ?? '',
      farm_location: farm.farm_location ?? farm.location ?? '',
      farm_size: farm.farm_size ?? farm.size ?? 0,
      farm_type: farm.farm_type ?? 'main',
      parent_farm_id: farm.parent_farm_id ?? null,
      hierarchy_level: farm.hierarchy_level ?? 1,
      manager_name: farm.manager_name ?? 'No Manager',
      sub_farms_count: farm.sub_farms_count ?? 0,
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
      const orgUser = await apiClient.get<RawOrgUserResponse>(
        `/api/v1/organization-users/${userId}`,
        {},
        organizationId,
      );

      const roleName = orgUser?.roles?.name
        ?? (orgUser?.role && typeof orgUser.role === 'object' ? orgUser.role.name : undefined)
        ?? (typeof orgUser?.role === 'string' ? orgUser.role : undefined);
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
