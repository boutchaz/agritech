import { apiClient } from '../api-client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  currency_code: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string;
  currency_code?: string;
  timezone?: string;
  is_active?: boolean;
}

const BASE_URL = '/api/v1/organizations';

export const organizationsApi = {
  /**
   * Get organization by ID
   */
  async getOne(id: string): Promise<Organization> {
    return apiClient.get<Organization>(`${BASE_URL}/${id}`);
  },

  /**
   * Update organization
   */
  async update(id: string, data: UpdateOrganizationInput): Promise<Organization> {
    return apiClient.patch<Organization>(`${BASE_URL}/${id}`, data);
  },
};
