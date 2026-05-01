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

          // Build final state - saved state takes precedence over defaults
          // But we still need to ensure all required fields exist
          const finalState: OnboardingState = {
            userId: savedState?.userId ?? defaultState.userId,
            version: savedState?.version ?? defaultState.version,
            currentStep: savedState?.currentStep ?? defaultState.currentStep,
            existingOrgId: savedState?.existingOrgId ?? defaultState.existingOrgId,
            existingFarmId: savedState?.existingFarmId ?? defaultState.existingFarmId,
            selectedPlanType: savedState?.selectedPlanType ?? defaultState.selectedPlanType,
            // Merge user profile data if available (from AuthContext)
            profileData: {
              first_name: userProfile?.first_name || savedState?.profileData?.first_name || defaultState.profileData.first_name,
              last_name: userProfile?.last_name || savedState?.profileData?.last_name || defaultState.profileData.last_name,
              phone: userProfile?.phone || savedState?.profileData?.phone || defaultState.profileData.phone,
              timezone: userProfile?.timezone || savedState?.profileData?.timezone || defaultState.profileData.timezone,
              language: userProfile?.language || savedState?.profileData?.language || defaultState.profileData.language,
            },
            organizationData: {
              ...defaultState.organizationData,
              ...(savedState?.organizationData || {}),
            },
            farmData: {
              ...defaultState.farmData,
              ...(savedState?.farmData || {}),
            },
            moduleSelection: {
              ...defaultState.moduleSelection,
              ...(savedState?.moduleSelection || {}),
            },
            preferences: {
              ...defaultState.preferences,
              ...(savedState?.preferences || {}),
            },
          };

          if (!finalState.preferences.accounting_template_country?.trim()) {
            finalState.preferences = {
              ...finalState.preferences,
              accounting_template_country: 'MA',
            };
          }

          // Always merge organization data from localStorage if it exists
          // This takes precedence over backend state for the organization created during signup
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

      // Update profile data
      updateProfileData: (data) => {
        set((state) => ({
          profileData: { ...state.profileData, ...data },
        }));
      },

      // Update organization data
      updateOrganizationData: (data) => {
        set((state) => ({
          organizationData: { ...state.organizationData, ...data },
        }));
      },

      // Update farm data
      updateFarmData: (data) => {
        set((state) => ({
          farmData: { ...state.farmData, ...data },
        }));
      },

      // Update module selection
      updateModuleSelection: (data) => {
        set((state) => ({
          moduleSelection: { ...state.moduleSelection, ...data },
        }));
      },

      // Update preferences
      updatePreferences: (data) => {
        set((state) => ({
          preferences: { ...state.preferences, ...data },
        }));
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
        // Only persist minimal state to localStorage as backup
        userId: state.userId,
        currentStep: state.currentStep,
        existingOrgId: state.existingOrgId,
        existingFarmId: state.existingFarmId,
      }),
    }
  )
);
