import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authSupabase } from '../lib/auth-supabase';
import type { UserProfile, Farm, Organization } from '../lib/supabase';

// Extended organization type with role info from join
interface OrganizationWithRole extends Organization {
  role: string;
  is_active: boolean;
}

// Query keys
export const authKeys = {
  profile: (userId: string) => ['auth', 'profile', userId] as const,
  organizations: (userId: string) => ['auth', 'organizations', userId] as const,
  farms: (organizationId: string) => ['auth', 'farms', organizationId] as const,
};

// User profile query
export const useUserProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: authKeys.profile(userId || ''),
    queryFn: async (): Promise<UserProfile | null> => {
      if (!userId) return null;

      // Try using RPC function first (more reliable with permissions)
      try {
        const { data: rpcData, error: rpcError } = await authSupabase
          .rpc('get_current_user_profile');

        if (!rpcError && rpcData) {
          return rpcData as UserProfile;
        }
      } catch (_e) {
        console.log('RPC function not available, falling back to direct query');
      }

      // Fallback to direct query
      const { data, error } = await authSupabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
        // Don't throw, return null to trigger onboarding
        return null;
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Reduce retries for 403 errors
  });
};

// User organizations query - fetch from database with JOIN to get currency
export const useUserOrganizations = (userId: string | undefined) => {
  return useQuery({
    queryKey: authKeys.organizations(userId || ''),
    queryFn: async (): Promise<OrganizationWithRole[]> => {
      if (!userId) return [];

      // First, get organization IDs and roles from organization_users
      const { data: orgUsers, error: orgUsersError } = await authSupabase
        .from('organization_users')
        .select('organization_id, role, is_active')
        .eq('user_id', userId)
        .eq('is_active', true);

      console.log('🔍 organization_users query result:', { orgUsers, orgUsersError });

      if (orgUsersError) {
        console.error('❌ Organization users fetch error:', orgUsersError);
        return [];
      }

      if (!orgUsers || orgUsers.length === 0) {
        console.log('⚠️ No organization_users found for user');
        return [];
      }

      // Then fetch organization details for each org
      const orgIds = orgUsers.map(ou => ou.organization_id).filter(Boolean) as string[];
      const { data: orgs, error: orgsError } = await authSupabase
        .from('organizations')
        .select('id, name, slug, onboarding_completed, currency, timezone, language')
        .in('id', orgIds);

      console.log('🔍 organizations query result:', { orgs, orgsError, orgIds });

      if (orgsError) {
        console.error('❌ Organizations fetch error:', orgsError);
        return [];
      }

      // Combine the data
      return orgUsers.map(ou => {
        const org = orgs?.find(o => o.id === ou.organization_id);
        return {
          id: ou.organization_id,
          name: org?.name || 'Unknown',
          slug: org?.slug || org?.name || 'unknown',
          role: ou.role,
          is_active: ou.is_active,
          onboarding_completed: org?.onboarding_completed,
          currency: org?.currency,
          timezone: org?.timezone,
          language: org?.language,
        };
      });
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Reduce retries for 403 errors
  });
};

// Organization farms query
export const useOrganizationFarms = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: authKeys.farms(organizationId || ''),
    queryFn: async (): Promise<Farm[]> => {
      if (!organizationId) return [];

      const { data, error } = await authSupabase
        .rpc('get_organization_farms', { org_uuid: organizationId });

      if (error) {
        throw error;
      }

      return data?.map((farm: any) => ({
        id: farm.farm_id,
        name: farm.farm_name,
        location: farm.farm_location,
        size: farm.farm_size,
        manager_name: farm.manager_name
      })) || [];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Sign out mutation
export const useSignOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await authSupabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      // Clear all auth-related queries
      queryClient.removeQueries({ queryKey: ['auth'] });
      // Clear localStorage
      localStorage.removeItem('currentOrganization');
      localStorage.removeItem('currentFarm');
    },
  });
};

// Refresh user data mutation
export const useRefreshUserData = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Invalidate all auth queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
};