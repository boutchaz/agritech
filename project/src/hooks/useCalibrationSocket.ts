import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { socketManager } from '@/lib/socket';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from './useAuth';
import { calibrationApi } from '@/lib/api/calibration-output';

interface CalibrationPhaseEvent {
  parcel_id: string;
  from_phase: string;
  to_phase: string;
}

interface CalibrationFailedEvent {
  parcel_id: string;
  calibration_id: string;
  error_message: string;
}

export interface CalibrationProgressEvent {
  parcel_id: string;
  calibration_id: string;
  step: number;
  total_steps: number;
  step_key: string;
  message: string;
  percent: number;
}

export function useCalibrationSocket(parcelId: string): void {
  const queryClient = useQueryClient();
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;

  useEffect(() => {
    if (!parcelId || !organizationId) return;

    const invalidateCalibrationQueries = (eventParcelId: string) => {
      if (eventParcelId !== parcelId) return;

      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.status(parcelId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.report(parcelId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.review(parcelId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.phase(parcelId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.nutritionSuggestion(parcelId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibration.history(parcelId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: ['ai-calibration', parcelId],
      });
      queryClient.invalidateQueries({
        queryKey: ['parcel', parcelId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ai-plan', parcelId, organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ai-plan-summary', parcelId, organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ai-plan-interventions', parcelId, organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ['ai-recommendations', parcelId, organizationId],
      });
    };

    const handlePhaseChanged = (data: unknown) => {
      invalidateCalibrationQueries((data as CalibrationPhaseEvent).parcel_id);
    };

    const handleFailed = (data: unknown) => {
      invalidateCalibrationQueries((data as CalibrationFailedEvent).parcel_id);
    };

    const unsubPhase = socketManager.on('calibration:phase-changed', handlePhaseChanged);
    const unsubFailed = socketManager.on('calibration:failed', handleFailed);

    return () => {
      unsubPhase();
      unsubFailed();
    };
  }, [parcelId, organizationId, queryClient]);
}

export function useCalibrationProgress(parcelId: string): CalibrationProgressEvent | null {
  const { currentOrganization } = useAuth();
  const organizationId = currentOrganization?.id;
  // Socket-delivered progress takes precedence; state only changes from
  // socket events, which are external-subscription updates and therefore
  // valid setState triggers.
  const [socketProgress, setSocketProgress] = useState<CalibrationProgressEvent | null>(null);

  // Hydrate from the persisted progress endpoint so reloading the page
  // shows the current step/percent. Polls every 5s while a run is
  // in_progress so we notice forward motion even if a socket event is
  // missed, and so the stale-guard server-side fires to clean zombies.
  const { data: persisted } = useQuery({
    queryKey: ['calibration-progress', parcelId, organizationId],
    queryFn: () => calibrationApi.getCalibrationProgress(parcelId, organizationId),
    enabled: !!parcelId && !!organizationId,
    refetchInterval: (query) => {
      const last = query.state.data;
      return last?.status === 'in_progress' ? 5000 : false;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (!parcelId) return;

    const handleProgress = (data: unknown) => {
      const evt = data as CalibrationProgressEvent;
      if (evt.parcel_id !== parcelId) return;
      setSocketProgress(evt);
    };

    const handlePhaseChanged = (data: unknown) => {
      const evt = data as CalibrationPhaseEvent;
      if (evt.parcel_id !== parcelId) return;
      if (evt.to_phase !== 'calibrating') {
        setSocketProgress(null);
      }
    };

    const handleFailed = (data: unknown) => {
      const evt = data as CalibrationFailedEvent;
      if (evt.parcel_id !== parcelId) return;
      setSocketProgress(null);
    };

    const unsubProgress = socketManager.on('calibration:progress', handleProgress);
    const unsubPhase = socketManager.on('calibration:phase-changed', handlePhaseChanged);
    const unsubFailed = socketManager.on('calibration:failed', handleFailed);

    return () => {
      unsubProgress();
      unsubPhase();
      unsubFailed();
    };
  }, [parcelId]);

  // Derive: socket wins when we have it, otherwise fall back to the
  // persisted snapshot from the poll. No setState-in-effect needed.
  if (socketProgress) return socketProgress;
  if (persisted?.progress && persisted.status === 'in_progress') {
    return {
      parcel_id: parcelId,
      calibration_id: persisted.calibration_id,
      step: persisted.progress.step,
      total_steps: persisted.progress.total_steps,
      step_key: persisted.progress.step_key ?? '',
      message: persisted.progress.message ?? '',
      percent: persisted.progress.percent,
    };
  }
  return null;
}
