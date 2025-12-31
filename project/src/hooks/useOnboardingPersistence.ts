import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'agritech_onboarding_state';
const STORAGE_VERSION = 1;

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
  lastSavedAt: number;
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
  existingOrgId: null,
  lastSavedAt: Date.now()
});

export function useOnboardingPersistence(userId: string, email: string) {
  const [state, setState] = useState<OnboardingState>(() => getDefaultState(userId, email));
  const [isRestored, setIsRestored] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStateRef = useRef<OnboardingState | null>(null);

  // Immediate save function (bypasses debounce)
  const saveImmediately = useCallback(() => {
    if (pendingStateRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingStateRef.current));
      } catch (err) {
        console.error('Failed to save onboarding state immediately:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: OnboardingState = JSON.parse(saved);
        
        if (parsed.version === STORAGE_VERSION && parsed.userId === userId) {
          const hoursSinceLastSave = (Date.now() - parsed.lastSavedAt) / (1000 * 60 * 60);
          if (hoursSinceLastSave < 24) {
            setState(parsed);
            setIsRestored(true);
            return;
          }
        }
      }
    } catch (err) {
      console.error('Failed to restore onboarding state:', err);
    }

    setState(getDefaultState(userId, email));
    setIsRestored(true);
  }, [userId, email]);

  const saveState = useCallback((newState: Partial<OnboardingState>) => {
    setState(prev => {
      const updated = { ...prev, ...newState, lastSavedAt: Date.now() };

      // Store pending state for immediate save on visibility change
      pendingStateRef.current = updated;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          pendingStateRef.current = null; // Clear pending after successful save
        } catch (err) {
          console.error('Failed to save onboarding state:', err);
        }
      }, 100);

      return updated;
    });
  }, []);

  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear onboarding state:', err);
    }
    setState(getDefaultState(userId, email));
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

  // Save immediately when tab becomes hidden or page is about to unload
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveImmediately();
      }
    };

    const handleBeforeUnload = () => {
      saveImmediately();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Flush pending save on unmount
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveImmediately();
    };
  }, [saveImmediately]);

  return {
    state,
    isRestored,
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
