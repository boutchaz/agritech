import { beforeEach, describe, expect, it } from 'vitest';
import { useCalibrationWizardStore } from '../calibrationWizardStore';

describe('calibrationWizardStore', () => {
  beforeEach(() => {
    useCalibrationWizardStore.getState().reset();
  });

  it('starts with initial wizard state', () => {
    const state = useCalibrationWizardStore.getState();

    expect(state.currentStep).toBe(1);
    expect(state.formData).toEqual({});
    expect(state.parcelId).toBeNull();
    expect(state.hydrated).toBe(true);
  });

  it('clamps steps between 1 and 8', () => {
    useCalibrationWizardStore.getState().setStep(0);
    expect(useCalibrationWizardStore.getState().currentStep).toBe(1);

    useCalibrationWizardStore.getState().setStep(12);
    expect(useCalibrationWizardStore.getState().currentStep).toBe(8);
  });

  it('updates form data incrementally', () => {
    useCalibrationWizardStore.getState().updateFormData({ plantation_age: 12 });
    useCalibrationWizardStore.getState().updateFormData({ water_source: 'well' });

    expect(useCalibrationWizardStore.getState().formData).toEqual({
      plantation_age: 12,
      water_source: 'well',
    });
  });

  it('resets wizard state when parcel id changes to another parcel', () => {
    useCalibrationWizardStore.getState().setParcelId('parcel-1');
    useCalibrationWizardStore.getState().setStep(4);
    useCalibrationWizardStore.getState().updateFormData({ plantation_age: 8 });

    useCalibrationWizardStore.getState().setParcelId('parcel-2');

    const state = useCalibrationWizardStore.getState();
    expect(state.currentStep).toBe(1);
    expect(state.formData).toEqual({});
    expect(state.parcelId).toBe('parcel-2');
    expect(state.hydrated).toBe(false);
  });

  it('hydrates from backend drafts and normalizes blank optional selects', () => {
    useCalibrationWizardStore.getState().hydrateFromDraft({
      current_step: 5,
      form_data: {
        plantation_age: 10,
        foliar_analysis_available: '',
        pruning_practiced: '   ',
        harvest_regularity: null,
      },
    });

    expect(useCalibrationWizardStore.getState()).toEqual(expect.objectContaining({
      currentStep: 5,
      hydrated: true,
      formData: {
        plantation_age: 10,
        foliar_analysis_available: undefined,
        pruning_practiced: undefined,
        harvest_regularity: undefined,
      },
    }));
  });

  it('resets back to a hydrated default state', () => {
    useCalibrationWizardStore.getState().setParcelId('parcel-1');
    useCalibrationWizardStore.getState().setStep(3);
    useCalibrationWizardStore.getState().updateFormData({ plantation_age: 6 });

    useCalibrationWizardStore.getState().reset();

    expect(useCalibrationWizardStore.getState()).toEqual(expect.objectContaining({
      currentStep: 1,
      formData: {},
      parcelId: null,
      hydrated: true,
    }));
  });
});
