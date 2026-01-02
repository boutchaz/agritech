import { createCrudApi } from './createCrudApi';
import { apiClient } from '../api-client';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
export type Account = Tables['accounts']['Row'];

export interface AccountFilters {
  account_type?: string;
  is_active?: boolean;
  search?: string;
}

export interface CreateAccountInput {
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
}

export type UpdateAccountInput = Partial<CreateAccountInput>;

// Base CRUD operations
const baseCrud = createCrudApi<Account, CreateAccountInput, AccountFilters>('/api/v1/accounts');

// Extended API with additional methods
export const accountsApi = {
  ...baseCrud,
  // Alias getOne as getById for backward compatibility
  getById: baseCrud.getOne,

  async seedMoroccanChart(organizationId: string): Promise<{
    accounts_created: number;
    success: boolean;
    message: string;
  }> {
    return apiClient.post(`/api/v1/accounts/seed-moroccan-chart`, {}, {}, organizationId);
  },
};
