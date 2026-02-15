import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api';

export function useDashboardStats(organizationId: string) {
  return useQuery({
    queryKey: ['dashboard', 'stats', organizationId],
    queryFn: () => ApiClient.getDashboardStats(organizationId),
    staleTime: 5 * 60 * 1000,
    enabled: !!organizationId,
  });
}
