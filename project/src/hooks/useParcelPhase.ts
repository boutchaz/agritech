import { useMemo } from 'react';
import { useParcelById } from './useParcelsQuery';
import { useCalibrationSocket } from './useCalibrationSocket';

export type ParcelPhase =
  | 'awaiting_data'
  | 'ready_calibration'
  | 'calibrating'
  | 'calibrated'
  | 'awaiting_nutrition_option'
  | 'active'
  | 'archived'
  | null;

export interface ParcelPhaseState {
  phase: ParcelPhase;
  /** True while background work runs (satellite sync or calibration). Guard buttons with this. */
  isBusy: boolean;
  /** Human label for what's happening right now. */
  label: string;
  /** Short sentence explaining why buttons are disabled. */
  busyReason: string | null;
  /** Which numbered step of the 4-step flow we're on (0..3). */
  stepIndex: 0 | 1 | 2 | 3;
}

const STEP_LABELS: Record<Exclude<ParcelPhase, null>, { label: string; step: 0 | 1 | 2 | 3; busy: boolean; reason: string | null }> = {
  awaiting_data: {
    label: 'Téléchargement des données satellite…',
    step: 0,
    busy: true,
    reason: 'Récupération des images satellite et données météo. Patientez — le calibrage démarre automatiquement.',
  },
  ready_calibration: {
    label: 'Données prêtes — calibrage en attente',
    step: 1,
    busy: false,
    reason: null,
  },
  calibrating: {
    label: 'Calibrage en cours…',
    step: 1,
    busy: true,
    reason: 'Calibrage de la parcelle en cours — opération automatique, ne relancez pas.',
  },
  calibrated: {
    label: 'Calibrage validé — choisir la nutrition',
    step: 2,
    busy: false,
    reason: null,
  },
  awaiting_nutrition_option: {
    label: 'Plan en génération…',
    step: 2,
    busy: false,
    reason: null,
  },
  active: {
    label: 'Surveillance active',
    step: 3,
    busy: false,
    reason: null,
  },
  archived: {
    label: 'Archivée',
    step: 3,
    busy: false,
    reason: null,
  },
};

/**
 * Subscribes the parcel page to realtime phase events and returns the
 * current lifecycle state. Use `isBusy` to disable Sync/Calibrate
 * buttons while background work is running so users don't double-fire.
 */
export function useParcelPhase(parcelId: string): ParcelPhaseState {
  useCalibrationSocket(parcelId);
  const { data: parcel } = useParcelById(parcelId);
  const phase = (parcel?.ai_phase ?? null) as ParcelPhase;

  return useMemo(() => {
    if (!phase) {
      return {
        phase: null,
        isBusy: false,
        label: 'Non initialisée',
        busyReason: null,
        stepIndex: 0,
      };
    }
    const meta = STEP_LABELS[phase as Exclude<ParcelPhase, null>] ?? STEP_LABELS.awaiting_data;
    return {
      phase,
      isBusy: meta.busy,
      label: meta.label,
      busyReason: meta.reason,
      stepIndex: meta.step,
    };
  }, [phase]);
}
