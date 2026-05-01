import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { stockEntriesApi, type BatchData } from '../lib/api/stock';
import type { PaginatedResponse } from '../lib/api/types';

export function useBatches(filters?: Record<string, unknown>) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-batches', currentOrganization?.id, filters],
    queryFn: () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return stockEntriesApi.getBatches(filters, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}

export function usePaginatedBatches(
  queryParams?: Record<string, unknown>,
  placeholderData: typeof keepPreviousData = keepPreviousData,
) {
  const { currentOrganization } = useAuth();
  const queryKey = JSON.stringify(queryParams ?? {});

  return useQuery({
    queryKey: ['stock-batches', 'paginated', currentOrganization?.id, queryKey],
    queryFn: async (): Promise<PaginatedResponse<BatchData>> => {
      if (!currentOrganization?.id) {
        return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
      }

      return stockEntriesApi.getBatchesPaginated(currentOrganization.id, queryParams);
    },
    enabled: !!currentOrganization?.id,
    placeholderData,
    staleTime: 30_000,
  });
}
