import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { cropsApi, type Crop, type CreateCropInput } from '@/lib/api/crops';

export type { Crop } from '@/lib/api/crops';

export function useCrops(options?: {
  farmId?: string;
  parcelId?: string;
  enabled?: boolean;
}) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['crops', organizationId, options?.farmId, options?.parcelId],
    queryFn: () => cropsApi.getAll(organizationId!, options?.farmId, options?.parcelId),
    enabled: !!organizationId && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCropsForTask(options: {
  farmId?: string;
  parcelId?: string;
  enabled?: boolean;
}) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;
  const { farmId, parcelId, enabled = true } = options;

  return useQuery({
    queryKey: ['crops', 'task', organizationId, farmId, parcelId],
    queryFn: async (): Promise<Crop[]> => {
      if (parcelId) {
        const parcelCrops = await cropsApi.getAll(organizationId!, farmId, parcelId);
        if (parcelCrops.length > 0) {
          return parcelCrops;
        }
      }
      return cropsApi.getAll(organizationId!, farmId);
    },
    enabled: !!organizationId && !!farmId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCrop(cropId: string | null) {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  return useQuery({
    queryKey: ['crops', cropId],
    queryFn: () => cropsApi.getById(organizationId!, cropId!),
    enabled: !!organizationId && !!cropId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCrop() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: (data: CreateCropInput) => {
      const orgId = currentOrganization?.id;
      if (!orgId) throw new Error('No organization selected');
      return cropsApi.create(orgId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] });
    },
  });
}
