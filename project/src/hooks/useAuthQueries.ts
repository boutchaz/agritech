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

      // Direct query to user_profiles table
      const { data, error } = await authSupabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
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
      // organizations table has: id, name, slug, description, address, city, state, postal_code,
      // country, phone, email, website, tax_id, currency_code, timezone, logo_url, is_active
      const orgIds = orgUsers.map(ou => ou.organization_id).filter(Boolean) as string[];
      const selectColumns = 'id, name, slug, currency_code, timezone, is_active';
      const fallbackColumns = 'id, name, slug, is_active';

      const { data: orgs, error: orgsError } = await authSupabase
        .from('organizations')
        .select(selectColumns)
        .in('id', orgIds);

      console.log('🔍 organizations query result:', { orgs, orgsError, orgIds });

      let resolvedOrganizations = orgs;

      if (orgsError) {
        const missingColumn = orgsError.code === '42703';

        if (missingColumn) {
          console.warn('⚠️ Organizations query missing expected columns, retrying with fallback set.', orgsError);
          const { data: fallbackOrgs, error: fallbackError } = await authSupabase
            .from('organizations')
            .select(fallbackColumns)
            .in('id', orgIds);

          if (fallbackError) {
            console.error('❌ Organizations fallback fetch error:', fallbackError);
            return [];
          }

          resolvedOrganizations = fallbackOrgs;
        } else {
          console.error('❌ Organizations fetch error:', orgsError);
          return [];
        }
      }

      // Combine the data
      return orgUsers.map(ou => {
        const org = resolvedOrganizations?.find(o => o.id === ou.organization_id) as {
          id: string;
          name?: string | null;
          slug?: string | null;
          currency_code?: string | null;
          timezone?: string | null;
          is_active?: boolean | null;
        } | undefined;

        return {
          id: ou.organization_id,
          name: org?.name || 'Unknown',
          slug: org?.slug || org?.name || 'unknown',
          role: ou.role,
          is_active: org?.is_active ?? ou.is_active,
          currency_code: org?.currency_code || 'MAD',
          timezone: org?.timezone || 'Africa/Casablanca',
        } as any; // Type will be fixed in Organization interface
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

      // Direct query instead of RPC function
      const { data, error } = await authSupabase
        .from('farms')
        .select('id, name, location, size, size_unit, manager_name')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) {
        throw error;
      }

      return data || [];
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
