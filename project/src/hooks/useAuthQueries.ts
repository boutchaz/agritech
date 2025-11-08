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

      try {
        // Direct query to user_profiles table
        const { data, error } = await authSupabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          // Distinguish between network errors and "no profile" errors
          const isNetworkError = error.message?.includes('Failed to fetch') || 
                                 error.message?.includes('NetworkError') ||
                                 error.code === 'PGRST301'; // Connection timeout
          
          if (error.code === 'PGRST116') {
            // No profile found - this is expected for new users, not an error
            return null;
          }
          
          if (isNetworkError) {
            console.warn('⚠️ Network error fetching profile, will retry:', error);
            throw error; // Re-throw to trigger retry
          }
          
          console.error('Profile fetch error:', error);
          // Don't throw, return null to trigger onboarding
          return null;
        }

        return data;
      } catch (error) {
        // Re-throw network errors to trigger retry
        if (error instanceof Error && (
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('Network request failed')
        )) {
          throw error;
        }
        // For other errors, return null
        console.error('Profile fetch error:', error);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors
      if (failureCount < 3 && error instanceof Error && (
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('Network request failed')
      )) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff
  });
};

// User organizations query - fetch from database with JOIN to get currency
export const useUserOrganizations = (userId: string | undefined) => {
  return useQuery({
    queryKey: authKeys.organizations(userId || ''),
    queryFn: async (): Promise<OrganizationWithRole[]> => {
      if (!userId) return [];

      try {
        // Use a JOIN query to get organization details with user role in one go
        const { data: orgUsers, error: orgUsersError } = await authSupabase
          .from('organization_users')
          .select(`
            organization_id,
            role_id,
            is_active,
            role:roles!organization_users_role_id_fkey (
              id,
              name,
              display_name,
              level
            ),
            organizations:organization_id (
              id,
              name,
              slug,
              description,
              address,
              city,
              state,
              postal_code,
              country,
              phone,
              email,
              website,
              tax_id,
              currency_code,
              timezone,
              logo_url,
              is_active
            )
          `)
          .eq('user_id', userId)
          .eq('is_active', true);

        console.log('🔍 organization_users with organizations JOIN result:', { orgUsers, orgUsersError });

        if (orgUsersError) {
          // Distinguish between network errors and "no organizations" errors
          const isNetworkError = orgUsersError.message?.includes('Failed to fetch') ||
                                 orgUsersError.message?.includes('NetworkError') ||
                                 orgUsersError.code === 'PGRST301'; // Connection timeout

          if (isNetworkError) {
            console.warn('⚠️ Network error fetching organization users, will retry:', orgUsersError);
            throw orgUsersError; // Re-throw to trigger retry
          }

          console.error('❌ Organization users fetch error:', orgUsersError);
          return [];
        }

        if (!orgUsers || orgUsers.length === 0) {
          console.log('⚠️ No organization_users found for user');
          return [];
        }

        // Map the joined data to the expected format
        return orgUsers.map((ou: any) => {
          const org = ou.organizations;
          const roleData = ou.role;

          return {
            id: ou.organization_id,
            name: org?.name || 'Unknown',
            slug: org?.slug || org?.name || 'unknown',
            description: org?.description || null,
            address: org?.address || null,
            city: org?.city || null,
            state: org?.state || null,
            postal_code: org?.postal_code || null,
            country: org?.country || null,
            phone: org?.phone || null,
            email: org?.email || null,
            website: org?.website || null,
            tax_id: org?.tax_id || null,
            logo_url: org?.logo_url || null,
            role: roleData?.name || 'viewer', // Use role name from joined roles table
            role_display_name: roleData?.display_name || 'Viewer',
            role_level: roleData?.level || 6,
            is_active: org?.is_active ?? ou.is_active,
            currency_code: org?.currency_code || 'MAD',
            timezone: org?.timezone || 'Africa/Casablanca',
          } as any; // Type will be fixed in Organization interface
        });
      } catch (error) {
        // Re-throw network errors to trigger retry
        if (error instanceof Error && (
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('Network request failed')
        )) {
          throw error;
        }
        // For other errors, return empty array
        console.error('❌ Error fetching organizations:', error);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Retry up to 3 times for network errors
      if (failureCount < 3 && error instanceof Error && (
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('Network request failed')
      )) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000), // Exponential backoff
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
    mutationFn: async (userId?: string) => {
      // Invalidate and refetch all auth queries to trigger refetch
      // This ensures we wait for the refetch to complete
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
      
      // Also refetch queries to ensure they complete
      if (userId) {
        await Promise.all([
          queryClient.refetchQueries({ queryKey: authKeys.profile(userId) }),
          queryClient.refetchQueries({ queryKey: authKeys.organizations(userId) }),
        ]);
      } else {
        // Refetch all auth queries
        await queryClient.refetchQueries({ queryKey: ['auth'] });
      }
    },
  });
};
