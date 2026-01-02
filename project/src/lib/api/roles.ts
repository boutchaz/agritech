import { createCrudApi } from './createCrudApi';
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

export interface RoleFilters {
  is_active?: boolean;
}

export interface CreateRoleInput {
  name: string;
  display_name: string;
  level: number;
  is_active?: boolean;
}

export type UpdateRoleInput = Partial<CreateRoleInput>;

// Base CRUD operations
const baseCrud = createCrudApi<Role, CreateRoleInput, RoleFilters>(BASE_URL);

// Extended API with additional methods
export const rolesApi = {
  ...baseCrud,

  /**
   * Get a role by name
   */
  async getByName(name: string): Promise<Role> {
    return apiClient.get<Role>(`${BASE_URL}/name/${name}`);
  },
};
