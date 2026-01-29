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
      return addonsApi.getOverview(orgId);
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useActiveAddons() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['active-addons', orgId],
    queryFn: async (): Promise<OrganizationAddon[]> => {
      if (!orgId) return [];
      return addonsApi.getActiveAddons(orgId);
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAvailableAddons() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['available-addons', orgId],
    queryFn: async (): Promise<AddonModule[]> => {
      if (!orgId) return [];
      return addonsApi.getAvailableAddons(orgId);
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAddonSlots() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id;

  return useQuery({
    queryKey: ['addon-slots', orgId],
    queryFn: async (): Promise<AddonSlots | null> => {
      if (!orgId) return null;
      return addonsApi.getSlots(orgId);
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
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
