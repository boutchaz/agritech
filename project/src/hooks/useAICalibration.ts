import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { aiCalibrationApi, type AICalibration } from '../lib/api/ai-calibration';

const POLLING_INTERVAL_MS = 5000;

function isCalibrationInProgress(data: AICalibration | null | undefined): boolean {
  return data?.status === 'provisioning' || data?.status === 'in_progress';
}

export function useAICalibration(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-calibration', parcelId, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      try {
        const result = await aiCalibrationApi.getCalibration(parcelId, currentOrganization.id);
        // apiRequest returns {} for null/empty responses — normalize to null
        if (!result || !result.id) {
          return null;
        }
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('not found') || message.includes('resource was not found')) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
    refetchInterval: (query) => {
      if (isCalibrationInProgress(query.state.data)) {
        return POLLING_INTERVAL_MS;
      }
      return false;
    },
  });
}

export function useStartAICalibration() {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (parcelId: string): Promise<AICalibration> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiCalibrationApi.startCalibration(parcelId, currentOrganization.id);
    },
    onSuccess: (_, parcelId) => {
      queryClient.invalidateQueries({ queryKey: ['ai-calibration', parcelId] });
      queryClient.invalidateQueries({ queryKey: ['ai-diagnostics', parcelId] });
    },
  });
}
