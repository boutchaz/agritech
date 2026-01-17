import { useState, useEffect, useCallback } from 'react';
import { onboardingApi, type OnboardingState } from '@/lib/api/onboarding';

// Re-export the type for convenience
export type { OnboardingState };

const STORAGE_VERSION = 2; // Incremented from v1 (localStorage)

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
    marketplace: false
  },
  preferences: {
    currency: 'MAD',
    date_format: 'DD/MM/YYYY',
    use_demo_data: false,
    enable_notifications: true
  },
  existingOrgId: null
});

/**
 * Backend-persisted onboarding state hook
 * Stores onboarding progress in the database via NestJS API for cross-device synchronization
 */
export function useOnboardingBackendPersistence(userId: string, email: string) {
  const [state, setState] = useState<OnboardingState>(() => getDefaultState(userId || '', email));
  const [isRestored, setIsRestored] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load onboarding state from backend API on mount
  useEffect(() => {
    if (!userId) {
      console.warn('[useOnboardingBackendPersistence] No userId provided, using default state');
      setIsRestored(true);
      return;
    }

    let mounted = true;

    const loadState = async () => {
      try {
        const savedState = await onboardingApi.getState();

        if (mounted) {
          if (savedState) {
            // Validate version matches
            if (savedState.version === STORAGE_VERSION && savedState.userId === userId) {
              setState(savedState);
            } else {
              // Version mismatch or different user, use default
              console.log('[useOnboardingBackendPersistence] Version mismatch or different user, using default state');
              setState(getDefaultState(userId, email));
            }
          } else {
            // No saved state, use default
            setState(getDefaultState(userId, email));
          }
          setIsRestored(true);
        }
      } catch (err) {
        console.error('Error loading onboarding state:', err);
        if (mounted) {
          setIsRestored(true);
        }
      }
    };

    loadState();

    return () => {
      mounted = false;
    };
  }, [userId, email]);

  // Save onboarding state to backend API
  const saveState = useCallback(async (newState: Partial<OnboardingState>) => {
    const updated = { ...state, ...newState };

    // Update local state immediately for responsiveness
    setState(updated);

    // Don't save if no userId
    if (!userId) {
      console.warn('[useOnboardingBackendPersistence] No userId provided, skipping save');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      await onboardingApi.saveState(updated);
    } catch (err) {
      console.error('Failed to save onboarding state:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save';
      setSaveError(errorMessage);
      // Don't throw - allow local state to persist even if backend save fails
    } finally {
      setIsSaving(false);
    }
  }, [state, userId]);

  const clearState = useCallback(async () => {
    // Clear local state
    setState(getDefaultState(userId || '', email));
    setSaveError(null);

    // Clear backend state if userId exists
    if (userId) {
      try {
        await onboardingApi.clearState();
      } catch (err) {
        console.error('Error clearing onboarding state:', err);
      }
    }
  }, [userId, email]);

  const updateProfileData = useCallback((data: Partial<OnboardingState['profileData']>) => {
    saveState({ profileData: { ...state.profileData, ...data } });
  }, [state.profileData, saveState]);

  const updateOrganizationData = useCallback((data: Partial<OnboardingState['organizationData']>) => {
    saveState({ organizationData: { ...state.organizationData, ...data } });
  }, [state.organizationData, saveState]);

  const updateFarmData = useCallback((data: Partial<OnboardingState['farmData']>) => {
    saveState({ farmData: { ...state.farmData, ...data } });
  }, [state.farmData, saveState]);

  const updateModuleSelection = useCallback((data: Partial<OnboardingState['moduleSelection']>) => {
    saveState({ moduleSelection: { ...state.moduleSelection, ...data } });
  }, [state.moduleSelection, saveState]);

  const updatePreferences = useCallback((data: Partial<OnboardingState['preferences']>) => {
    saveState({ preferences: { ...state.preferences, ...data } });
  }, [state.preferences, saveState]);

  const setCurrentStep = useCallback((step: number) => {
    saveState({ currentStep: step });
  }, [saveState]);

  const setExistingOrgId = useCallback((orgId: string | null) => {
    saveState({ existingOrgId: orgId });
  }, [saveState]);

  return {
    state,
    isRestored,
    isSaving,
    saveError,
    saveState,
    clearState,
    updateProfileData,
    updateOrganizationData,
    updateFarmData,
    updateModuleSelection,
    updatePreferences,
    setCurrentStep,
    setExistingOrgId
  };
}
