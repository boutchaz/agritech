import { useQuery } from '@tanstack/react-query';
import { warehousesApi, type Warehouse } from '@/lib/api/warehouses';
import { useAuth } from '@/hooks/useAuth';

/**
 * Fetch all active warehouses for the current organization
 */
export function useWarehouses() {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['warehouses', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      return warehousesApi.getAll(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60000, // 1 minute
  });
}
