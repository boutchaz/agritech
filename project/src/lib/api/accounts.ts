import { apiClient } from '../api-client';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
type Account = Tables['accounts']['Row'];

export const accountsApi = {
  async getAll(organizationId: string): Promise<Account[]> {
    return apiClient.get<Account[]>(`/api/v1/accounts`, {}, organizationId);
  },

  async getById(accountId: string, organizationId?: string): Promise<Account> {
    return apiClient.get<Account>(`/api/v1/accounts/${accountId}`, {}, organizationId);
  },

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
  }, organizationId?: string): Promise<Account> {
    return apiClient.post<Account>(`/api/v1/accounts`, account, {}, organizationId);
  },

  async update(accountId: string, updates: Partial<Account>, organizationId?: string): Promise<Account> {
    return apiClient.patch<Account>(`/api/v1/accounts/${accountId}`, updates, {}, organizationId);
  },

  async delete(accountId: string, organizationId?: string): Promise<void> {
    await apiClient.delete(`/api/v1/accounts/${accountId}`, {}, organizationId);
  },

  async seedMoroccanChart(organizationId: string): Promise<{
    accounts_created: number;
    success: boolean;
    message: string;
  }> {
    return apiClient.post(`/api/v1/accounts/seed-moroccan-chart`, {}, {}, organizationId);
  },
};
