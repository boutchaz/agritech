import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { aiCalibrationApi } from '../lib/api/ai-calibration';

export function useAIDiagnostics(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-diagnostics', parcelId, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return aiCalibrationApi.getAIDiagnostics(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
  });
}
