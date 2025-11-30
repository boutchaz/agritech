import { apiClient } from '../api-client';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
type Account = Tables['accounts']['Row'];

/**
 * Accounts API Client
 * Handles chart of accounts operations
 */
export const accountsApi = {
  /**
   * Get all accounts for an organization
   */
  async getAll(_organizationId: string): Promise<Account[]> {
    return apiClient.get<Account[]>(`/api/v1/accounts`, {
      params: { is_active: 'true' }
    });
  },

  /**
   * Get a single account by ID
   */
  async getById(accountId: string): Promise<Account> {
    return apiClient.get<Account>(`/api/v1/accounts/${accountId}`);
  },

  /**
   * Create a new account
   */
  async create(account: {
    code: string;
    name: string;
    account_type: string;
    account_subtype: string;
    is_group: boolean;
    is_active: boolean;
    parent_code?: string;
    currency_code: string;
    description_fr?: string;
    description_ar?: string;
  }): Promise<Account> {
    return apiClient.post<Account>(`/api/v1/accounts`, account);
  },

  /**
   * Update an existing account
   */
  async update(accountId: string, updates: Partial<Account>): Promise<Account> {
    return apiClient.patch<Account>(`/api/v1/accounts/${accountId}`, updates);
  },

  /**
   * Delete an account
   */
  async delete(accountId: string): Promise<void> {
    await apiClient.delete(`/api/v1/accounts/${accountId}`);
  },

  /**
   * Seed Moroccan Chart of Accounts
   */
  async seedMoroccanChart(_organizationId: string): Promise<{
    accounts_created: number;
    success: boolean;
    message: string;
  }> {
    return apiClient.post(`/api/v1/accounts/seed-moroccan-chart`, {});
  },
};
