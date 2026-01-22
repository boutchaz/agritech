import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { harvestsApi, type PaginatedHarvestQuery } from '../lib/api/harvests';
import { deliveriesApi } from '../lib/api/deliveries';
import { useAuth } from '../hooks/useAuth';
import type { PaginatedResponse } from '../lib/api/types';
import type {
  HarvestRecord,
  HarvestSummary,
  HarvestFilters,
  CreateHarvestRequest,
  DeliveryFilters,
  CreateDeliveryRequest,
  UpdateDeliveryStatusRequest,
  CompleteDeliveryRequest,
  HarvestStatistics,
} from '../types/harvests';

export type { PaginatedHarvestQuery };

// =====================================================
// HARVEST QUERIES
// =====================================================

export function useHarvests(organizationId: string, filters?: HarvestFilters) {
  return useQuery({
    queryKey: ['harvests', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      return harvestsApi.getAll(filters, organizationId);
    },
    enabled: !!organizationId,
  });
}

export function usePaginatedHarvests(organizationId: string, query: PaginatedHarvestQuery) {
  return useQuery({
    queryKey: ['harvests', 'paginated', organizationId, query],
    queryFn: async (): Promise<PaginatedResponse<HarvestSummary>> => {
      if (!organizationId) {
        return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
      }
      return harvestsApi.getPaginated(organizationId, query);
    },
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });
}

export function useHarvest(organizationId: string, harvestId: string | null) {
  return useQuery({
    queryKey: ['harvest', harvestId],
    queryFn: async () => {
      if (!harvestId || !organizationId) {
        return null;
      }
      return harvestsApi.getById(organizationId, harvestId);
    },
    enabled: !!harvestId && !!organizationId,
  });
}

export function useHarvestStatistics(organizationId: string, filters?: { date_from?: string; date_to?: string }) {
  // Fetch harvests and compute statistics client-side
  // This replaces the non-existent get_harvest_statistics RPC function
  const { data: harvests = [] } = useHarvests(organizationId, {
    date_from: filters?.date_from || new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    date_to: filters?.date_to || new Date().toISOString().split('T')[0],
  });

  return useQuery({
    queryKey: ['harvest-statistics', organizationId, filters, harvests.length],
    queryFn: async (): Promise<HarvestStatistics> => {
      // Compute statistics from harvests data
      const totalHarvests = harvests.length;
      const totalQuantity = harvests.reduce((sum, h) => sum + (h.quantity || 0), 0);
      const totalRevenue = harvests.reduce((sum, h) => {
        const quantity = h.quantity || 0;
        const price = h.unit_price || 0;
        return sum + (quantity * price);
      }, 0);
      const avgQuantityPerHarvest = totalHarvests > 0 ? totalQuantity / totalHarvests : 0;

      return {
        total_harvests: totalHarvests,
        total_quantity: totalQuantity,
        total_revenue: totalRevenue,
        avg_quantity_per_harvest: avgQuantityPerHarvest,
      };
    },
    enabled: !!organizationId,
  });
}

// =====================================================
// DELIVERY QUERIES
// =====================================================

export function useDeliveries(organizationId: string, filters?: DeliveryFilters) {
  return useQuery({
    queryKey: ['deliveries', organizationId, filters],
    queryFn: async () => {
      if (!organizationId) return [];
      return deliveriesApi.getAll(filters, organizationId);
    },
    enabled: !!organizationId,
  });
}

export function useDelivery(organizationId: string, deliveryId: string | null) {
  return useQuery({
    queryKey: ['delivery', deliveryId],
    queryFn: async () => {
      if (!deliveryId || !organizationId) return null;
      return deliveriesApi.getById(organizationId, deliveryId);
    },
    enabled: !!deliveryId && !!organizationId,
  });
}

export function useDeliveryItems(organizationId: string, deliveryId: string | null) {
  return useQuery({
    queryKey: ['delivery-items', deliveryId],
    queryFn: async () => {
      if (!deliveryId || !organizationId) return [];
      return deliveriesApi.getItems(deliveryId, organizationId);
    },
    enabled: !!deliveryId && !!organizationId,
  });
}

export function useDeliveryTracking(organizationId: string, deliveryId: string | null) {
  return useQuery({
    queryKey: ['delivery-tracking', deliveryId],
    queryFn: async () => {
      if (!deliveryId || !organizationId) return [];
      return deliveriesApi.getTracking(deliveryId, organizationId);
    },
    enabled: !!deliveryId && !!organizationId,
  });
}

// =====================================================
// HARVEST MUTATIONS
// =====================================================

export function useCreateHarvest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ organizationId, data }: { organizationId: string; data: CreateHarvestRequest }) => {
      return harvestsApi.create(data, organizationId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['harvests', variables.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['harvest-statistics', variables.organizationId] });
    },
  });
}

export function useUpdateHarvest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      harvestId,
      organizationId,
      updates
    }: {
      harvestId: string;
      organizationId: string;
      updates: Partial<HarvestRecord>
    }) => {
      return harvestsApi.update(harvestId, updates, organizationId);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['harvest', variables.harvestId] });
      queryClient.invalidateQueries({ queryKey: ['harvests', variables.organizationId] });
    },
  });
}

export function useDeleteHarvest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ harvestId, organizationId }: { harvestId: string; organizationId: string }) => {
      await harvestsApi.delete(harvestId, organizationId);
      return { harvestId, organizationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['harvests', data.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['harvest-statistics', data.organizationId] });
    },
  });
}

// =====================================================
// DELIVERY MUTATIONS
// =====================================================

export function useCreateDelivery() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (request: CreateDeliveryRequest) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      return deliveriesApi.create(currentOrganization.id, request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['harvests', currentOrganization?.id] });
    },
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (request: UpdateDeliveryStatusRequest) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      const { delivery_id, ...statusData } = request;
      return deliveriesApi.updateStatus(currentOrganization.id, delivery_id, statusData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delivery', data.id] });
      queryClient.invalidateQueries({ queryKey: ['deliveries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['delivery-tracking', data.id] });
    },
  });
}

export function useCompleteDelivery() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (request: CompleteDeliveryRequest) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      const { delivery_id, ...completionData } = request;
      return deliveriesApi.complete(currentOrganization.id, delivery_id, completionData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delivery', data.id] });
      queryClient.invalidateQueries({ queryKey: ['deliveries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['harvests', currentOrganization?.id] });
    },
  });
}

export function useUpdateDeliveryPayment() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({
      deliveryId,
      paymentReceived,
      paymentDate,
      paymentStatus
    }: {
      deliveryId: string;
      paymentReceived: number;
      paymentDate?: string;
      paymentStatus?: 'pending' | 'partial' | 'paid';
    }) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      return deliveriesApi.updatePayment(currentOrganization.id, deliveryId, {
        payment_received: paymentReceived,
        payment_date: paymentDate,
        payment_status: paymentStatus,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delivery', data.id] });
      queryClient.invalidateQueries({ queryKey: ['deliveries', currentOrganization?.id] });
    },
  });
}

export function useCancelDelivery() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ deliveryId, reason }: { deliveryId: string; reason?: string }) => {
      if (!currentOrganization) {
        throw new Error('No organization selected');
      }
      return deliveriesApi.cancel(currentOrganization.id, deliveryId, reason);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['delivery', data.id] });
      queryClient.invalidateQueries({ queryKey: ['deliveries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['harvests', currentOrganization?.id] });
    },
  });
}

