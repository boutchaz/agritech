import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { deliveriesApi } from '@/lib/api/deliveries';
import type { DeliveryFilters } from '@/types/harvests';
import type { CreateDeliveryRequest } from '@/types/harvests';

export function useDeliveries(filters?: DeliveryFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['deliveries', currentOrganization?.id, filters],
    queryFn: () => deliveriesApi.getAll(filters, currentOrganization?.id),
    enabled: !!currentOrganization?.id,
    staleTime: 60000,
  });
}

export function useDelivery(deliveryId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['delivery', deliveryId],
    queryFn: () => deliveriesApi.getOne(deliveryId!, currentOrganization?.id),
    enabled: !!deliveryId && !!currentOrganization?.id,
    staleTime: 60000,
  });
}

export function useDeliveryItems(deliveryId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['delivery-items', deliveryId],
    queryFn: () => deliveriesApi.getItems(deliveryId!, currentOrganization?.id),
    enabled: !!deliveryId && !!currentOrganization?.id,
    staleTime: 60000,
  });
}

export function useCreateDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDeliveryRequest) => {
      return deliveriesApi.create(data, undefined);
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
