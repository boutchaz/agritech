import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { onboardingApi, type OnboardingState } from '@/lib/api/onboarding';
import type { PlanType } from '@/lib/polar';

interface OnboardingUserProfile {
  first_name?: string;
  last_name?: string;
  phone?: string;
  timezone?: string;
  language?: string;
}

interface StoredOrganization {
  name?: string;
  slug?: string;
  email?: string;
  phone?: string;
  country?: string;
}

const STORAGE_VERSION = 2;

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutoSave(getState: () => OnboardingStore) {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const state = getState();
    if (state.userId && state.isRestored) {
      state.persistState().catch(() => {});
    }
    autoSaveTimer = null;
  }, 2000);
}

const getDefaultState = (userId: string, email: string): OnboardingState => ({
  version: STORAGE_VERSION,
  userId,
  currentStep: 1,
  profileData: {
    first_name: '',
    last_name: '',
    phone: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Casablanca',
    language: 'fr'
  },
  organizationData: {
    name: '',
    slug: '',
    phone: '',
    email: email || '',
    account_type: 'farm',
    country: 'MA'
  },
  farmData: {
    name: '',
    location: '',
    size: 0,
    size_unit: 'hectares',
    farm_type: 'main',
    description: ''
  },
  moduleSelection: {
    farm_management: true,
    inventory: false,
    sales: false,
    procurement: false,
    accounting: false,
    hr: false,
    analytics: false,
    compliance: false,
    marketplace: false
  },
  preferences: {
    currency: 'MAD',
    date_format: 'DD/MM/YYYY',
    use_demo_data: false,
    enable_notifications: true,
    /** Default chart template so the complete step can submit without waiting on effects. */
    accounting_template_country: 'MA',
  },
  existingOrgId: null,
  existingFarmId: null,
  selectedPlanType: null
});

interface OnboardingStore extends OnboardingState {
  isRestored: boolean;
  isSaving: boolean;
  saveError: string | null;
  initialize: (userId: string, email: string, userProfile?: OnboardingUserProfile) => Promise<void>;
  persistState: (overrides?: Partial<Pick<OnboardingState, 'existingFarmId' | 'existingOrgId' | 'currentStep'>>) => Promise<void>;
  clearState: () => Promise<void>;
  updateProfileData: (data: Partial<OnboardingState['profileData']>) => void;
  updateOrganizationData: (data: Partial<OnboardingState['organizationData']>) => void;
  updateFarmData: (data: Partial<OnboardingState['farmData']>) => void;
  updateModuleSelection: (data: Partial<OnboardingState['moduleSelection']>) => void;
  updatePreferences: (data: Partial<OnboardingState['preferences']>) => void;
  setCurrentStep: (step: number) => void;
  setExistingOrgId: (orgId: string | null) => void;
  setExistingFarmId: (farmId: string | null) => void;
  setSelectedPlanType: (planType: PlanType) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...getDefaultState('', ''),
      isRestored: false,
      isSaving: false,
      saveError: null,

      // Initialize store from backend API
      initialize: async (userId: string, email: string, userProfile?: OnboardingUserProfile) => {
        try {
          // Check for organization from signup first
          const storedOrgId = localStorage.getItem('currentOrganizationId');
          const storedOrg = localStorage.getItem('currentOrganization');
          let orgData: StoredOrganization | null = null;

          if (storedOrgId && storedOrg) {
            try {
              orgData = JSON.parse(storedOrg);
            } catch (e) {
              console.error('Failed to parse stored organization:', e);
            }
          }

          // Try to load from backend API (with generous timeout)
          let savedState: OnboardingState | null = null;
          try {
            savedState = await Promise.race([
              onboardingApi.getState(),
              new Promise<OnboardingState | null>((resolve) =>
                setTimeout(() => resolve(null), 10000) // 10 second timeout
              ),
            ]);
          } catch (err) {
            console.warn('Failed to load state from backend, using localStorage fallback:', err);
          }

          const defaultState = getDefaultState(userId, email);

          let lsState: Partial<OnboardingState> | null = null;
          try {
            const raw = localStorage.getItem('agritech-onboarding');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.state) lsState = parsed.state;
            }
          } catch {
            // localStorage parse failed — treat as no cached state
          }

          // Stale localStorage from prior user (incl. DB reset → new user_id):
          // discard if userId mismatch.
          if (lsState?.userId && lsState.userId !== userId) {
            lsState = null;
            try {
              localStorage.removeItem('agritech-onboarding');
            } catch {
              // ignore storage quota / privacy-mode errors
            }
          }

          const finalState: OnboardingState = {
            userId: savedState?.userId ?? lsState?.userId ?? defaultState.userId,
            version: savedState?.version ?? lsState?.version ?? defaultState.version,
            currentStep: savedState?.currentStep ?? lsState?.currentStep ?? defaultState.currentStep,
            existingOrgId: savedState?.existingOrgId ?? lsState?.existingOrgId ?? defaultState.existingOrgId,
            existingFarmId: savedState?.existingFarmId ?? lsState?.existingFarmId ?? defaultState.existingFarmId,
            selectedPlanType: savedState?.selectedPlanType ?? lsState?.selectedPlanType ?? defaultState.selectedPlanType,
            profileData: {
              ...defaultState.profileData,
              ...(lsState?.profileData || {}),
              ...(savedState?.profileData || {}),
              first_name: userProfile?.first_name || savedState?.profileData?.first_name || lsState?.profileData?.first_name || defaultState.profileData.first_name,
              last_name: userProfile?.last_name || savedState?.profileData?.last_name || lsState?.profileData?.last_name || defaultState.profileData.last_name,
              phone: userProfile?.phone || savedState?.profileData?.phone || lsState?.profileData?.phone || defaultState.profileData.phone,
              timezone: userProfile?.timezone || savedState?.profileData?.timezone || lsState?.profileData?.timezone || defaultState.profileData.timezone,
              language: userProfile?.language || savedState?.profileData?.language || lsState?.profileData?.language || defaultState.profileData.language,
            },
            organizationData: {
              ...defaultState.organizationData,
              ...(lsState?.organizationData || {}),
              ...(savedState?.organizationData || {}),
            },
            farmData: {
              ...defaultState.farmData,
              ...(lsState?.farmData || {}),
              ...(savedState?.farmData || {}),
            },
            moduleSelection: {
              ...defaultState.moduleSelection,
              ...(lsState?.moduleSelection || {}),
              ...(savedState?.moduleSelection || {}),
            },
            preferences: {
              ...defaultState.preferences,
              ...(lsState?.preferences || {}),
              ...(savedState?.preferences || {}),
            },
          };

          if (!finalState.preferences.accounting_template_country?.trim()) {
            finalState.preferences = {
              ...finalState.preferences,
              accounting_template_country: 'MA',
            };
          }

          if (orgData) {
            finalState.organizationData = {
              ...finalState.organizationData,
              name: orgData.name || finalState.organizationData.name,
              slug: orgData.slug || finalState.organizationData.slug,
              email: orgData.email || finalState.organizationData.email,
              phone: orgData.phone || finalState.organizationData.phone,
              country: orgData.country || finalState.organizationData.country,
            };
            finalState.existingOrgId = storedOrgId;
          }

          set({
            ...finalState,
            isRestored: true,
          });
        } catch (err) {
          console.error('Error loading onboarding state:', err);
          set({
            ...getDefaultState(userId, email),
            isRestored: true,
          });
        }
      },

      // Persist state to backend
      persistState: async (overrides?: Partial<Pick<OnboardingState, 'existingFarmId' | 'existingOrgId' | 'currentStep'>>) => {
        const state = get();
        if (!state.userId) {
          console.warn('[OnboardingStore] No userId provided, skipping save');
          return;
        }

        set({ isSaving: true, saveError: null });

        try {
          // Only send the properties that the backend expects, not store-internal properties
          const backendState = {
            version: state.version,
            userId: state.userId,
            currentStep: overrides?.currentStep ?? state.currentStep,
            profileData: state.profileData,
            organizationData: state.organizationData,
            farmData: state.farmData,
            moduleSelection: state.moduleSelection,
            preferences: state.preferences,
            existingOrgId: overrides?.existingOrgId ?? state.existingOrgId,
            existingFarmId: overrides?.existingFarmId ?? state.existingFarmId,
            selectedPlanType: state.selectedPlanType,
          };
          await onboardingApi.saveState(backendState);

          // Also update local state with overrides
          if (overrides) {
            set(overrides);
          }
        } catch (err) {
          console.error('[OnboardingStore] Failed to persist state:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to save';
          set({ saveError: errorMessage });
        } finally {
          set({ isSaving: false });
        }
      },

      // Clear state
      clearState: async () => {
        const state = get();
        const defaultState = getDefaultState(state.userId || '', state.organizationData?.email || '');
        set({ ...defaultState, saveError: null });

        if (state.userId) {
          try {
            await onboardingApi.clearState();
          } catch (err) {
            console.error('Error clearing onboarding state:', err);
          }
        }
      },

      updateProfileData: (data) => {
        set((state) => ({
          profileData: { ...state.profileData, ...data },
        }));
        scheduleAutoSave(get);
      },

      updateOrganizationData: (data) => {
        set((state) => ({
          organizationData: { ...state.organizationData, ...data },
        }));
        scheduleAutoSave(get);
      },

      updateFarmData: (data) => {
        set((state) => ({
          farmData: { ...state.farmData, ...data },
        }));
        scheduleAutoSave(get);
      },

      updateModuleSelection: (data) => {
        set((state) => ({
          moduleSelection: { ...state.moduleSelection, ...data },
        }));
        scheduleAutoSave(get);
      },

      updatePreferences: (data) => {
        set((state) => ({
          preferences: { ...state.preferences, ...data },
        }));
        scheduleAutoSave(get);
      },

      // Set current step
      setCurrentStep: (step) => {
        set({ currentStep: step });
      },

      // Set existing organization ID
      setExistingOrgId: (orgId) => {
        set({ existingOrgId: orgId });
      },

      // Set existing farm ID
      setExistingFarmId: (farmId) => {
        set({ existingFarmId: farmId });
      },

      setSelectedPlanType: (planType) => {
        set({ selectedPlanType: planType });
      },

      // Reset store
      reset: () => {
        set({
          ...getDefaultState('', ''),
          isRestored: false,
          isSaving: false,
          saveError: null,
        });
      },
    }),
    {
      name: 'agritech-onboarding',
      storage: createJSONStorage(() => localStorage),
      // Don't persist these fields to localStorage (they're loaded from backend)
      partialize: (state) => ({
        version: state.version,
        userId: state.userId,
        currentStep: state.currentStep,
        existingOrgId: state.existingOrgId,
        existingFarmId: state.existingFarmId,
        selectedPlanType: state.selectedPlanType,
        profileData: state.profileData,
        organizationData: state.organizationData,
        farmData: state.farmData,
        moduleSelection: state.moduleSelection,
        preferences: state.preferences,
      }),
    }
  )
);
