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
};
