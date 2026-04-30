import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../hooks/useAuth';
import { stockEntriesApi } from '../lib/api/stock';
import { runOrQueue as runOrQueueOffline } from '../lib/offline/runOrQueue';
import type {
  CreateStockEntryInput,
  UpdateStockEntryInput,
  StockEntryFilters,
  StockMovementFilters,
} from '../types/stock-entries';

/**
 * Hook to fetch all stock entries with optional filters
 */
export function useStockEntries(filters?: StockEntryFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-entries', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return stockEntriesApi.getAll(filters, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch a single stock entry with items
 */
export function useStockEntry(entryId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-entry', entryId],
    queryFn: async () => {
      if (!entryId) throw new Error('Entry ID is required');
      if (!currentOrganization?.id) throw new Error('No organization selected');

      return stockEntriesApi.getOne(entryId, currentOrganization.id);
    },
    enabled: !!entryId && !!currentOrganization?.id,
  });
}

/**
 * Hook to create a new stock entry
 */
export function useCreateStockEntry() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateStockEntryInput) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization or user');
      }
      const cid = uuidv4();
      const payload = { ...input, client_id: cid } as CreateStockEntryInput & { client_id: string };
      const outcome = await runOrQueueOffline(
        {
          organizationId: currentOrganization.id,
          resource: 'stock-entry',
          method: 'POST',
          url: '/api/v1/stock-entries',
          payload,
          clientId: cid,
        },
        () => stockEntriesApi.create(payload, currentOrganization.id),
      );
      if (outcome.status === 'queued') {
        return { ...payload, id: cid, _pending: true } as unknown as Awaited<
          ReturnType<typeof stockEntriesApi.create>
        >;
      }
      return outcome.result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to update stock entry (only for Draft status)
 */
export function useUpdateStockEntry() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ entryId, input, version }: { entryId: string; input: UpdateStockEntryInput; version?: number }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      const cid = uuidv4();
      const outcome = await runOrQueueOffline(
        {
          organizationId: currentOrganization.id,
          resource: 'stock-entry',
          method: 'PATCH',
          url: `/api/v1/stock-entries/${entryId}`,
          payload: input,
          ifMatchVersion: version ?? null,
          clientId: cid,
        },
        () => stockEntriesApi.update(entryId, input, currentOrganization.id),
      );
      if (outcome.status === 'queued') {
        return { id: entryId, _pending: true, ...input } as unknown as Awaited<
          ReturnType<typeof stockEntriesApi.update>
        >;
      }
      return outcome.result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['stock-entry', variables.entryId] });
    },
  });
}

/**
 * Hook to post (finalize) stock entry
 * This will update stock quantities and create movements
 */
export function usePostStockEntry() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      const cid = uuidv4();
      const outcome = await runOrQueueOffline(
        {
          organizationId: currentOrganization.id,
          resource: 'stock-entry-post',
          method: 'PATCH',
          url: `/api/v1/stock-entries/${entryId}/post`,
          payload: {},
          clientId: cid,
        },
        () => stockEntriesApi.post(entryId, currentOrganization.id),
      );
      if (outcome.status === 'queued') {
        return { id: entryId, _pending: true } as unknown as Awaited<
          ReturnType<typeof stockEntriesApi.post>
        >;
      }
      return outcome.result;
    },
    onSuccess: (_, entryId) => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['stock-entry', entryId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['stock-reorder-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['stock-expiry-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-batches'] });
    },
  });
}

/**
 * Hook to cancel stock entry
 */
export function useCancelStockEntry() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      const cid = uuidv4();
      const outcome = await runOrQueueOffline(
        {
          organizationId: currentOrganization.id,
          resource: 'stock-entry-cancel',
          method: 'PATCH',
          url: `/api/v1/stock-entries/${entryId}/cancel`,
          payload: {},
          clientId: cid,
        },
        () => stockEntriesApi.cancel(entryId, currentOrganization.id),
      );
      if (outcome.status === 'queued') {
        return { id: entryId, _pending: true } as unknown as Awaited<
          ReturnType<typeof stockEntriesApi.cancel>
        >;
      }
      return outcome.result;
    },
    onSuccess: (_, entryId) => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['stock-entry', entryId] });
    },
  });
}

export function useReverseStockEntry() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async ({ entryId, reason }: { entryId: string; reason: string }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      const cid = uuidv4();
      const outcome = await runOrQueueOffline(
        {
          organizationId: currentOrganization.id,
          resource: 'stock-entry-reverse',
          method: 'POST',
          url: `/api/v1/stock-entries/${entryId}/reverse`,
          payload: { reason },
          clientId: cid,
        },
        () => stockEntriesApi.reverse(entryId, reason, currentOrganization.id),
      );
      if (outcome.status === 'queued') {
        return { id: entryId, _pending: true } as unknown as Awaited<
          ReturnType<typeof stockEntriesApi.reverse>
        >;
      }
      return outcome.result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries', currentOrganization?.id] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['stock-reorder-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['stock-expiry-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-batches'] });
    },
  });
}

/**
 * Hook to delete stock entry (only Draft)
 */
export function useDeleteStockEntry() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return stockEntriesApi.delete(entryId, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries', currentOrganization?.id] });
    },
  });
}

/**
 * Hook to fetch stock movements with filters
 */
export function useStockMovements(filters?: StockMovementFilters) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-movements', currentOrganization?.id, filters],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return stockEntriesApi.getMovements(filters, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}

/**
 * Hook to fetch stock movements for a specific item
 */
export function useItemStockMovements(itemId: string | null) {
  return useStockMovements({ item_id: itemId || undefined });
}

/**
 * Hook to fetch the stock aging report
 */
export function useStockAging(warehouseId?: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-aging', currentOrganization?.id, warehouseId],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return stockEntriesApi.getAging(currentOrganization.id, warehouseId);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60 * 1000,
  });
}
