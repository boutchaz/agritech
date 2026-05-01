import { createCrudApi } from './createCrudApi';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
export type BankAccount = Tables['bank_accounts']['Row'];

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

export type UpdateBankAccountInput = Partial<CreateBankAccountInput>;

export const bankAccountsApi = createCrudApi<BankAccount, CreateBankAccountInput, BankAccountFilters>(
  '/api/v1/bank-accounts'
);
