import { useInfiniteQuery } from '@tanstack/react-query';

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
}

export interface UsePaginationOptions<T> {
  queryKey: readonly unknown[];
  queryFn: (page: number, limit: number) => Promise<PaginatedResponse<T>>;
  limit?: number;
  enabled?: boolean;
}

export function usePagination<T>({
  queryKey,
  queryFn,
  limit = 20,
  enabled = true,
}: UsePaginationOptions<T>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) => queryFn(pageParam as number, limit),
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, page) => sum + page.data.length, 0);

      if (lastPage.hasMore === false) {
        return undefined;
      }

      if (totalFetched >= lastPage.total) {
        return undefined;
      }

      return allPages.length + 1;
    },
    initialPageParam: 1,
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const items = query.data?.pages.flatMap((page) => page.data) ?? [];
  const totalCount = query.data?.pages[0]?.total ?? 0;

  return {
    ...query,
    items,
    totalCount,
    loadMore: query.fetchNextPage,
    hasMore: query.hasNextPage,
    isLoadingMore: query.isFetchingNextPage,
  };
}
