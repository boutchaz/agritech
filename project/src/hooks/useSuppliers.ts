import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createOrgCrudHooks } from './useOrgQuery';
import { useAuth } from './useAuth';
import { apiClient } from '@/lib/api-client';
import type { PaginatedQuery, PaginatedResponse } from '@/lib/api/types';
import { suppliersApi, type Supplier, type CreateSupplierInput, type SupplierFilters } from '../lib/api/suppliers';

// Re-export the Supplier type for backward compatibility
export type { Supplier } from '../lib/api/suppliers';

// Create all CRUD hooks using the factory
const supplierHooks = createOrgCrudHooks<Supplier, CreateSupplierInput, SupplierFilters>(
  'suppliers',
  suppliersApi
);

/**
 * Hook to fetch all suppliers for the current organization
 */
export function useSuppliers() {
  return supplierHooks.useList({ is_active: true });
}

export function usePaginatedSuppliers(queryParams: PaginatedQuery) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id ?? null;

  return useQuery({
    queryKey: ['suppliers', 'paginated', organizationId, queryParams],
    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries({ ...queryParams, is_active: true }).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });

      const queryString = params.toString();
      const url = queryString ? `/api/v1/suppliers?${queryString}` : '/api/v1/suppliers';

      return apiClient.get<PaginatedResponse<Supplier>>(url, {}, organizationId);
    },
    enabled: !!organizationId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/**
 * Hook to fetch a single supplier
 */
export function useSupplier(supplierId: string | null) {
  return supplierHooks.useOne(supplierId);
}

/**
 * Hook to create a new supplier
 */
export function useCreateSupplier() {
  return supplierHooks.useCreate();
}

/**
 * Hook to update a supplier
 */
export function useUpdateSupplier() {
  return supplierHooks.useUpdate();
}

/**
 * Hook to delete/deactivate a supplier
 */
export function useDeleteSupplier() {
  return supplierHooks.useDelete();
}
