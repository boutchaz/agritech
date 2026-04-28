import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { stockEntriesApi } from '../lib/api/stock';
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

      return stockEntriesApi.create(input, currentOrganization.id);
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
    mutationFn: async ({ entryId, input }: { entryId: string; input: UpdateStockEntryInput }) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return stockEntriesApi.update(entryId, input, currentOrganization.id);
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

      return stockEntriesApi.post(entryId, currentOrganization.id);
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

      return stockEntriesApi.cancel(entryId, currentOrganization.id);
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

      return stockEntriesApi.reverse(entryId, reason, currentOrganization.id);
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
