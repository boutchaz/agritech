import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  calibrationV2Api,
  type CalibrationStatusRecord,
  type F3CampaignBilanResponse,
  type F3EligibilityResponse,
  type F3MissingTask,
  type F3NewAnalysesResponse,
} from '@/lib/api/calibration-v2';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from './useAuth';

const STALE_TIME_MS = 5 * 60 * 1000;

export function useF3Eligibility(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.f3.eligibility(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<F3EligibilityResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationV2Api.checkF3Eligibility(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: STALE_TIME_MS,
  });
}

export function useF3MissingTasks(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.f3.missingTasks(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<F3MissingTask[]> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationV2Api.getF3MissingTasks(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: STALE_TIME_MS,
  });
}

export function useF3NewAnalyses(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.f3.newAnalyses(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<F3NewAnalysesResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationV2Api.checkF3NewAnalyses(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: STALE_TIME_MS,
  });
}

export function useF3CampaignBilan(parcelId: string) {
  const { currentOrganization } = useAuth();

  return useQuery({
    queryKey: queryKeys.f3.campaignBilan(parcelId, currentOrganization?.id),
    queryFn: async (): Promise<F3CampaignBilanResponse> => {
      if (!currentOrganization?.id) {
        throw new Error('No organization selected');
      }
      return calibrationV2Api.getF3CampaignBilan(parcelId, currentOrganization.id);
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
        queryKey: queryKeys.f3.eligibility(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.f3.missingTasks(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.f3.newAnalyses(parcelId, currentOrganization?.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.f3.campaignBilan(parcelId, currentOrganization?.id),
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
