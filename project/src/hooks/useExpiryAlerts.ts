import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { stockEntriesApi } from '../lib/api/stock';

export function useExpiryAlerts(daysThreshold?: number) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['stock-expiry-alerts', currentOrganization?.id, daysThreshold],
    queryFn: () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return stockEntriesApi.getExpiryAlerts(daysThreshold, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
  });
}
