import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { warehousesApi, type Warehouse } from '@/lib/api/warehouses';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';
import type { PaginatedQuery, PaginatedResponse } from '@/lib/api/types';

export type { Warehouse };

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

      return warehousesApi.getAll({}, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    staleTime: 60000, // 1 minute
  });
}

export function usePaginatedWarehouses(queryParams: PaginatedQuery) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['warehouses', 'paginated', currentOrganization?.id, queryParams],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }

      const params = new URLSearchParams();

      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });

      const queryString = params.toString();
      const endpoint = queryString
        ? `/api/v1/warehouses?${queryString}`
        : '/api/v1/warehouses';

      return apiClient.get<PaginatedResponse<Warehouse>>(endpoint, {}, currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
