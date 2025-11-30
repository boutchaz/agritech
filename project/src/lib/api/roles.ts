import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/roles';

export interface Role {
  id: string;
  name: string;
  display_name: string;
  level: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const rolesApi = {
  /**
   * Get all active roles
   */
  async getAll(): Promise<Role[]> {
    return apiClient.get<Role[]>(BASE_URL);
  },

  /**
   * Get a single role by ID
   */
  async getOne(id: string): Promise<Role> {
    return apiClient.get<Role>(`${BASE_URL}/${id}`);
  },

  /**
   * Get a role by name
   */
  async getByName(name: string): Promise<Role> {
    return apiClient.get<Role>(`${BASE_URL}/name/${name}`);
  },
};
