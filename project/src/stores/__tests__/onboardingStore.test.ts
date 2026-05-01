import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageStore: Record<string, string> = {};
const onboardingLocalStorage = {
  getItem: (key: string) => storageStore[key] ?? null,
  setItem: (key: string, value: string) => { storageStore[key] = String(value); },
  removeItem: (key: string) => { delete storageStore[key]; },
  clear: () => { for (const k of Object.keys(storageStore)) delete storageStore[k]; },
  get length() { return Object.keys(storageStore).length; },
  key: (index: number) => Object.keys(storageStore)[index] ?? null,
};
const onboardingSessionStorage = {
  getItem: (key: string) => storageStore[key] ?? null,
  setItem: (key: string, value: string) => { storageStore[key] = String(value); },
  removeItem: (key: string) => { delete storageStore[key]; },
  clear: () => { for (const k of Object.keys(storageStore)) delete storageStore[k]; },
  get length() { return Object.keys(storageStore).length; },
  key: (index: number) => Object.keys(storageStore)[index] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', { value: onboardingLocalStorage, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: onboardingSessionStorage, configurable: true });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: onboardingLocalStorage, configurable: true });
  Object.defineProperty(window, 'sessionStorage', { value: onboardingSessionStorage, configurable: true });
}

const { onboardingApi } = await import('../../lib/api/onboarding');
const { useOnboardingStore } = await import('../onboardingStore');

vi.mock('../../lib/api/onboarding', () => ({
  onboardingApi: {
    getState: vi.fn(),
    saveState: vi.fn(),
    clearState: vi.fn(),
  },
}));

describe('onboardingStore', () => {
  const getStoreState = () => useOnboardingStore.getState() as unknown as {
    isRestored: boolean;
    isSaving: boolean;
    saveError: string | null;
    userId: string;
    currentStep: number;
    existingOrgId: string | null;
    existingFarmId: string | null;
    selectedPlanType: string | null;
    profileData: {
      first_name: string;
      last_name: string;
      phone: string;
      timezone: string;
      language: string;
    };
    organizationData: {
      name: string;
      slug: string;
      email: string;
      phone: string;
      country: string;
    };
    farmData: {
      name: string;
      location: string;
    };
    moduleSelection: {
      accounting: boolean;
    };
    preferences: {
      currency: string;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useOnboardingStore.getState().reset();
  });

  describe('initialize', () => {
    it('merges backend state, user profile, and signup organization data', async () => {
      vi.mocked(onboardingApi.getState).mockResolvedValue({
        version: 2,
        userId: 'user-1',
        currentStep: 3,
        selectedPlanType: 'standard',
        existingOrgId: null,
        existingFarmId: 'farm-1',
        profileData: {
          first_name: 'Saved',
          last_name: 'User',
          phone: '111',
          timezone: 'UTC',
          language: 'en',
        },
        organizationData: {
          name: 'Saved Org',
          slug: 'saved-org',
          phone: '222',
          email: 'saved@example.com',
          account_type: 'farm',
          country: 'FR',
        },
        farmData: {
          name: 'Saved Farm',
          location: 'Meknes',
          size: 25,
          size_unit: 'hectares',
          farm_type: 'main',
          description: 'Olive grove',
        },
        moduleSelection: {
          farm_management: true,
          inventory: true,
          sales: true,
          procurement: false,
          accounting: false,
          hr: false,
          analytics: false,
          compliance: false,
          marketplace: false,
        },
        preferences: {
          currency: 'EUR',
          date_format: 'YYYY-MM-DD',
          use_demo_data: true,
          enable_notifications: false,
        },
      });

      localStorage.setItem('currentOrganizationId', 'org-from-signup');
      localStorage.setItem('currentOrganization', JSON.stringify({
        name: 'Signup Org',
        slug: 'signup-org',
        email: 'signup@example.com',
        phone: '333',
        country: 'MA',
      }));

      await useOnboardingStore.getState().initialize('user-1', 'owner@example.com', {
        first_name: 'Fatima',
        last_name: 'Admin',
        phone: '444',
        timezone: 'Africa/Casablanca',
        language: 'fr',
      });

      const state = getStoreState();
      expect(state.isRestored).toBe(true);
      expect(state.currentStep).toBe(3);
      expect(state.profileData).toEqual({
        first_name: 'Fatima',
        last_name: 'Admin',
        phone: '444',
        timezone: 'Africa/Casablanca',
        language: 'fr',
      });
      expect(state.organizationData).toEqual(expect.objectContaining({
        name: 'Signup Org',
        slug: 'signup-org',
        email: 'signup@example.com',
        phone: '333',
        country: 'MA',
      }));
      expect(state.existingOrgId).toBe('org-from-signup');
      expect(state.selectedPlanType).toBe('standard');
    });

    it('falls back to defaults when backend loading fails', async () => {
      vi.mocked(onboardingApi.getState).mockRejectedValue(new Error('network'));

      await useOnboardingStore.getState().initialize('user-2', 'new@example.com');

      const state = getStoreState();
      expect(state.isRestored).toBe(true);
      expect(state.userId).toBe('user-2');
      expect(state.organizationData.email).toBe('new@example.com');
      expect(state.currentStep).toBe(1);
    });
  });

  describe('persistState and clearState', () => {
    it('saves backend state with overrides and updates local state', async () => {
      vi.mocked(onboardingApi.getState).mockResolvedValue(null);
      vi.mocked(onboardingApi.saveState).mockResolvedValue({} as never);

      await useOnboardingStore.getState().initialize('user-1', 'owner@example.com');
      useOnboardingStore.getState().updateOrganizationData({ name: 'Atlas Farms' });
      useOnboardingStore.getState().setExistingOrgId('org-1');

      await useOnboardingStore.getState().persistState({ currentStep: 4, existingFarmId: 'farm-9' });

      expect(onboardingApi.saveState).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        currentStep: 4,
        existingOrgId: 'org-1',
        existingFarmId: 'farm-9',
        organizationData: expect.objectContaining({ name: 'Atlas Farms' }),
      }));
      expect(getStoreState().currentStep).toBe(4);
      expect(getStoreState().existingFarmId).toBe('farm-9');
      expect(getStoreState().isSaving).toBe(false);
      expect(getStoreState().saveError).toBeNull();
    });

    it('stores save errors when backend persistence fails', async () => {
      vi.mocked(onboardingApi.getState).mockResolvedValue(null);
      vi.mocked(onboardingApi.saveState).mockRejectedValue(new Error('save failed'));

      await useOnboardingStore.getState().initialize('user-1', 'owner@example.com');
      await useOnboardingStore.getState().persistState();

      expect(getStoreState().saveError).toBe('save failed');
      expect(getStoreState().isSaving).toBe(false);
    });

    it('clears state locally and in the backend', async () => {
      vi.mocked(onboardingApi.getState).mockResolvedValue(null);
      vi.mocked(onboardingApi.clearState).mockResolvedValue({ success: true });

      await useOnboardingStore.getState().initialize('user-1', 'owner@example.com');
      useOnboardingStore.getState().setCurrentStep(5);
      useOnboardingStore.getState().updateFarmData({ name: 'Farm A' });

      await useOnboardingStore.getState().clearState();

      expect(onboardingApi.clearState).toHaveBeenCalledTimes(1);
      expect(getStoreState().currentStep).toBe(1);
      expect(getStoreState().farmData.name).toBe('');
      expect(getStoreState().saveError).toBeNull();
    });
  });

  describe('state updates and reset', () => {
    it('updates each state slice and explicit selectors', async () => {
      vi.mocked(onboardingApi.getState).mockResolvedValue(null);
      await useOnboardingStore.getState().initialize('user-1', 'owner@example.com');

      useOnboardingStore.getState().updateProfileData({ first_name: 'Karim' });
      useOnboardingStore.getState().updateOrganizationData({ name: 'Coop' });
      useOnboardingStore.getState().updateFarmData({ location: 'Fes' });
      useOnboardingStore.getState().updateModuleSelection({ accounting: true });
      useOnboardingStore.getState().updatePreferences({ currency: 'USD' });
      useOnboardingStore.getState().setCurrentStep(2);
      useOnboardingStore.getState().setExistingOrgId('org-7');
      useOnboardingStore.getState().setExistingFarmId('farm-7');
      useOnboardingStore.getState().setSelectedPlanType('premium');

      const state = getStoreState();
      expect(state.profileData.first_name).toBe('Karim');
      expect(state.organizationData.name).toBe('Coop');
      expect(state.farmData.location).toBe('Fes');
      expect(state.moduleSelection.accounting).toBe(true);
      expect(state.preferences.currency).toBe('USD');
      expect(state.currentStep).toBe(2);
      expect(state.existingOrgId).toBe('org-7');
      expect(state.existingFarmId).toBe('farm-7');
      expect(state.selectedPlanType).toBe('premium');
    });

    it('resets the store back to onboarding defaults', async () => {
      vi.mocked(onboardingApi.getState).mockResolvedValue(null);
      await useOnboardingStore.getState().initialize('user-1', 'owner@example.com');
      useOnboardingStore.getState().setCurrentStep(4);
      useOnboardingStore.getState().updateProfileData({ first_name: 'Reset me' });

      useOnboardingStore.getState().reset();

      const state = getStoreState();
      expect(state.userId).toBe('');
      expect(state.currentStep).toBe(1);
      expect(state.profileData.first_name).toBe('');
      expect(state.isRestored).toBe(false);
      expect(state.saveError).toBeNull();
    });
  });
});
