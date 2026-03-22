import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { aiCalibrationApi } from '../lib/api/ai-calibration';

export function useAIDiagnostics(parcelId: string, enabled = true) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: ['ai-diagnostics', parcelId, currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      try {
        return await aiCalibrationApi.getAIDiagnostics(parcelId, currentOrganization.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (
          message.includes('not found') ||
          message.includes('No satellite readings') ||
          message.includes('resource was not found') ||
          message.includes('Diagnostics are only available for parcels in active AI phase')
        ) {
          return null;
        }
        throw error;
      }
    },
    enabled: enabled && !!parcelId && !!currentOrganization?.id,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      const message = error instanceof Error ? error.message : '';
      if (
        message.includes('not found') ||
        message.includes('No satellite readings') ||
        message.includes('Diagnostics are only available for parcels in active AI phase')
      ) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
