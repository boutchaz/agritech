import { apiClient, getApiHeaders } from '../api-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone?: string;
  onboarding_completed?: boolean;
  timezone: string;
  language: string;
  dark_mode?: boolean;
  experience_level?: string;
  dismissed_hints?: string[];
  feature_usage?: Record<string, unknown>;
  notification_preferences?: Record<string, boolean>;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateUserProfileInput {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string | null;
  timezone?: string;
  language?: string;
  dark_mode?: boolean;
  experience_level?: string;
  dismissed_hints?: string[];
  feature_usage?: Record<string, unknown>;
  notification_preferences?: Record<string, boolean>;
  onboarding_completed?: boolean;
  password_set?: boolean;
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
const AUTH_URL = '/api/v1/auth';

export const usersApi = {
  async getMe(): Promise<UserProfile> {
    return apiClient.get<UserProfile>(`${BASE_URL}/me`);
  },

  async updateMe(data: UpdateUserProfileInput): Promise<UserProfile> {
    return apiClient.patch<UserProfile>(`${BASE_URL}/me`, data);
  },

  async getMyOrganizations(): Promise<OrganizationWithRole[]> {
    return apiClient.get<OrganizationWithRole[]>(`${BASE_URL}/me/organizations`);
  },

  async trackActivity(): Promise<void> {
    return apiClient.post<void>(`${BASE_URL}/me/activity`, {});
  },

  async changePassword(newPassword: string): Promise<{ success: boolean }> {
    return apiClient.post<{ success: boolean }>(`${AUTH_URL}/change-password`, { newPassword });
  },

  async uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const headers = await getApiHeaders();
    const formData = new FormData();
    formData.append('file', file);

    // Remove Content-Type so browser sets multipart boundary automatically
    const { 'Content-Type': _, ...headersWithoutContentType } = headers as Record<string, string>;

    const response = await fetch(`${API_URL}${BASE_URL}/me/avatar`, {
      method: 'POST',
      headers: headersWithoutContentType,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Failed to upload avatar');
    }

    return response.json();
  },

  async removeAvatar(): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`${BASE_URL}/me/avatar`);
  },
};
