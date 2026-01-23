import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authSupabase } from '../lib/auth-supabase';
import { usersApi, type OrganizationWithRole } from '../lib/api/users';
import { farmsApi } from '../lib/api/farms';
import { parcelsApi } from '../lib/api/parcels';
import type { UserProfile, Farm } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useOrganizationStore } from '../stores/organizationStore';
import { trackLogout } from '../lib/analytics';

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
        // Use NestJS API instead of direct Supabase query
        const data = await usersApi.getMe();
        return data;
      } catch (error) {
        // Check for session expired error (401)
        if (error instanceof Error && (
          error.message?.includes('Session expired') ||
          error.message?.includes('No active session') ||
          error.message?.includes('Authentication failed')
        )) {
          // Clear auth state - the API client should handle redirect
          console.warn('⚠️ Session expired while fetching profile');
          useAuthStore.getState().clearAuth();
          // Return null to stop retries
          return null;
        }
        // Re-throw network errors to trigger retry
        if (error instanceof Error && (
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('NetworkError') ||
          error.message?.includes('Network request failed')
        )) {
          console.warn('⚠️ Network error fetching profile, will retry:', error);
          throw error;
        }
        // For other errors (404, 403), return null
        console.error('Profile fetch error:', error);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if session expired
      if (error instanceof Error && (
        error.message?.includes('Session expired') ||
        error.message?.includes('No active session') ||
        error.message?.includes('Authentication failed')
      )) {
        return false;
      }
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

// User organizations query - fetch from NestJS API
export const useUserOrganizations = (userId: string | undefined) => {
  return useQuery({
    queryKey: authKeys.organizations(userId || ''),
    queryFn: async (): Promise<OrganizationWithRole[]> => {
      if (!userId) return [];

      try {
        // Use NestJS API instead of direct Supabase call
        const data = await usersApi.getMyOrganizations();
        console.log('🔍 User organizations from API:', { data });
        return data || [];
      } catch (error) {
        // Check for session expired error (401)
        if (error instanceof Error && (
          error.message?.includes('Session expired') ||
          error.message?.includes('No active session') ||
          error.message?.includes('Authentication failed')
        )) {
          // Clear auth state - the API client should handle redirect
          console.warn('⚠️ Session expired while fetching organizations');
          useAuthStore.getState().clearAuth();
          // Return empty array to stop retries
          return [];
        }
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
      // Don't retry if session expired
      if (error instanceof Error && (
        error.message?.includes('Session expired') ||
        error.message?.includes('No active session') ||
        error.message?.includes('Authentication failed')
      )) {
        return false;
      }
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

      try {
        // Use NestJS API instead of direct Supabase call
        const data = await farmsApi.getAll({ organization_id: organizationId }, organizationId);
        // API returns { success: true, farms: [...], total: ... }
        if (data && typeof data === 'object' && 'farms' in data && Array.isArray((data as { farms: any[] }).farms)) {
          const farmsData = (data as { farms: any[] }).farms;

          // Fetch all parcels for this organization to calculate total_area per farm
          let parcelsByFarm: Record<string, { totalArea: number }> = {};
          try {
            const parcelsData = await parcelsApi.getAll({ organization_id: organizationId }, organizationId);
            if (Array.isArray(parcelsData)) {
              parcelsByFarm = parcelsData.reduce((acc: Record<string, { totalArea: number }>, parcel: any) => {
                const farmId = parcel.farm_id;
                if (!farmId) return acc;
                if (!acc[farmId]) {
                  acc[farmId] = { totalArea: 0 };
                }
                // Use calculated_area if available, otherwise fall back to area
                const parcelArea = parcel.calculated_area ?? parcel.area ?? 0;
                acc[farmId].totalArea += parcelArea;
                return acc;
              }, {});
            }
          } catch (error) {
            console.warn('Could not fetch parcels for farm area calculation:', error);
          }

          // Map farm_id and farm_name to id and name for compatibility
          return farmsData.map((farm: any) => {
            const farmId = farm.farm_id || farm.id;
            const parcelsData = parcelsByFarm[farmId];
            const farmSize = farm.farm_size ?? farm.size;

            // If farm size is not set or 0, use the calculated area from parcels
            const totalArea = (!farmSize || farmSize === 0) && parcelsData
              ? parseFloat(parcelsData.totalArea.toFixed(2))
              : farmSize;

            return {
              id: farmId,
              name: farm.farm_name || farm.name,
              location: farm.farm_location || farm.location,
              size: farmSize,
              size_unit: farm.size_unit,
              manager_name: farm.manager_name,
              organization_id: organizationId,
              created_at: farm.created_at,
              updated_at: farm.updated_at,
              total_area: totalArea, // Add calculated or provided area
            } as Farm & { total_area?: number };
          });
        }
        // Fallback for direct array response
        return Array.isArray(data) ? data : [];
      } catch (error) {
        // Check for session expired error (401)
        if (error instanceof Error && (
          error.message?.includes('Session expired') ||
          error.message?.includes('No active session') ||
          error.message?.includes('Authentication failed')
        )) {
          // Clear auth state - the API client should handle redirect
          console.warn('⚠️ Session expired while fetching farms');
          useAuthStore.getState().clearAuth();
          return [];
        }
        console.error('Error fetching farms:', error);
        return [];
      }
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes,
    retry: (failureCount, error) => {
      // Don't retry if session expired
      if (error instanceof Error && (
        error.message?.includes('Session expired') ||
        error.message?.includes('No active session') ||
        error.message?.includes('Authentication failed')
      )) {
        return false;
      }
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

// Sign out mutation
export const useSignOut = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Track logout before clearing auth
      trackLogout();

      // Clear auth store (tokens and user)
      useAuthStore.getState().clearAuth();
      // Clear organization store
      useOrganizationStore.getState().clearOrganization();
      // Also clear from Supabase for backward compatibility during migration
      const { error } = await authSupabase.auth.signOut();
      if (error) console.error('Supabase sign out error:', error);
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
