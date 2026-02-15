import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api';

export function useProducts(category?: string) {
  return useQuery({
    queryKey: ['products', category ?? 'all'],
    queryFn: () => ApiClient.getProducts(category),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => ApiClient.getProduct(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useProductsPaginated(params: {
  category?: string;
  search?: string;
  sort?: string;
  min_price?: number;
  max_price?: number;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['products', 'paginated', params],
    queryFn: () => ApiClient.getProductsPaginated(params),
    staleTime: 5 * 60 * 1000,
  });
}
