import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socketManager } from '@/lib/socket';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from './useAuth';

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
        queryKey: queryKeys.calibrationV2.status(parcelId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.report(parcelId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.phase(parcelId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.nutritionSuggestion(parcelId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.calibrationV2.history(parcelId, organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: ['ai-calibration', parcelId],
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
    };

    const handlePhaseChanged = (data: CalibrationPhaseEvent) => {
      invalidateCalibrationQueries(data.parcel_id);
    };

    const handleFailed = (data: CalibrationFailedEvent) => {
      invalidateCalibrationQueries(data.parcel_id);
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
  const [progress, setProgress] = useState<CalibrationProgressEvent | null>(null);

  useEffect(() => {
    if (!parcelId) return;

    const handleProgress = (data: CalibrationProgressEvent) => {
      if (data.parcel_id !== parcelId) return;
      setProgress(data);
    };

    const handlePhaseChanged = (data: CalibrationPhaseEvent) => {
      if (data.parcel_id !== parcelId) return;
      if (data.to_phase !== 'calibrating') {
        setProgress(null);
      }
    };

    const unsubProgress = socketManager.on('calibration:progress', handleProgress);
    const unsubPhase = socketManager.on('calibration:phase-changed', handlePhaseChanged);

    return () => {
      unsubProgress();
      unsubPhase();
    };
  }, [parcelId]);

  return progress;
}
