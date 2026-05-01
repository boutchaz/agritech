import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { stockEntriesApi } from '@/lib/api/stock-entries';
import type { StockMovementType } from '@/types/stock-entries';

interface StockMovementFilters {
  from_date?: string;
  to_date?: string;
  movement_type?: StockMovementType;
}

export const useStockMovements = (
  itemId: string | null,
  filters?: StockMovementFilters,
  page = 1,
  pageSize = 20,
) => {
  return useQuery({
    queryKey: ['stock-movements', itemId, filters, page, pageSize],
    queryFn: () => stockEntriesApi.getMovementsByItem(itemId!, { ...filters, page, pageSize }),
    enabled: !!itemId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
};
