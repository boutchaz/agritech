import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bannersApi, type CreateBannerInput, type UpdateBannerInput } from '@/lib/api/banners';
import { useAuth } from '@/hooks/useAuth';

export function useActiveBanners() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['banners', 'active', currentOrganization?.id],
    queryFn: () => bannersApi.getActive(currentOrganization!.id),
    enabled: !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useAllBanners() {
  const { currentOrganization } = useAuth();
  return useQuery({
    queryKey: ['banners', 'all', currentOrganization?.id],
    queryFn: async () => {
      const res = await bannersApi.getAll(currentOrganization!.id);
      return (res as any)?.data || [];
    },
    enabled: !!currentOrganization?.id,
  });
}

export function useCreateBanner() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBannerInput) => bannersApi.create(data, currentOrganization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners', currentOrganization?.id] });
    },
  });
}

export function useUpdateBanner() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBannerInput }) =>
      bannersApi.update(id, data, currentOrganization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners', currentOrganization?.id] });
    },
  });
}

export function useDeleteBanner() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bannersApi.delete(id, currentOrganization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners', currentOrganization?.id] });
    },
  });
}

export function useDismissBanner() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bannersApi.dismiss(id, currentOrganization!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners', 'active', currentOrganization?.id] });
    },
  });
}
