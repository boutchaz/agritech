import { create } from 'zustand';
import type { CalibrationWizardFormValues } from '@/schemas/calibrationWizardSchema';

interface CalibrationWizardStore {
  currentStep: number;
  formData: Partial<CalibrationWizardFormValues>;
  parcelId: string | null;
  /** True once hydrated from backend draft */
  hydrated: boolean;
  setStep: (step: number) => void;
  setParcelId: (parcelId: string | null) => void;
  updateFormData: (data: Partial<CalibrationWizardFormValues>) => void;
  /** Hydrate store from a backend draft response */
  hydrateFromDraft: (draft: { current_step: number; form_data: Record<string, unknown> }) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1,
  formData: {} as Partial<CalibrationWizardFormValues>,
  parcelId: null as string | null,
  hydrated: false,
};

export const useCalibrationWizardStore = create<CalibrationWizardStore>()(
  (set) => ({
    ...initialState,
    setStep: (step) => {
      set({ currentStep: Math.max(1, Math.min(8, step)) });
    },
    setParcelId: (parcelId) => {
      set((state) => {
        if (state.parcelId && parcelId && state.parcelId !== parcelId) {
          return {
            ...initialState,
            parcelId,
          };
        }
        return { parcelId };
      });
    },
    updateFormData: (data) => {
      set((state) => ({
        formData: {
          ...state.formData,
          ...data,
        },
      }));
    },
    hydrateFromDraft: (draft) => {
      set({
        currentStep: draft.current_step,
        formData: draft.form_data as Partial<CalibrationWizardFormValues>,
        hydrated: true,
      });
    },
    reset: () => {
      set({ ...initialState, hydrated: true });
    },
  }),
);

export type { CalibrationWizardStore };
