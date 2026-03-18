import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CalibrationWizardFormValues } from '@/schemas/calibrationWizardSchema';

interface CalibrationWizardStore {
  currentStep: number;
  formData: Partial<CalibrationWizardFormValues>;
  parcelId: string | null;
  setStep: (step: number) => void;
  setParcelId: (parcelId: string | null) => void;
  updateFormData: (data: Partial<CalibrationWizardFormValues>) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 1,
  formData: {},
  parcelId: null,
};

export const useCalibrationWizardStore = create<CalibrationWizardStore>()(
  persist(
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
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'agritech-calibration-wizard',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export type { CalibrationWizardStore };
