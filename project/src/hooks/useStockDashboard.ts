import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { stockEntriesApi } from '../lib/api/stock';

export function useStockDashboard() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-dashboard', currentOrganization?.id],
    queryFn: () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return stockEntriesApi.getDashboard(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}
