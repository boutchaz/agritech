import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { stockEntriesApi } from '../lib/api/stock';

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
