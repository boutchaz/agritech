// Inventory Hooks for Mobile App
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '@/lib/api/inventory';
import { useAuthStore } from '@/stores/authStore';
import type {
  StockItem,
  CreateStockItemInput,
  UpdateStockItemInput,
  CreateStockEntryInput,
  StockItemFilters,
  StockEntryFilters,
} from '@/types/inventory';

// Query Keys
export const inventoryKeys = {
  all: ['inventory'] as const,
  items: (filters?: StockItemFilters) => [...inventoryKeys.all, 'items', filters] as const,
  item: (id: string) => [...inventoryKeys.all, 'item', id] as const,
  entries: (filters?: StockEntryFilters) => [...inventoryKeys.all, 'entries', filters] as const,
  warehouses: () => [...inventoryKeys.all, 'warehouses'] as const,
  alerts: () => [...inventoryKeys.all, 'alerts'] as const,
  categories: () => [...inventoryKeys.all, 'categories'] as const,
};

// Items
export function useStockItems(filters?: StockItemFilters) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);

  return useQuery({
    queryKey: inventoryKeys.items(filters),
    queryFn: () => inventoryApi.getItems(filters),
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useStockItem(itemId: string) {
  return useQuery({
    queryKey: inventoryKeys.item(itemId),
    queryFn: () => inventoryApi.getItem(itemId),
    enabled: !!itemId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateStockItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStockItemInput) => inventoryApi.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
}

export function useUpdateStockItem(itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateStockItemInput) => inventoryApi.updateItem(itemId, data),
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

// Stock Entries
export function useStockEntries(filters?: StockEntryFilters) {
  return useQuery({
    queryKey: inventoryKeys.entries(filters),
    queryFn: () => inventoryApi.getEntries(filters),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateStockEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStockEntryInput) => inventoryApi.createEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.entries() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.items() });
    },
  });
}

// Warehouses
export function useWarehouses() {
  return useQuery({
    queryKey: inventoryKeys.warehouses(),
    queryFn: () => inventoryApi.getWarehouses(),
    staleTime: 10 * 60 * 1000,
  });
}

// Alerts
export function useLowStockAlerts() {
  return useQuery({
    queryKey: inventoryKeys.alerts(),
    queryFn: () => inventoryApi.getLowStockAlerts(),
    staleTime: 1 * 60 * 1000,
  });
}

// Categories
export function useInventoryCategories() {
  return useQuery({
    queryKey: inventoryKeys.categories(),
    queryFn: () => inventoryApi.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
}
