import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { harvestsApi, filesApi, type HarvestRecord } from '@/lib/api';

export const harvestKeys = {
  all: ['harvests'] as const,
  lists: () => [...harvestKeys.all, 'list'] as const,
  list: (filters: Record<string, string | undefined>) => [...harvestKeys.lists(), filters] as const,
  details: () => [...harvestKeys.all, 'detail'] as const,
  detail: (id: string) => [...harvestKeys.details(), id] as const,
};

export function useHarvests(filters?: { dateFrom?: string; dateTo?: string; farmId?: string }) {
  return useQuery({
    queryKey: harvestKeys.list(filters || {}),
    queryFn: () => harvestsApi.getHarvests(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useHarvest(harvestId: string) {
  return useQuery({
    queryKey: harvestKeys.detail(harvestId),
    queryFn: () => harvestsApi.getHarvest(harvestId),
    enabled: !!harvestId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateHarvest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      farm_id: string;
      parcel_id: string;
      crop_id?: string;
      harvest_date: string;
      quantity: number;
      unit: string;
      quality_grade?: string;
      notes?: string;
      photoUris?: string[];
      location?: { lat: number; lng: number };
    }) => {
      let photos: string[] | undefined;

      if (data.photoUris && data.photoUris.length > 0) {
        const uploadPromises = data.photoUris.map((uri) =>
          filesApi.uploadImage(uri, 'harvests')
        );
        const uploadResults = await Promise.all(uploadPromises);
        photos = uploadResults.map((r) => r.url);
      }

      return harvestsApi.createHarvest({
        farm_id: data.farm_id,
        parcel_id: data.parcel_id,
        crop_id: data.crop_id,
        harvest_date: data.harvest_date,
        quantity: data.quantity,
        unit: data.unit,
        quality_grade: data.quality_grade,
        notes: data.notes,
        location: data.location,
        photos,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: harvestKeys.lists() });
    },
  });
}

export function useUpdateHarvest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      harvestId,
      data,
    }: {
      harvestId: string;
      data: Partial<HarvestRecord>;
    }) => harvestsApi.updateHarvest(harvestId, data),
    onSuccess: (_, { harvestId }) => {
      queryClient.invalidateQueries({ queryKey: harvestKeys.detail(harvestId) });
      queryClient.invalidateQueries({ queryKey: harvestKeys.lists() });
    },
  });
}

export function useDeleteHarvest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (harvestId: string) => harvestsApi.deleteHarvest(harvestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: harvestKeys.lists() });
    },
  });
}
