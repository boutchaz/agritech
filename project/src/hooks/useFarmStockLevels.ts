import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useModuleEnabled } from '@/hooks/useModuleEnabled';
import { itemsApi, type PaginatedFarmStockLevelFilters } from '@/lib/api/items';
import type { PaginatedResponse } from '@/lib/api/types';

export interface FarmStockLevel {
  farm_id: string | null;
  farm_name: string | null;
  warehouse_id: string;
  warehouse_name: string;
  item_id: string;
  total_quantity: number;
  total_value: number;
  is_low_stock: boolean;
  minimum_stock_level?: number;
}

export interface FarmStockLevelsByItem {
  item_id: string;
  item_code: string;
  item_name: string;
  default_unit: string;
  minimum_stock_level?: number;
  total_quantity: number;
  total_value: number;
  is_low_stock: boolean;
  by_farm: FarmStockLevel[];
}

/**
 * Hook to fetch stock levels grouped by farm
 * Returns stock levels with farm context for each warehouse
 */
export function useFarmStockLevels(options?: {
  farm_id?: string;
  item_id?: string;
  low_stock_only?: boolean;
}) {
  const { currentOrganization } = useAuth();
  // Gate the call on `stock` module activation. QuoteForm and other
  // sales/purchasing pages mount this hook even when the org has stock off
  // — without this guard, every render fires a 403 against the API gate.
  const stockEnabled = useModuleEnabled('stock');

  return useQuery({
    queryKey: ['farm-stock-levels', currentOrganization?.id, options],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];

      return itemsApi.getFarmStockLevels(
        {
          farm_id: options?.farm_id,
          item_id: options?.item_id,
          low_stock_only: options?.low_stock_only,
        },
        currentOrganization.id,
      );
    },
    enabled: !!currentOrganization?.id && stockEnabled,
  });
}

export function usePaginatedFarmStockLevels(options?: PaginatedFarmStockLevelFilters) {
  const { currentOrganization } = useAuth();
  const stockEnabled = useModuleEnabled('stock');

  return useQuery({
    queryKey: ['farm-stock-levels', 'paginated', currentOrganization?.id, options],
    queryFn: async (): Promise<PaginatedResponse<FarmStockLevelsByItem>> => {
      if (!currentOrganization?.id) {
        return { data: [], total: 0, page: 1, pageSize: options?.pageSize ?? 10, totalPages: 0 };
      }

      return itemsApi.getPaginatedFarmStockLevels(
        {
          farm_id: options?.farm_id,
          item_id: options?.item_id,
          low_stock_only: options?.low_stock_only,
          page: options?.page,
          pageSize: options?.pageSize,
        },
        currentOrganization.id,
      );
    },
    enabled: !!currentOrganization?.id && stockEnabled,
    placeholderData: keepPreviousData,
  });
}
