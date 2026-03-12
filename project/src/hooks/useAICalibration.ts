import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { aiCalibrationApi, type AICalibration } from '../lib/api/ai-calibration';

export function useAICalibration(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-calibration', parcelId, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiCalibrationApi.getCalibration(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
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
    },
  });
}
