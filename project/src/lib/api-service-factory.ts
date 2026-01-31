/**
 * Typed API Service Factory
 *
 * Reduces boilerplate for creating CRUD API services.
 * Generates type-safe API methods with consistent error handling.
 */

import { apiClient } from './api-client';
import { OrganizationRequiredError } from './errors';
import type { useQuery } from '@tanstack/react-query';

/**
 * Generic API service options
 */
export interface ApiServiceOptions {
  /**
   * Base URL for all endpoints (e.g., '/api/v1/farms')
   */
  baseUrl: string;

  /**
   * Entity name for error messages (e.g., 'Farm', 'Parcel')
   */
  entityName: string;

  /**
   * Whether to auto-include organization ID in all requests
   */
  requireOrganization?: boolean;

  /**
   * Transform function for API responses
   */
  transform?: <T>(data: any) => T;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * API service method options
 */
export interface ServiceMethodOptions<T = any> {
  /**
   * Whether to include organization ID in request
   */
  includeOrganization?: boolean;

  /**
   * Transform function for the response
   */
  transform?: (data: any) => T;

  /**
   * Query key for React Query
   */
  queryKey?: string[];
}

/**
 * Create a typed API service
 */
export function createApiService<T extends Record<string, any>>(options: ApiServiceOptions) {
  const { baseUrl, entityName, requireOrganization = true } = options;

  /**
   * Generic GET request wrapper
   */
  async function get<R = T>(
    endpoint: string,
    methodOptions: ServiceMethodOptions<R> = {},
    organizationId?: string
  ): Promise<R> {
    const { transform } = methodOptions;
    const includeOrg = methodOptions.includeOrganization ?? requireOrganization;

    const url = includeOrg && organizationId
      ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}organization_id=${organizationId}`
      : endpoint;

    const data = await apiClient.get<R>(url, {}, includeOrg ? organizationId : undefined);
    return transform ? transform(data) : data;
  }

  /**
   * Generic POST request wrapper
   */
  async function post<R = T, D = any>(
    endpoint: string,
    data: D,
    methodOptions: ServiceMethodOptions<R> = {},
    organizationId?: string
  ): Promise<R> {
    const { transform } = methodOptions;
    const includeOrg = methodOptions.includeOrganization ?? requireOrganization;

    const result = await apiClient.post<R>(
      endpoint,
      data,
      {},
      includeOrg ? organizationId : undefined
    );
    return transform ? transform(result) : result;
  }

  /**
   * Generic PATCH request wrapper
   */
  async function patch<R = T, D = any>(
    endpoint: string,
    data: D,
    methodOptions: ServiceMethodOptions<R> = {},
    organizationId?: string
  ): Promise<R> {
    const { transform } = methodOptions;
    const includeOrg = methodOptions.includeOrganization ?? requireOrganization;

    const result = await apiClient.patch<R>(
      endpoint,
      data,
      {},
      includeOrg ? organizationId : undefined
    );
    return transform ? transform(result) : result;
  }

  /**
   * Generic DELETE request wrapper
   */
  async function del<R = void>(
    endpoint: string,
    methodOptions: ServiceMethodOptions<R> = {},
    organizationId?: string
  ): Promise<R> {
    const { transform } = methodOptions;
    const includeOrg = methodOptions.includeOrg ?? requireOrganization;

    const result = await apiClient.delete<R>(
      endpoint,
      {},
      includeOrg ? organizationId : undefined
    );

    // DELETE responses often return void, but some return data
    return transform && result !== undefined ? transform(result) : result;
  }

  /**
   * CRUD operation builders
   */
  return {
    /**
     * Get all entities (paginated)
     */
    getAll: (organizationId?: string) =>
      get<PaginatedResponse<T>>(baseUrl, { organizationId }),

    /**
     * Get single entity by ID
     */
    getById: (id: string, organizationId?: string) =>
      get<T>(`${baseUrl}/${id}`, { organizationId }),

    /**
     * Create new entity
     */
    create: (data: Partial<T>, organizationId?: string) =>
      post<T>(baseUrl, data, { organizationId }),

    /**
     * Update entity by ID
     */
    update: (id: string, data: Partial<T>, organizationId?: string) =>
      post<T>(`${baseUrl}/${id}`, data, { organizationId }),

    /**
     * Delete entity by ID
     */
    delete: (id: string, organizationId?: string) =>
      del<void>(`${baseUrl}/${id}`, { organizationId }),

    /**
     * Custom GET request
     */
    get: get,

    /**
     * Custom POST request
     */
    post: post,

    /**
     * Custom PATCH request
     */
    patch: patch,

    /**
     * Custom DELETE request
     */
    delete: del,
  };
}

/**
 * Helper to create a React Query hook from API service
 */
export function createQueryHook<T, R = T>(
  queryFn: (organizationId?: string) => Promise<R>,
  options?: {
    enabled?: (orgId: string | undefined) => boolean;
    staleTime?: number;
  }
) {
  return (organizationId?: string) => ({
    queryKey: [options?.enabled?.toString() || 'auto', organizationId],
    queryFn: () => queryFn(organizationId),
    enabled: organizationId ? (options?.enabled?.(organizationId) ?? true) : false,
    staleTime: options?.staleTime || 5 * 60 * 1000,
  });
}

/**
 * Helper to create a React Query mutation hook from API service
 */
export function createMutationHook<T, D = any, R = T>(
  mutationFn: (data: D, organizationId?: string) => Promise<R>,
  options?: {
    onSuccess?: (data: R, variables: D) => void;
    onError?: (error: Error, variables: D) => void;
    invalidateQueries?: () => string[][];
  }
) {
  return (queryClient: any, getCurrentOrganization: () => string | null) => ({
    mutationFn: async (data: D) => {
      const organizationId = getCurrentOrganization();
      if (!organizationId && options?.invalidateQueries) {
        throw new OrganizationRequiredError();
      }
      return mutationFn(data, organizationId);
    },
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  });
}
