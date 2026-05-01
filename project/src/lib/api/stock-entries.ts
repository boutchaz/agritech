import { apiClient } from '../api-client';
import type { StockMovementType, StockMovementWithDetails } from '@/types/stock-entries';

interface StockMovementItemFilters {
  from_date?: string;
  to_date?: string;
  movement_type?: StockMovementType;
  page?: number;
  pageSize?: number;
}

export const stockEntriesApi = {
  getMovementsByItem: async (
    itemId: string,
    filters?: StockMovementItemFilters,
  ): Promise<{ data: StockMovementWithDetails[]; total: number }> => {
    const params = new URLSearchParams({ item_id: itemId });

    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.movement_type) params.append('movement_type', filters.movement_type);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.pageSize) params.append('pageSize', String(filters.pageSize));

    const response = await apiClient.get<
      StockMovementWithDetails[] | { data: StockMovementWithDetails[]; total?: number }
    >(`/api/v1/stock-entries/movements/list?${params.toString()}`);

    if (Array.isArray(response)) {
      return {
        data: response,
        total: response.length,
      };
    }

    return {
      data: response?.data ?? [],
      total: response?.total ?? response?.data?.length ?? 0,
    };
  },
};
