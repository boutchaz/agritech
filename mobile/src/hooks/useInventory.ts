// Inventory Hooks for Mobile App
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api/inventory';
import { useAuthStore } from '@/stores/authStore';
import type {
  StockItem,
  CreateItemInput,
  UpdateItemInput,
  CreateStockEntryInput,
  ItemFilters,
  StockEntryFilters,
  StockMovementFilters,
} from '@/types/inventory';
import { toStockItem as mapToStockItem } from '@/types/inventory';

// Query Keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  items: (filters?: ItemFilters) => [...inventoryKeys.all, 'items', filters] as const,
  item: (id: string) => [...inventoryKeys.all, 'item', id] as const,
  stockLevels: (itemId?: string) => [...inventoryKeys.all, 'stock-levels', itemId] as const,
  entries: (filters?: StockEntryFilters) => [...inventoryKeys.all, 'entries', filters] as const,
  entry: (id: string) => [...inventoryKeys.all, 'entry', id] as const,
  movements: (filters?: StockMovementFilters) => [...inventoryKeys.all, 'movements', filters] as const,
  warehouses: () => [...inventoryKeys.all, 'warehouses'] as const,
};

// =====================================================
// ITEMS
// =====================================================

/** Fetch items and stock levels, returning StockItem[] for display */
export function useStockItems(filters?: ItemFilters) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: inventoryKeys.items(filters),
    queryFn: async () => {
      const [items, stockLevels] = await Promise.all([
        inventoryApi.getItems({ ...filters, is_stock_item: true }),
        inventoryApi.getStockLevels(),
      ]);

      const stockItems: StockItem[] = items.map((item) => {
        const level = stockLevels[item.id];
        return mapToStockItem(item, level?.quantity);
      });

      return { data: stockItems, total: stockItems.length };
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

/** Fetch raw items for selection (e.g., in forms) */
export function useItemsForSelection(search?: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: [...inventoryKeys.all, 'selection', search],
    queryFn: () => inventoryApi.getItemsForSelection(search),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useStockItem(itemId: string) {
  return useQuery({
    queryKey: inventoryKeys.item(itemId),
    queryFn: async () => {
      const [item, stockLevels] = await Promise.all([
        inventoryApi.getItem(itemId),
        inventoryApi.getStockLevels(itemId),
      ]);
      const level = stockLevels[itemId];
      return mapToStockItem(item, level?.quantity);
    },
    enabled: !!itemId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRawItem(itemId: string) {
  return useQuery({
    queryKey: [...inventoryKeys.item(itemId), 'raw'],
    queryFn: () => inventoryApi.getItem(itemId),
    enabled: !!itemId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateItemInput) => inventoryApi.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
}

export function useUpdateItem(itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateItemInput) => inventoryApi.updateItem(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.item(itemId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
}

export function useDeleteStockItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => inventoryApi.deleteItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
}

// =====================================================
// STOCK ENTRIES
// =====================================================

export function useStockEntries(filters?: StockEntryFilters) {
  return useQuery({
    queryKey: inventoryKeys.entries(filters),
    queryFn: () => inventoryApi.getEntries(filters),
    staleTime: 2 * 60 * 1000,
  });
}

export function useStockEntry(entryId: string) {
  return useQuery({
    queryKey: inventoryKeys.entry(entryId),
    queryFn: () => inventoryApi.getEntry(entryId),
    enabled: !!entryId,
  });
}

export function useCreateStockEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStockEntryInput) => inventoryApi.createEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.entries() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockLevels() });
    },
  });
}

export function usePostStockEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => inventoryApi.postEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.entries() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockLevels() });
    },
  });
}

export function useDeleteStockEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (entryId: string) => inventoryApi.deleteEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.entries() });
    },
  });
}

// =====================================================
// MOVEMENTS
// =====================================================

export function useStockMovements(filters?: StockMovementFilters) {
  return useQuery({
    queryKey: inventoryKeys.movements(filters),
    queryFn: () => inventoryApi.getMovements(filters),
    staleTime: 2 * 60 * 1000,
  });
}

// =====================================================
// WAREHOUSES
// =====================================================

export function useWarehouses() {
  return useQuery({
    queryKey: inventoryKeys.warehouses(),
    queryFn: () => inventoryApi.getWarehouses(),
    staleTime: 10 * 60 * 1000,
  });
}

// =====================================================
// DEPRECATED: kept for backward compat during transition
// =====================================================

/** @deprecated use useStockItems with filters instead */
export function useLowStockAlerts() {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: [...inventoryKeys.all, 'low-stock-alerts'],
    queryFn: async () => {
      const [items, stockLevels] = await Promise.all([
        inventoryApi.getItems({ is_stock_item: true }),
        inventoryApi.getStockLevels(),
      ]);

      return items
        .map((item) => {
          const level = stockLevels[item.id];
          const currentStock = level?.quantity ?? 0;
          const minStock = item.minimum_stock_level ?? 0;
          if (minStock > 0 && currentStock < minStock) {
            return {
              id: item.id,
              item_id: item.id,
              item_name: item.item_name,
              current_stock: currentStock,
              minimum_stock: minStock,
              shortage_amount: minStock - currentStock,
              created_at: item.created_at,
            };
          }
          return null;
        })
        .filter(Boolean);
    },
    enabled: !!orgId,
    staleTime: 1 * 60 * 1000,
  });
}
