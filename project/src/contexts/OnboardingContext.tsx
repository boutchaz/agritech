import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { onboardingApi, type OnboardingState } from '@/lib/api/onboarding';

// Re-export the type for convenience
export type { OnboardingState };

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
  // Empty by default — populated from /api/v1/module-config in ModulesStep.
  // Hardcoding legacy slugs here used to create phantom selections after the
  // backend module slugs were renamed.
  moduleSelection: {},
  preferences: {
    currency: 'MAD',
    date_format: 'DD/MM/YYYY',
    use_demo_data: false,
    enable_notifications: true,
    accounting_template_country: 'MA',
  },
  existingFarmId: null,
  existingOrgId: null,
  selectedPlanType: null
});

interface OnboardingContextValue {
  state: OnboardingState;
  isRestored: boolean;
  isSaving: boolean;
  saveError: string | null;
  updateProfileData: (data: Partial<OnboardingState['profileData']>) => void;
  updateOrganizationData: (data: Partial<OnboardingState['organizationData']>) => void;
  updateFarmData: (data: Partial<OnboardingState['farmData']>) => void;
  updateModuleSelection: (data: Partial<OnboardingState['moduleSelection']>) => void;
  updatePreferences: (data: Partial<OnboardingState['preferences']>) => void;
  persistState: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

export const useOnboardingContext = (): OnboardingContextValue => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  userId: string;
  email: string;
  children: ReactNode;
}

export const OnboardingProvider = ({ userId, email, children }: OnboardingProviderProps) => {
  const [state, setState] = useState<OnboardingState>(() => getDefaultState(userId, email));
  const [isRestored, setIsRestored] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isSavingRef = useRef(false);
  const mountedRef = useRef(true);

  // Load onboarding state from backend API on mount
  useEffect(() => {
    mountedRef.current = true;

    const loadState = async () => {
      try {
        // Check for organization from signup first
        const storedOrgId = localStorage.getItem('currentOrganizationId');
        const storedOrg = localStorage.getItem('currentOrganization');
        let orgData: { name?: string; slug?: string; email?: string } | null = null;

        if (storedOrgId && storedOrg) {
          try {
            orgData = JSON.parse(storedOrg);
          } catch (e) {
            console.error('Failed to parse stored organization:', e);
          }
        }

        // Try to load from backend API with short timeout
        const savedState = await Promise.race([
          onboardingApi.getState(),
          new Promise<OnboardingState | null>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 3000)
          ),
        ]).catch(() => null);

        if (mountedRef.current) {
          const defaultState = getDefaultState(userId, email);

          // Start with defaults merged with any saved state
          const finalState = {
            ...defaultState,
            ...savedState,
            profileData: { ...defaultState.profileData, ...savedState?.profileData },
            organizationData: { ...defaultState.organizationData, ...savedState?.organizationData },
            farmData: { ...defaultState.farmData, ...savedState?.farmData },
            moduleSelection: { ...defaultState.moduleSelection, ...savedState?.moduleSelection },
            preferences: { ...defaultState.preferences, ...savedState?.preferences },
          };

          // Always merge organization data from localStorage if it exists
          // (this takes precedence over backend state for the organization created during signup)
          if (orgData) {
            finalState.organizationData = {
              ...finalState.organizationData,
              name: orgData.name || finalState.organizationData.name,
              slug: orgData.slug || finalState.organizationData.slug,
              email: orgData.email || finalState.organizationData.email,
            };
            finalState.existingOrgId = storedOrgId;
          }

          setState(finalState);
          setIsRestored(true);
        }
      } catch (err) {
        console.error('Error loading onboarding state:', err);
        if (mountedRef.current) {
          setIsRestored(true);
        }
      }
    };

    loadState();

    return () => {
      mountedRef.current = false;
    };
  }, [userId, email]);

  // Persist state to backend
  // Use a ref to access state without including it in dependencies
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const persistState = useCallback(async () => {
    if (!userId || isSavingRef.current) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    isSavingRef.current = true;

    try {
      await onboardingApi.saveState(stateRef.current);
    } catch (err) {
      console.error('[OnboardingProvider] Failed to persist state:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [userId]);

  // Update functions (local state only)
  const updateProfileData = useCallback((data: Partial<OnboardingState['profileData']>) => {
    setState(prev => ({ ...prev, profileData: { ...prev.profileData, ...data } }));
  }, []);

  const updateOrganizationData = useCallback((data: Partial<OnboardingState['organizationData']>) => {
    setState(prev => ({ ...prev, organizationData: { ...prev.organizationData, ...data } }));
  }, []);

  const updateFarmData = useCallback((data: Partial<OnboardingState['farmData']>) => {
    setState(prev => ({ ...prev, farmData: { ...prev.farmData, ...data } }));
  }, []);

  const updateModuleSelection = useCallback((data: Partial<OnboardingState['moduleSelection']>) => {
    setState(prev => ({
      ...prev,
      // Coerce undefined → false to match OnboardingModuleSelection
      // (Record<string, boolean>); Partial<Record<>> would smuggle undefined.
      moduleSelection: Object.fromEntries(
        Object.entries({ ...prev.moduleSelection, ...data }).map(([k, v]) => [k, !!v]),
      ),
    }));
  }, []);

  const updatePreferences = useCallback((data: Partial<OnboardingState['preferences']>) => {
    setState(prev => ({ ...prev, preferences: { ...prev.preferences, ...data } }));
  }, []);

  const value: OnboardingContextValue = {
    state,
    isRestored,
    isSaving,
    saveError,
    updateProfileData,
    updateOrganizationData,
    updateFarmData,
    updateModuleSelection,
    updatePreferences,
    persistState,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
