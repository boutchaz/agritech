import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/organization-users';

export interface AssignableUser {
  user_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  organization_id: string;
  role: string;
  worker_id: string | null;
  worker_position: string | null;
  user_type: 'worker' | 'user';
}

export interface OrganizationUser {
  user_id: string;
  organization_id: string;
  role_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface OrganizationUserFilters {
  is_active?: boolean;
}

export interface CreateOrganizationUserInput {
  user_id: string;
  role_id: string;
  is_active?: boolean;
}

export type UpdateOrganizationUserInput = Partial<CreateOrganizationUserInput>;

export const organizationUsersApi = {
  /**
   * Get all organization users with optional filters
   */
  async getAll(filters?: OrganizationUserFilters, organizationId?: string) {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));

    const url = `${BASE_URL}${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get(url, {}, organizationId);
  },

  /**
   * Get assignable users (users who can be assigned to tasks)
   * Excludes viewers and day_laborers
   */
  async getAssignableUsers(organizationId?: string): Promise<AssignableUser[]> {
    return apiClient.get(`${BASE_URL}/assignable`, {}, organizationId);
  },

  /**
   * Get a single organization user by user ID
   */
  async getOne(userId: string, organizationId?: string) {
    return apiClient.get(`${BASE_URL}/${userId}`, {}, organizationId);
  },

  /**
   * Add a user to an organization
   */
  async create(data: CreateOrganizationUserInput, organizationId?: string) {
    return apiClient.post(BASE_URL, data, {}, organizationId);
  },

  /**
   * Update an organization user's role or status
   */
  async update(userId: string, data: UpdateOrganizationUserInput, organizationId?: string) {
    return apiClient.patch(`${BASE_URL}/${userId}`, data, {}, organizationId);
  },

  /**
   * Remove a user from an organization
   */
  async delete(userId: string, organizationId?: string) {
    return apiClient.delete(`${BASE_URL}/${userId}`, {}, organizationId);
  },
};
