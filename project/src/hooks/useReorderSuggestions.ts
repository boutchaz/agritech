import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { stockEntriesApi } from '../lib/api/stock';
import type { PaginatedQuery, PaginatedResponse } from '../lib/api/types';
import type { ReorderSuggestionData } from '../lib/api/stock';

export function useReorderSuggestions() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-reorder-suggestions', currentOrganization?.id],
    queryFn: () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return stockEntriesApi.getReorderSuggestions(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}

export function usePaginatedReorderSuggestions(queryParams: PaginatedQuery) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-reorder-suggestions', 'paginated', currentOrganization?.id, queryParams],
    queryFn: (): Promise<PaginatedResponse<ReorderSuggestionData>> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return stockEntriesApi.getReorderSuggestionsPaginated(currentOrganization.id, queryParams);
    },
    enabled: !!currentOrganization?.id,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
