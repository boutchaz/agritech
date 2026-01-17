import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const STORAGE_VERSION = 2; // Incremented from v1 (localStorage)

export interface OnboardingState {
  version: number;
  userId: string;
  currentStep: number;
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
    phone: string;
    email: string;
    account_type: 'individual' | 'business' | 'farm';
    address?: string;
    city?: string;
    country: string;
  };
  farmData: {
    name: string;
    location: string;
    size: number;
    size_unit: string;
    farm_type: 'main' | 'sub';
    description: string;
    soil_type?: string;
    climate_zone?: string;
  };
  moduleSelection: {
    farm_management: boolean;
    inventory: boolean;
    sales: boolean;
    procurement: boolean;
    accounting: boolean;
    hr: boolean;
    analytics: boolean;
    marketplace: boolean;
  };
  preferences: {
    currency: string;
    date_format: string;
    use_demo_data: boolean;
    enable_notifications: boolean;
  };
  existingOrgId: string | null;
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
 * Stores onboarding progress in the database for cross-device synchronization
 */
export function useOnboardingBackendPersistence(userId: string, email: string) {
  const [state, setState] = useState<OnboardingState>(() => getDefaultState(userId || '', email));
  const [isRestored, setIsRestored] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load onboarding state from database on mount
  useEffect(() => {
    if (!userId) {
      console.warn('[useOnboardingBackendPersistence] No userId provided, using default state');
      setIsRestored(true);
      return;
    }

    let mounted = true;

    const loadState = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('onboarding_state, onboarding_current_step')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('Failed to load onboarding state:', error);
          setIsRestored(true);
          return;
        }

        if (mounted) {
          if (data?.onboarding_state) {
            const parsed: OnboardingState = data.onboarding_state;

            // Validate version matches
            if (parsed.version === STORAGE_VERSION && parsed.userId === userId) {
              setState(parsed);
              // Also sync current_step from database
              if (data.onboarding_current_step && data.onboarding_current_step > parsed.currentStep) {
                setState(prev => ({ ...prev, currentStep: data.onboarding_current_step }));
              }
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

  // Save onboarding state to database
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
      const { error } = await supabase
        .from('user_profiles')
        .update({
          onboarding_state: updated,
          onboarding_current_step: updated.currentStep
        })
        .eq('id', userId);

      if (error) {
        console.error('Failed to save onboarding state:', error);
        setSaveError(error.message);
        // Don't throw - allow local state to persist even if backend save fails
      }
    } catch (err) {
      console.error('Error saving onboarding state:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }, [state, userId]);

  const clearState = useCallback(async () => {
    // Clear local state
    setState(getDefaultState(userId || '', email));
    setSaveError(null);

    // Clear database state if userId exists
    if (userId) {
      try {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            onboarding_state: null,
            onboarding_current_step: 1
          })
          .eq('id', userId);

        if (error) {
          console.error('Failed to clear onboarding state:', error);
        }
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
