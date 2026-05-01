import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { stockEntriesApi } from '../lib/api/stock';

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
