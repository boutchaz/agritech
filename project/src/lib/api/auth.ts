import { apiClient } from '../api-client';

export interface RoleInfo {
  name: string;
  display_name: string;
  level: number;
}

export interface AbilityRule {
  action: string;
  subject: string;
  inverted?: boolean;
}

export interface UserAbilities {
  role: RoleInfo | null;
  abilities: AbilityRule[];
}

const AUTH_BASE_URL = '/api/v1/auth';

export const authApi = {
  /**
   * Get CASL abilities for the current user in the given organization
   * This is the single source of truth for permissions
   */
  async getAbilities(organizationId: string): Promise<UserAbilities> {
    return apiClient.get<UserAbilities>(
      `${AUTH_BASE_URL}/me/abilities`,
      {},
      organizationId
    );
  },

  /**
   * Get user role and permissions (legacy format)
   */
  async getRoleAndPermissions(organizationId: string): Promise<{
    role: { role_name: string; role_display_name: string; role_level: number } | null;
    permissions: Array<{ permission_name: string; resource: string; action: string }>;
  }> {
    return apiClient.get(
      `${AUTH_BASE_URL}/me/role`,
      {},
      organizationId
    );
  },
};
