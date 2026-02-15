import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api';

export function useSellers(params?: { city?: string; category?: string; search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['sellers', params ?? {}],
    queryFn: () => ApiClient.getSellers(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSellerCities() {
  return useQuery({
    queryKey: ['sellers', 'cities'],
    queryFn: () => ApiClient.getSellerCities(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSeller(slug: string) {
  return useQuery({
    queryKey: ['seller', slug],
    queryFn: () => ApiClient.getSeller(slug),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}

export function useSellerProducts(slug: string, page?: number, limit?: number) {
  return useQuery({
    queryKey: ['seller', slug, 'products', page, limit],
    queryFn: () => ApiClient.getSellerProducts(slug, page, limit),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}

export function useSellerReviews(slug: string, page?: number, limit?: number) {
  return useQuery({
    queryKey: ['seller', slug, 'reviews', page, limit],
    queryFn: () => ApiClient.getSellerReviews(slug, page, limit),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}
