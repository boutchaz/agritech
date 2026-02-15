import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api';

export function useCategories(locale: string = 'fr') {
  return useQuery({
    queryKey: ['categories', locale],
    queryFn: () => ApiClient.getCategories(locale),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeaturedCategories(locale: string = 'fr') {
  return useQuery({
    queryKey: ['categories', 'featured', locale],
    queryFn: () => ApiClient.getFeaturedCategories(locale),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategoryBySlug(slug: string, locale: string = 'fr') {
  return useQuery({
    queryKey: ['category', slug, locale],
    queryFn: () => ApiClient.getCategoryBySlug(slug, locale),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}
