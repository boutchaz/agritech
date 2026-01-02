import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useAuth } from '../components/MultiTenantAuthProvider';
import type { CrudApi } from '../lib/api/createCrudApi';

/**
 * Hook factory for organization-scoped queries
 * Automatically handles organization ID injection and enabled state
 *
 * @example
 * ```typescript
 * // Create hooks for customers
 * const { useList, useOne, useCreate, useUpdate, useDelete } = createOrgCrudHooks<Customer>(
 *   'customers',
 *   customersApi
 * );
 *
 * // Usage in components
 * const { data: customers } = useList({ is_active: true });
 * const { data: customer } = useOne(customerId);
 * const createMutation = useCreate();
 * ```
 */
export function createOrgCrudHooks<
  TEntity extends { id: string },
  TCreateInput = Partial<TEntity>,
  TFilters = Record<string, unknown>,
  TUpdateInput = Partial<TCreateInput>
>(
  resourceName: string,
  api: CrudApi<TEntity, TCreateInput, TFilters, TUpdateInput>
) {
  /**
   * Hook to fetch all entities for the current organization
   */
  function useList(
    filters?: TFilters,
    options?: Omit<UseQueryOptions<TEntity[], Error>, 'queryKey' | 'queryFn' | 'enabled'>
  ) {
    const { currentOrganization } = useAuth();

    return useQuery({
      queryKey: [resourceName, currentOrganization?.id, filters],
      queryFn: async () => {
        if (!currentOrganization?.id) {
          throw new Error('No organization selected');
        }
        return api.getAll(filters, currentOrganization.id);
      },
      enabled: !!currentOrganization?.id,
      ...options,
    });
  }

  /**
   * Hook to fetch a single entity by ID
   */
  function useOne(
    id: string | null | undefined,
    options?: Omit<UseQueryOptions<TEntity, Error>, 'queryKey' | 'queryFn' | 'enabled'>
  ) {
    const { currentOrganization } = useAuth();

    return useQuery({
      queryKey: [resourceName.replace(/s$/, ''), id],
      queryFn: async () => {
        if (!id) {
          throw new Error(`${resourceName} ID is required`);
        }
        if (!currentOrganization?.id) {
          throw new Error('No organization selected');
        }
        return api.getOne(id, currentOrganization.id);
      },
      enabled: !!id && !!currentOrganization?.id,
      ...options,
    });
  }

  /**
   * Hook to create a new entity
   */
  function useCreate(
    options?: Omit<UseMutationOptions<TEntity, Error, TCreateInput>, 'mutationFn'>
  ) {
    const queryClient = useQueryClient();
    const { currentOrganization } = useAuth();

    return useMutation({
      mutationFn: async (data: TCreateInput) => {
        if (!currentOrganization?.id) {
          throw new Error('No organization selected');
        }
        return api.create(data, currentOrganization.id);
      },
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: [resourceName, currentOrganization?.id] });
        options?.onSuccess?.(data, variables, context);
      },
      ...options,
    });
  }

  /**
   * Hook to update an entity
   */
  function useUpdate(
    options?: Omit<UseMutationOptions<TEntity, Error, TUpdateInput & { id: string }>, 'mutationFn'>
  ) {
    const queryClient = useQueryClient();
    const { currentOrganization } = useAuth();

    return useMutation({
      mutationFn: async ({ id, ...data }: TUpdateInput & { id: string }) => {
        if (!currentOrganization?.id) {
          throw new Error('No organization selected');
        }
        return api.update(id, data as TUpdateInput, currentOrganization.id);
      },
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: [resourceName, currentOrganization?.id] });
        queryClient.invalidateQueries({ queryKey: [resourceName.replace(/s$/, ''), variables.id] });
        options?.onSuccess?.(data, variables, context);
      },
      ...options,
    });
  }

  /**
   * Hook to delete an entity
   */
  function useDelete(
    options?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>
  ) {
    const queryClient = useQueryClient();
    const { currentOrganization } = useAuth();

    return useMutation({
      mutationFn: async (id: string) => {
        if (!currentOrganization?.id) {
          throw new Error('No organization selected');
        }
        return api.delete(id, currentOrganization.id);
      },
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: [resourceName, currentOrganization?.id] });
        options?.onSuccess?.(data, variables, context);
      },
      ...options,
    });
  }

  return {
    useList,
    useOne,
    useCreate,
    useUpdate,
    useDelete,
  };
}

/**
 * Simple hook for organization-scoped queries
 * Use this for one-off queries that don't fit the CRUD pattern
 *
 * @example
 * ```typescript
 * const { data } = useOrgQuery(
 *   ['dashboard-stats'],
 *   (orgId) => fetchDashboardStats(orgId)
 * );
 * ```
 */
export function useOrgQuery<TData>(
  queryKey: unknown[],
  queryFn: (organizationId: string) => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn' | 'enabled'>
) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: [...queryKey, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return queryFn(currentOrganization.id);
    },
    enabled: !!currentOrganization?.id,
    ...options,
  });
}

/**
 * Simple hook for organization-scoped mutations
 * Use this for one-off mutations that don't fit the CRUD pattern
 *
 * @example
 * ```typescript
 * const mutation = useOrgMutation(
 *   (orgId, data) => submitReport(data, orgId),
 *   {
 *     onSuccess: () => {
 *       queryClient.invalidateQueries({ queryKey: ['reports'] });
 *     }
 *   }
 * );
 * ```
 */
export function useOrgMutation<TData, TVariables>(
  mutationFn: (organizationId: string, variables: TVariables) => Promise<TData>,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>
) {
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return mutationFn(currentOrganization.id, variables);
    },
    ...options,
  });
}
