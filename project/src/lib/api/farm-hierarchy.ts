import { supabase } from '../supabase';

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
    const { data, error } = await supabase.rpc('get_organization_farms', {
      org_uuid: organizationId,
    });

    if (error) throw error;

    return (data || []).map((farm: Record<string, unknown>) => ({
      farm_id: farm.farm_id as string,
      farm_name: farm.farm_name as string,
      farm_location: farm.farm_location as string,
      farm_size: (farm.farm_size as number) || 0,
      farm_type: (farm.farm_type as 'main' | 'sub') || 'main',
      parent_farm_id: (farm.parent_farm_id as string) || null,
      hierarchy_level: (farm.hierarchy_level as number) || 1,
      manager_name: (farm.manager_name as string) || 'No Manager',
      sub_farms_count: (farm.sub_farms_count as number) || 0,
      is_active: true,
    }));
  },

  async getUserFarmRoles(userId: string): Promise<UserFarmRole[]> {
    const { data, error } = await supabase.rpc('get_user_farm_roles', {
      user_uuid: userId,
    });

    if (error && error.code === 'PGRST202') {
      return [];
    }

    if (error) throw error;
    return data || [];
  },

  async getBasicUserRoles(
    organizationId: string,
    userId: string,
    farms: HierarchyFarm[]
  ): Promise<UserFarmRole[]> {
    const { data: orgUser, error: orgError } = await supabase
      .from('organization_users')
      .select('role_id, role:roles!organization_users_role_id_fkey(name)')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (orgError) {
      console.error('Error fetching organization role:', orgError);
      return [];
    }

    const roleName = (orgUser.role as { name?: string } | null)?.name;
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
  },
};
