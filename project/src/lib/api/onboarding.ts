import { apiClient } from '../api-client';
import type { PlanType } from '@/lib/polar';

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
  /** From geocoder (Nominatim); saved as farm `coordinates` when present. */
  latitude?: number;
  longitude?: number;
  place_id?: string;
  size: number;
  size_unit: string;
  farm_type?: 'main' | 'sub';
  description: string;
  soil_type?: string;
  climate_zone?: string;
}

/**
 * Keyed by module slug as returned by /api/v1/module-config (e.g. `core`,
 * `personnel`, `stock`, `accounting`, `marketplace`, ...). The shape is
 * intentionally open: when the backend adds or renames a module slug, the
 * client picks it up automatically without a type-locked rename here.
 *
 * Earlier versions hardcoded legacy slugs (`farm_management`, `inventory`,
 * `sales`, `hr`, `analytics`) which no longer exist server-side. Those
 * defaults rendered as phantom selections and prevented the recommended
 * modules from being highlighted on first paint.
 */
export type OnboardingModuleSelection = Record<string, boolean>;

export interface OnboardingPreferences {
  currency: string;
  date_format: string;
  use_demo_data: boolean;
  enable_notifications: boolean;
  /** ISO2 chart template (MA, FR, TN, US, GB, DE) — required for accounting setup */
  accounting_template_country: string;
}

export interface OnboardingState {
  version: number;
  userId: string;
  currentStep: number;
  selectedPlanType: PlanType | null;
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
    latitude?: number;
    longitude?: number;
    place_id?: string;
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
  existingFarmId: string | null;
}

export interface SaveOnboardingStateInput {
  currentStep?: number;
  profileData?: Partial<OnboardingProfileData>;
  organizationData?: Partial<OnboardingOrganizationData>;
  farmData?: Partial<OnboardingFarmData>;
  moduleSelection?: Partial<OnboardingModuleSelection>;
  preferences?: Partial<OnboardingPreferences>;
  existingOrgId?: string | null;
  existingFarmId?: string | null;
}

export interface CheckSlugAvailabilityResponse {
  available: boolean;
  slug: string;
  suggestion?: string;
  error?: string;
}

export const onboardingApi = {
  async checkSlugAvailability(slug: string): Promise<CheckSlugAvailabilityResponse> {
    return apiClient.get<CheckSlugAvailabilityResponse>(`${BASE_URL}/check-slug?slug=${encodeURIComponent(slug)}`);
  },

  async getState(): Promise<OnboardingState | null> {
    try {
      return await apiClient.get<OnboardingState>(`${BASE_URL}/state`);
    } catch {
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
  async clearState(): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`${BASE_URL}/state`);
  },

  /**
   * Save user profile data (Step 1)
   */
  async saveProfile(data: OnboardingProfileData): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`${BASE_URL}/profile`, data);
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
  async saveFarm(data: OnboardingFarmData, existingFarmId?: string): Promise<{ id: string }> {
    return apiClient.post<{ id: string }>(`${BASE_URL}/farm`, { ...data, existingFarmId });
  },

  /**
   * Save selected modules (Step 4)
   */
  async saveModules(moduleSelection: OnboardingModuleSelection): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`${BASE_URL}/modules`, { moduleSelection });
  },

  /**
   * Save preferences and complete onboarding (Step 5)
   * @param organizationId — pass the org created during onboarding so headers are correct before app shell hydrates the org store.
   */
  async savePreferencesAndComplete(
    data: OnboardingPreferences,
    organizationId?: string | null,
  ): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`${BASE_URL}/complete`, data, {}, organizationId ?? undefined);
  },

  /**
   * Complete onboarding (marks onboarding as completed)
   */
  async completeOnboarding(): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`${BASE_URL}/complete`, {});
  },
};
