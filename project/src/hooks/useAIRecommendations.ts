import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { aiRecommendationsApi, type AIRecommendation } from '../lib/api/ai-recommendations';

export function useAIRecommendations(
  parcelId: string,
  options?: { refetchIntervalMs?: number | false },
) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-recommendations', parcelId, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiRecommendationsApi.getAIRecommendations(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
    refetchInterval: options?.refetchIntervalMs ?? false,
  });
}

export function useValidateAIRecommendation() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<AIRecommendation> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiRecommendationsApi.validateAIRecommendation(id, currentOrganization.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations', data.parcel_id] });
    },
  });
}

export function useRejectAIRecommendation() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<AIRecommendation> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiRecommendationsApi.rejectAIRecommendation(id, currentOrganization.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations', data.parcel_id] });
    },
  });
}

export function useExecuteAIRecommendation() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }): Promise<AIRecommendation> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiRecommendationsApi.executeAIRecommendation(id, notes, currentOrganization.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations', data.parcel_id] });
    },
  });
}
