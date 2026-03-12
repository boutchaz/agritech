import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { aiPlanApi, type AIPlan, type AIPlanIntervention } from '../lib/api/ai-plan';

export function useAIPlan(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-plan', parcelId, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiPlanApi.getAIPlan(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAIPlanInterventions(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-plan-interventions', parcelId, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiPlanApi.getAIPlanInterventions(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useExecuteAIPlanIntervention() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<AIPlanIntervention> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiPlanApi.executeAIPlanIntervention(id, currentOrganization.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-plan-interventions', data.plan_id] });
    },
  });
}

export function useRegenerateAIPlan() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parcelId: string): Promise<AIPlan> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiPlanApi.regenerateAIPlan(parcelId, currentOrganization.id);
    },
    onSuccess: (_, parcelId) => {
      queryClient.invalidateQueries({ queryKey: ['ai-plan', parcelId] });
      queryClient.invalidateQueries({ queryKey: ['ai-plan-interventions', parcelId] });
    },
  });
}
