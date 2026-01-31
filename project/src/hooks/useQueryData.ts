/**
 * useQueryData Hook
 *
 * Reduces boilerplate for query state handling.
 * Provides a consistent interface for loading, error, and data states.
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Query state interface
 */
export interface QueryData<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Extended query state with computed properties
 */
export interface ExtendedQueryData<T> extends QueryData<T> {
  isEmpty: boolean;
  isSuccess: boolean;
}

/**
 * Query state with data transformation
 */
export interface QueryDataWithTransform<T, R> extends QueryData<T> {
  data: R | null;
}

/**
 * Hook options
 */
export interface UseQueryDataOptions {
  /**
   * Show loading spinner component
   */
  showLoading?: boolean;

  /**
   * Custom loading component
   */
  loadingComponent?: React.ReactNode;

  /**
   * Custom error component
   */
  errorComponent?: React.ReactNode | ((error: Error) => React.ReactNode);

  /**
   * Custom empty component
   */
  emptyComponent?: React.ReactNode | ((data: T) => boolean);

  /**
   * Query key to invalidate on mutation
   */
  queryKey?: string[];
}

/**
 * Standard hook for queries with data transformation
 *
 * @param queryKey - React Query key
 * @param queryFn - Query function
 * @param options - Additional options
 * @returns Query data with loading/error states
 */
export function useQueryData<T, R = T>(
  queryFn: () => Promise<T>,
  transform?: (data: T) => R,
  options?: UseQueryDataOptions
): QueryDataWithTransform<T, R> {
  const query = useQuery({
    queryKey: options?.queryKey || [],
    queryFn: async () => {
      const data = await queryFn();
      return data;
    },
    select: transform,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
    isEmpty: !query.data,
    isSuccess: query.isSuccess,
  };
}

/**
 * React Query hook wrapper that returns standardized query state
 *
 * @param queryKey - React Query key
 * @param queryFn - Query function
 * @param options - Additional options
 * @returns Query state with computed properties
 */
export function useQueryState<T>(
  queryKey: unknown[],
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  }
): ExtendedQueryData<T> {
  const query = useQuery({
    queryKey,
    queryFn,
    enabled: options?.enabled,
    staleTime: options?.staleTime,
    refetchInterval: options?.refetchInterval,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
    isEmpty: !query.data && !query.isLoading,
    isSuccess: query.isSuccess !== false,
  };
}

/**
 * Hook for displaying query state (loading/error/empty)
 *
 * @param query - UseQueryResult object
 * @param options - Display options
 * @returns Object with computed state and render functions
 */
export function useQueryDisplay<T>(
  query: UseQueryResult<T>,
  options?: UseQueryDataOptions
) {
  const { showLoading = true, loadingComponent, errorComponent, emptyComponent } = options || {};

  const isLoading = query.isLoading || query.fetchStatus === 'fetching';
  const isError = query.isError;
  const error = query.error as Error | null;
  const data = query.data as T | undefined;
  const isSuccess = query.isSuccess !== false;
  const isEmpty = !data && !isLoading && isSuccess;

  const LoadingComponent = loadingComponent || (() => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-green-600" />
    </div>
  ));

  const ErrorComponent = errorComponent || ((err: Error) => (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
      <p className="text-sm text-red-800 dark:text-red-200">
        {err?.message || 'Error loading data'}
      </p>
    </div>
  ));

  const EmptyComponent = emptyComponent || (() => (
    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
      No data available
    </div>
  ));

  return {
    isLoading,
    isError,
    error,
    data,
    isSuccess,
    isEmpty,
    LoadingComponent,
    ErrorComponent,
    EmptyComponent,
    render: (content: (data: T) => React.ReactNode) => (
      <div className={cn(
        isLoading && 'opacity-50 pointer-events-none',
        isError && 'pointer-events-none'
      )}>
        {isLoading ? <LoadingComponent /> : isError ? <ErrorComponent /> : isEmpty && !data ? <EmptyComponent /> : content(data!)}
      </div>
    ),
  };
}

/**
 * Hook for conditional queries with automatic organization ID dependency
 *
 * @param queryFn - Query function that takes organizationId
 * @param getOrganizationId - Function to get organization ID
 * @returns Query state
 */
export function useOrgQuery<T>(
  queryFn: (organizationId: string) => Promise<T>,
  getOrganizationId: () => string | null = () => {
    // Default to use organization store
    try {
      const { useOrganizationStore } = require('@/stores/organizationStore');
      return useOrganizationStore.getState().currentOrganization?.id || null;
    } catch {
      return null;
    }
  }
) {
  const organizationId = getOrganizationId();

  return useQueryData(
    () => {
      if (!organizationId) {
        throw new OrganizationRequiredError();
      }
      return queryFn(organizationId);
    },
    undefined,
    {
      queryKey: ['org-query', organizationId],
      enabled: !!organizationId,
    }
  );
}

/**
 * Hook for paginated queries
 */
export function usePaginatedQuery<T>(
  queryKey: unknown[],
  queryFn: (page: number, pageSize: number) => Promise<{
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>,
  initialPage = 1,
  initialPageSize = 20
) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const query = useQuery({
    queryKey: [...queryKey, page, pageSize],
    queryFn: () => queryFn(page, pageSize),
    keepPreviousData: true,
  });

  const data = query.data?.data || [];
  const total = query.data?.total || 0;
  const totalPages = query.data?.totalPages || 1;

  const hasNext = page < totalPages;
  const hasPrevious = page > 1;

  return {
    data,
    total,
    page,
    pageSize,
    totalPages,
    hasNext,
    hasPrevious,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    nextPage: () => setPage(p => Math.min(p + 1, totalPages)),
    previousPage: () => setPage(p => Math.max(p - 1, 1)),
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1); // Reset to first page when changing page size
    },
  };
}

// Re-export types for convenience
export type { UseQueryResult };
