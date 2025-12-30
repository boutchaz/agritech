import { supabase } from '../supabase';

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
  async getRolesForFarm(farmId: string): Promise<FarmRole[]> {
    const { data, error } = await supabase
      .from('farm_management_roles')
      .select('*')
      .eq('farm_id', farmId)
      .eq('is_active', true);

    if (error) throw error;

    const userIds = data?.map(r => r.user_id).filter(Boolean) || [];
    if (userIds.length === 0) {
      return [];
    }

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email')
      .in('id', userIds);

    return (data || []).map(role => ({
      ...role,
      user_profile: profiles?.find(p => p.id === role.user_id),
    }));
  },

  async getAvailableRoles(): Promise<FarmPermission[]> {
    const { data, error } = await supabase
      .from('farm_permissions')
      .select('*')
      .order('role');

    if (error) throw error;
    return data || [];
  },

  async getOrganizationUsersForFarm(farmId: string): Promise<OrganizationUser[]> {
    const { data: farmData } = await supabase
      .from('farms')
      .select('organization_id')
      .eq('id', farmId)
      .single();

    if (!farmData) return [];

    const { data, error } = await supabase
      .from('organization_users')
      .select('user_id, role_id')
      .eq('organization_id', farmData.organization_id)
      .eq('is_active', true);

    if (error) throw error;

    const userIds = data?.map(u => u.user_id).filter(Boolean) || [];
    if (userIds.length === 0) {
      return [];
    }

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email')
      .in('id', userIds);

    return (data || []).map(user => ({
      ...user,
      user_profile: profiles?.find(p => p.id === user.user_id),
    }));
  },

  async assignRole(input: AssignFarmRoleInput): Promise<void> {
    const { error } = await supabase.rpc('assign_farm_role', {
      farm_id_param: input.farm_id,
      user_id_param: input.user_id,
      role_param: input.role,
      permissions_param: input.permissions || {},
    });

    if (error && error.code === 'PGRST202') {
      await this.assignRoleBasic(input);
      return;
    }

    if (error) throw error;
  },

  async assignRoleBasic(input: AssignFarmRoleInput): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error: insertError } = await supabase
      .from('farm_management_roles')
      .insert({
        farm_id: input.farm_id,
        user_id: input.user_id,
        role: input.role,
        permissions: input.permissions || {},
        assigned_by: user?.id,
        is_active: true,
      });

    if (insertError) throw insertError;
  },

  async removeRole(roleId: string): Promise<void> {
    const { error } = await supabase
      .from('farm_management_roles')
      .update({ is_active: false })
      .eq('id', roleId);

    if (error) throw error;
  },
};
