import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  addonsApi,
  type AddonsOverview,
  type OrganizationAddon,
  type AddonModule,
  type AddonSlots,
  type PurchaseAddonInput,
  type CancelAddonInput,
} from '../lib/api/addons';

export function useAddonsOverview() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['addons-overview', orgId],
    queryFn: async (): Promise<AddonsOverview | null> => {
      if (!orgId) return null;
      try {
        return await addonsApi.getOverview(orgId);
      } catch (error: unknown) {
        // Gracefully handle 404 or other errors when addons endpoint doesn't exist yet
        const status = (error as { status?: number; response?: { status?: number } })?.status
          || (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          console.warn('Addons endpoint not available (404) - returning empty data');
          return {
            slots: { included: 0, additional: 0, total: 0, used: 0, available: 0 },
            active_addons: [],
            available_addons: [],
          };
        }
        // For other errors, also return empty data to avoid breaking the app
        const message = (error as { message?: string })?.message || 'Unknown error';
        console.warn('Failed to fetch addons overview:', message);
        return null;
      }
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
    retry: false, // Don't retry on 404 to avoid console spam
  });
}

export function useActiveAddons() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['active-addons', orgId],
    queryFn: async (): Promise<OrganizationAddon[]> => {
      if (!orgId) return [];
      try {
        return await addonsApi.getActiveAddons(orgId);
      } catch (error: unknown) {
        const status = (error as { status?: number; response?: { status?: number } })?.status
          || (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          console.warn('Active addons endpoint not available (404) - returning empty data');
          return [];
        }
        const message = (error as { message?: string })?.message || 'Unknown error';
        console.warn('Failed to fetch active addons:', message);
        return [];
      }
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

export function useAvailableAddons() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['available-addons', orgId],
    queryFn: async (): Promise<AddonModule[]> => {
      if (!orgId) return [];
      try {
        return await addonsApi.getAvailableAddons(orgId);
      } catch (error: unknown) {
        const status = (error as { status?: number; response?: { status?: number } })?.status
          || (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          console.warn('Available addons endpoint not available (404) - returning empty data');
          return [];
        }
        const message = (error as { message?: string })?.message || 'Unknown error';
        console.warn('Failed to fetch available addons:', message);
        return [];
      }
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

export function useAddonSlots() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['addon-slots', orgId],
    queryFn: async (): Promise<AddonSlots | null> => {
      if (!orgId) return null;
      try {
        return await addonsApi.getSlots(orgId);
      } catch (error: unknown) {
        const status = (error as { status?: number; response?: { status?: number } })?.status
          || (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          console.warn('Addon slots endpoint not available (404) - returning empty data');
          return { included: 0, additional: 0, total: 0, used: 0, available: 0 };
        }
        const message = (error as { message?: string })?.message || 'Unknown error';
        console.warn('Failed to fetch addon slots:', message);
        return null;
      }
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
}

export function usePurchaseAddon() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  return useMutation({
    mutationFn: async (data: PurchaseAddonInput) => {
      if (!orgId) throw new Error('No organization selected');
      return addonsApi.purchase(orgId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons-overview', orgId] });
      queryClient.invalidateQueries({ queryKey: ['active-addons', orgId] });
      queryClient.invalidateQueries({ queryKey: ['available-addons', orgId] });
      queryClient.invalidateQueries({ queryKey: ['addon-slots', orgId] });
      queryClient.invalidateQueries({ queryKey: ['modules', orgId] });
    },
  });
}

export function useCancelAddon() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  return useMutation({
    mutationFn: async (data: CancelAddonInput) => {
      if (!orgId) throw new Error('No organization selected');
      return addonsApi.cancel(orgId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addons-overview', orgId] });
      queryClient.invalidateQueries({ queryKey: ['active-addons', orgId] });
      queryClient.invalidateQueries({ queryKey: ['available-addons', orgId] });
      queryClient.invalidateQueries({ queryKey: ['addon-slots', orgId] });
      queryClient.invalidateQueries({ queryKey: ['modules', orgId] });
    },
  });
}
