import { apiClient } from '../api-client';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
type BankAccount = Tables['bank_accounts']['Row'];

export interface BankAccountFilters {
  is_active?: boolean;
  search?: string;
}

export interface CreateBankAccountInput {
  account_name: string;
  account_number?: string;
  bank_name?: string;
  branch_name?: string;
  swift_code?: string;
  iban?: string;
  currency_code?: string;
  opening_balance?: number;
  current_balance?: number;
  gl_account_id?: string;
  is_active?: boolean;
}

export interface UpdateBankAccountInput {
  account_name?: string;
  account_number?: string;
  bank_name?: string;
  branch_name?: string;
  swift_code?: string;
  iban?: string;
  currency_code?: string;
  opening_balance?: number;
  current_balance?: number;
  gl_account_id?: string;
  is_active?: boolean;
}

export const bankAccountsApi = {
  async getAll(filters?: BankAccountFilters): Promise<BankAccount[]> {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.search) params.append('search', filters.search);
    const queryString = params.toString();
    return apiClient.get<BankAccount[]>(`/bank-accounts${queryString ? `?${queryString}` : ''}`);
  },

  async getOne(id: string): Promise<BankAccount> {
    return apiClient.get<BankAccount>(`/bank-accounts/${id}`);
  },

  async create(data: CreateBankAccountInput): Promise<BankAccount> {
    return apiClient.post<BankAccount>('/bank-accounts', data);
  },

  async update(id: string, data: UpdateBankAccountInput): Promise<BankAccount> {
    return apiClient.patch<BankAccount>(`/bank-accounts/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/bank-accounts/${id}`);
  },
};
