import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  shareApi,
  type ShareLogRow,
  type ShareResourcePayload,
  type ShareResult,
  type ShareableResourceType,
} from '../lib/api/share';

export function useShareResource() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();

  return useMutation({
    mutationFn: async (payload: ShareResourcePayload): Promise<ShareResult> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return shareApi.share(payload, currentOrganization.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          'share-history',
          currentOrganization?.id,
          variables.resource_type,
          variables.resource_id,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ['share-history', currentOrganization?.id],
      });
    },
  });
}

export function useShareHistory(params?: {
  resource_type?: ShareableResourceType;
  resource_id?: string;
  limit?: number;
}) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: [
      'share-history',
      currentOrganization?.id,
      params?.resource_type,
      params?.resource_id,
      params?.limit,
    ],
    queryFn: async (): Promise<ShareLogRow[]> => {
      if (!currentOrganization?.id) return [];
      const res = await shareApi.history(currentOrganization.id, params);
      return res.data;
    },
    enabled: !!currentOrganization?.id,
  });
}
