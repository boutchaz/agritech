import { apiClient } from '../api-client';

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
  timezone: string;
  language: string;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateUserProfileInput {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  timezone?: string;
  language?: string;
}

export interface OrganizationWithRole {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_id?: string;
  logo_url?: string;
  currency_code: string;
  timezone: string;
  is_active: boolean;
  role: string;
  role_display_name: string;
  role_level: number;
}

const BASE_URL = '/api/v1/users';

export const usersApi = {
  /**
   * Get current user profile
   */
  async getMe(): Promise<UserProfile> {
    return apiClient.get<UserProfile>(`${BASE_URL}/me`);
  },

  /**
   * Update current user profile
   */
  async updateMe(data: UpdateUserProfileInput): Promise<UserProfile> {
    return apiClient.patch<UserProfile>(`${BASE_URL}/me`, data);
  },

  /**
   * Get all organizations that the current user belongs to
   */
  async getMyOrganizations(): Promise<OrganizationWithRole[]> {
    return apiClient.get<OrganizationWithRole[]>(`${BASE_URL}/me/organizations`);
  },

  /**
   * Update user activity timestamp for live dashboard tracking
   * This is a lightweight endpoint that just touches the updated_at timestamp
   */
  async trackActivity(): Promise<void> {
    return apiClient.post<void>(`${BASE_URL}/me/activity`, {});
  },
};
