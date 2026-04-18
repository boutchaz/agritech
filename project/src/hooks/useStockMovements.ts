import { useQuery } from '@tanstack/react-query';
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
) => {
  return useQuery({
    queryKey: ['stock-movements', itemId, filters],
    queryFn: () => stockEntriesApi.getMovementsByItem(itemId!, filters),
    enabled: !!itemId,
    staleTime: 60_000,
  });
};
