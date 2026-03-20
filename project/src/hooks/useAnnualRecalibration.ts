import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  calibrationV2Api,
  type CalibrationStatusRecord,
  type AnnualCampaignBilanResponse,
  type AnnualEligibilityResponse,
  type AnnualMissingTask,
  type AnnualNewAnalysesResponse,
} from '@/lib/api/calibration-v2';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from './useAuth';

const STALE_TIME_MS = 5 * 60 * 1000;

export function useAnnualEligibility(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.annual.eligibility(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<AnnualEligibilityResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationV2Api.checkAnnualEligibility(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: STALE_TIME_MS,
  });
}

export function useAnnualMissingTasks(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.annual.missingTasks(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<AnnualMissingTask[]> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationV2Api.getAnnualMissingTasks(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: STALE_TIME_MS,
  });
}

export function useAnnualNewAnalyses(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.annual.newAnalyses(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<AnnualNewAnalysesResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationV2Api.checkAnnualNewAnalyses(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: STALE_TIME_MS,
  });
}

export function useAnnualCampaignBilan(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.annual.campaignBilan(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<AnnualCampaignBilanResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationV2Api.getAnnualCampaignBilan(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: STALE_TIME_MS,
  });
}

export function useStartAnnualRecalibration(parcelId: string) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      dto: Record<string, unknown> = {},
    ): Promise<CalibrationStatusRecord> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationV2Api.startAnnualRecalibration(
        parcelId,
        dto,
        currentOrganization.id,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.annual.eligibility(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.annual.missingTasks(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.annual.newAnalyses(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.annual.campaignBilan(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.status(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.report(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.phase(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.history(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({ queryKey: ['ai-calibration', parcelId] });
      toast.success('Recalibrage annuel lance.');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Echec du lancement du recalibrage annuel',
      );
    },
  });
}
