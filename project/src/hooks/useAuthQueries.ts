import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
  is_active: boolean;
}

interface Farm {
  id: string;
  name: string;
  location: string;
  size: number;
  manager_name: string;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  phone?: string;
  timezone: string;
  language: string;
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

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// User organizations query
export const useUserOrganizations = (userId: string | undefined) => {
  return useQuery({
    queryKey: authKeys.organizations(userId || ''),
    queryFn: async (): Promise<Organization[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .rpc('get_user_organizations', { user_uuid: userId });

      if (error) {
        throw error;
      }

      return data?.map((org: any) => ({
        id: org.organization_id,
        name: org.organization_name,
        slug: org.organization_slug,
        role: org.user_role,
        is_active: org.is_active
      })) || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Organization farms query
export const useOrganizationFarms = (organizationId: string | undefined) => {
  return useQuery({
    queryKey: authKeys.farms(organizationId || ''),
    queryFn: async (): Promise<Farm[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
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
      const { error } = await supabase.auth.signOut();
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
    mutationFn: async (userId: string) => {
      // Invalidate all auth queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
};