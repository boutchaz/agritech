import { apiClient } from '../api-client';
import type { StockMovementType, StockMovementWithDetails } from '@/types/stock-entries';

interface StockMovementItemFilters {
  from_date?: string;
  to_date?: string;
  movement_type?: StockMovementType;
}

export const stockEntriesApi = {
  getMovementsByItem: async (
    itemId: string,
    filters?: StockMovementItemFilters,
  ): Promise<StockMovementWithDetails[]> => {
    const params = new URLSearchParams({ item_id: itemId });

    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.movement_type) params.append('movement_type', filters.movement_type);

    return apiClient.get<StockMovementWithDetails[]>(
      `/api/v1/stock-entries/movements/list?${params.toString()}`,
    );
  },
};
