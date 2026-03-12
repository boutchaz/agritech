import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { aiAlertsApi, type AIAlert } from '../lib/api/ai-alerts';

export function useAIAlerts(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-alerts', parcelId, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiAlertsApi.getAIAlerts(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useActiveAIAlerts(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-alerts-active', parcelId, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiAlertsApi.getActiveAIAlerts(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAcknowledgeAIAlert() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string): Promise<AIAlert> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiAlertsApi.acknowledgeAIAlert(alertId, currentOrganization.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-alerts', data.parcel_id] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts-active', data.parcel_id] });
    },
  });
}

export function useResolveAIAlert() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (alertId: string): Promise<AIAlert> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiAlertsApi.resolveAIAlert(alertId, currentOrganization.id);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-alerts', data.parcel_id] });
      queryClient.invalidateQueries({ queryKey: ['ai-alerts-active', data.parcel_id] });
    },
  });
}
