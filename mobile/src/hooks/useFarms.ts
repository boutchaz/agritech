import { useQuery } from '@tanstack/react-query';
import { farmsApi, parcelsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export const farmKeys = {
  all: ['farms'] as const,
  lists: () => [...farmKeys.all, 'list'] as const,
  details: () => [...farmKeys.all, 'detail'] as const,
  detail: (id: string) => [...farmKeys.details(), id] as const,
};

export const parcelKeys = {
  all: ['parcels'] as const,
  lists: () => [...parcelKeys.all, 'list'] as const,
  list: (farmId?: string) => [...parcelKeys.lists(), { farmId }] as const,
  details: () => [...parcelKeys.all, 'detail'] as const,
  detail: (id: string) => [...parcelKeys.details(), id] as const,
};

export function useFarms() {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);
  return useQuery({
    queryKey: farmKeys.lists(),
    queryFn: () => farmsApi.getFarms(),
    staleTime: 10 * 60 * 1000,
    enabled: !!orgId,
  });
}

export function useFarm(farmId: string) {
  return useQuery({
    queryKey: farmKeys.detail(farmId),
    queryFn: () => farmsApi.getFarm(farmId),
    enabled: !!farmId,
    staleTime: 10 * 60 * 1000,
  });
}

export function useParcels(farmId?: string) {
  const orgId = useAuthStore((s) => s.currentOrganization?.id);
  return useQuery({
    queryKey: parcelKeys.list(farmId),
    queryFn: () => parcelsApi.getParcels(farmId),
    staleTime: 10 * 60 * 1000,
    enabled: !!orgId,
  });
}

export function useParcel(parcelId: string) {
  return useQuery({
    queryKey: parcelKeys.detail(parcelId),
    queryFn: () => parcelsApi.getParcel(parcelId),
    enabled: !!parcelId,
    staleTime: 10 * 60 * 1000,
  });
}
