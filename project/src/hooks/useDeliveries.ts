import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { deliveriesApi } from '@/lib/api/deliveries';
import type { DeliveryFilters, CreateDeliveryRequest } from '@/types/harvests';

export function useDeliveries(filters?: DeliveryFilters) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['deliveries', organizationId, filters],
    queryFn: () => {
      if (!organizationId) throw new Error('No organization selected');
      return deliveriesApi.getAll(filters, organizationId);
    },
    enabled: !!organizationId,
    staleTime: 60000,
  });
}

export function useDelivery(deliveryId: string | null) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['delivery', organizationId, deliveryId],
    queryFn: () => {
      if (!organizationId || !deliveryId) throw new Error('Missing organizationId or deliveryId');
      return deliveriesApi.getOne(deliveryId, organizationId);
    },
    enabled: !!deliveryId && !!organizationId,
    staleTime: 60000,
  });
}

export function useDeliveryItems(deliveryId: string | null) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['delivery-items', organizationId, deliveryId],
    queryFn: () => {
      if (!organizationId || !deliveryId) throw new Error('Missing organizationId or deliveryId');
      return deliveriesApi.getItems(deliveryId, organizationId);
    },
    enabled: !!deliveryId && !!organizationId,
    staleTime: 60000,
  });
}

export function useCreateDelivery() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (data: CreateDeliveryRequest) => {
      const orgId = currentOrganization?.id;
      if (!orgId) throw new Error('No organization selected');
      return deliveriesApi.create(data, orgId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: ({ deliveryId, data }: { deliveryId: string; data: Parameters<typeof deliveriesApi.updateStatus>[2] }) => {
      const orgId = currentOrganization?.id;
      if (!orgId) throw new Error('No organization selected');
      return deliveriesApi.updateStatus(orgId, deliveryId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });
}

export function useCancelDelivery() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: ({ deliveryId, reason }: { deliveryId: string; reason?: string }) => {
      const orgId = currentOrganization?.id;
      if (!orgId) throw new Error('No organization selected');
      return deliveriesApi.cancel(orgId, deliveryId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    },
  });
}
