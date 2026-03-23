import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { calibrationV2Api, type CalibrationDraftResponse } from '@/lib/api/calibration-v2';
import { queryKeys } from '@/lib/query-keys';

/**
 * Fetch the wizard draft for a parcel from the backend.
 * Returns null if no draft exists.
 */
export function useCalibrationDraft(parcelId: string | null) {
  const { currentOrganization } = useAuth();

  return useQuery<CalibrationDraftResponse | null>({
    queryKey: queryKeys.calibrationV2.draft(parcelId ?? '', currentOrganization?.id),
    queryFn: async () => {
      if (!parcelId || !currentOrganization?.id) return null;
      return calibrationV2Api.getDraft(parcelId, currentOrganization.id);
    },
    enabled: !!parcelId && !!currentOrganization?.id,
    staleTime: 60_000,
  });
}

/**
 * Save (upsert) the wizard draft to the backend.
 * Call this on step navigation and "Save for later".
 */
export function useSaveCalibrationDraft(parcelId: string | null) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: { current_step: number; form_data: Record<string, unknown> }) => {
      if (!parcelId || !currentOrganization?.id) {
        throw new Error('Missing parcelId or organizationId');
      }
      return calibrationV2Api.saveDraft(parcelId, dto, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.draft(parcelId ?? '', currentOrganization?.id),
      });
    },
  });
}

/**
 * Delete the wizard draft after successful calibration launch.
 */
export function useDeleteCalibrationDraft(parcelId: string | null) {
  const { currentOrganization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!parcelId || !currentOrganization?.id) {
        throw new Error('Missing parcelId or organizationId');
      }
      return calibrationV2Api.deleteDraft(parcelId, currentOrganization.id);
    },
    onSuccess: () => {
      queryClient.removeQueries({
        queryKey: queryKeys.calibrationV2.draft(parcelId ?? '', currentOrganization?.id),
      });
    },
  });
}
