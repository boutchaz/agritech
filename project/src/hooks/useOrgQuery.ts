import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import type { CrudApi } from '../lib/api/createCrudApi';
import { withOfflineQueue } from '../lib/offline/withOfflineQueue';

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
  // Resource path conventions: pluralize the resourceName for the URL
  // (matches every CRUD module on the backend). The hook factory only
  // covers create/update/delete shapes — anything custom is migrated
  // explicitly elsewhere.
  const baseUrl = `/api/v1/${resourceName}`;

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
        const queued = withOfflineQueue<TCreateInput, TEntity>(
          {
            organizationId: currentOrganization.id,
            resource: resourceName,
            method: 'POST',
            url: baseUrl,
            buildPayload: (input, clientId) => ({ ...(input as object), client_id: clientId }),
            buildOptimisticStub: (input, clientId) =>
              ({ id: clientId, _pending: true, ...(input as object) }) as unknown as TEntity,
          },
          (input) => api.create(input, currentOrganization.id),
        );
        return queued(data);
      },
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: [resourceName, currentOrganization?.id] });
        options?.onSuccess?.(data, variables, context);
      },
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
        const queued = withOfflineQueue<TUpdateInput, TEntity>(
          {
            organizationId: currentOrganization.id,
            resource: resourceName,
            method: 'PATCH',
            url: `${baseUrl}/${id}`,
            buildOptimisticStub: (input, clientId) =>
              ({ id, _pending: true, ...(input as object), client_id: clientId }) as unknown as TEntity,
          },
          (input) => api.update(id, input, currentOrganization.id),
        );
        return queued(data as TUpdateInput);
      },
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: [resourceName, currentOrganization?.id] });
        queryClient.invalidateQueries({ queryKey: [resourceName.replace(/s$/, ''), variables.id] });
        options?.onSuccess?.(data, variables, context);
      },
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
        const queued = withOfflineQueue<void, void>(
          {
            organizationId: currentOrganization.id,
            resource: resourceName,
            method: 'DELETE',
            url: `${baseUrl}/${id}`,
          },
          () => api.delete(id, currentOrganization.id),
        );
        return queued();
      },
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: [resourceName, currentOrganization?.id] });
        options?.onSuccess?.(data, variables, context);
      },
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
