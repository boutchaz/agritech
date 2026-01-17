import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/onboarding';

// Types matching the onboarding state structure
export interface OnboardingProfileData {
  first_name: string;
  last_name: string;
  phone?: string;
  timezone: string;
  language: string;
}

export interface OnboardingOrganizationData {
  name: string;
  slug: string;
  phone?: string;
  email: string;
  account_type: 'individual' | 'business' | 'farm';
  address?: string;
  city?: string;
  country: string;
}

export interface OnboardingFarmData {
  name: string;
  location: string;
  size: number;
  size_unit: string;
  farm_type?: 'main' | 'sub';
  description: string;
  soil_type?: string;
  climate_zone?: string;
}

export interface OnboardingModuleSelection {
  farm_management: boolean;
  inventory: boolean;
  sales: boolean;
  procurement: boolean;
  accounting: boolean;
  hr: boolean;
  analytics: boolean;
  marketplace: boolean;
}

export interface OnboardingPreferences {
  currency: string;
  date_format: string;
  use_demo_data: boolean;
  enable_notifications: boolean;
}

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
  moduleSelection: OnboardingModuleSelection;
  preferences: OnboardingPreferences;
  existingOrgId: string | null;
}

export interface SaveOnboardingStateInput {
  currentStep?: number;
  profileData?: Partial<OnboardingProfileData>;
  organizationData?: Partial<OnboardingOrganizationData>;
  farmData?: Partial<OnboardingFarmData>;
  moduleSelection?: Partial<OnboardingModuleSelection>;
  preferences?: Partial<OnboardingPreferences>;
  existingOrgId?: string | null;
}

export const onboardingApi = {
  /**
   * Get current onboarding state for the user
   */
  async getState(): Promise<OnboardingState | null> {
    try {
      return await apiClient.get<OnboardingState>(`${BASE_URL}/state`);
    } catch (error) {
      // Return null if no state exists (new user)
      return null;
    }
  },

  /**
   * Save onboarding state (partial update)
   */
  async saveState(state: Partial<OnboardingState>): Promise<OnboardingState> {
    return apiClient.patch<OnboardingState>(`${BASE_URL}/state`, state);
  },

  /**
   * Clear/reset onboarding state
   */
  async clearState(): Promise<void> {
    return apiClient.delete<void>(`${BASE_URL}/state`);
  },

  /**
   * Save user profile data (Step 1)
   */
  async saveProfile(data: OnboardingProfileData): Promise<void> {
    return apiClient.post<void>(`${BASE_URL}/profile`, data);
  },

  /**
   * Save or update organization (Step 2)
   */
  async saveOrganization(data: OnboardingOrganizationData, existingOrgId?: string): Promise<{ id: string }> {
    if (existingOrgId) {
      return apiClient.patch<{ id: string }>(`${BASE_URL}/organization/${existingOrgId}`, data);
    }
    return apiClient.post<{ id: string }>(`${BASE_URL}/organization`, data);
  },

  /**
   * Save farm data (Step 3)
   */
  async saveFarm(data: OnboardingFarmData): Promise<{ id: string }> {
    return apiClient.post<{ id: string }>(`${BASE_URL}/farm`, data);
  },

  /**
   * Save selected modules (Step 4)
   */
  async saveModules(moduleSelection: OnboardingModuleSelection): Promise<void> {
    return apiClient.post<void>(`${BASE_URL}/modules`, { moduleSelection });
  },

  /**
   * Save preferences and complete onboarding (Step 5)
   */
  async savePreferencesAndComplete(data: OnboardingPreferences): Promise<void> {
    return apiClient.post<void>(`${BASE_URL}/complete`, data);
  },

  /**
   * Complete onboarding (marks onboarding as completed)
   */
  async completeOnboarding(): Promise<void> {
    return apiClient.post<void>(`${BASE_URL}/complete`, {});
  },
};
