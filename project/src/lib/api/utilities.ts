import { apiClient } from '../api-client';
import { requireOrganizationId } from './createCrudApi';

export type UtilityType = 'electricity' | 'water' | 'diesel' | 'gas' | 'internet' | 'phone' | 'other';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';
export type RecurringFrequency = 'monthly' | 'quarterly' | 'yearly';

export interface Utility {
  id: string;
  farm_id: string;
  type: UtilityType;
  provider?: string;
  account_number?: string;
  amount: number;
  consumption_value?: number;
  consumption_unit?: string;
  billing_date: string;
  due_date?: string;
  payment_status: PaymentStatus;
  is_recurring?: boolean;
  recurring_frequency?: RecurringFrequency;
  invoice_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  journal_entry_id?: string | null;
}

export interface CreateUtilityInput {
  farm_id: string;
  type: UtilityType;
  provider?: string;
  account_number?: string;
  amount: number;
  consumption_value?: number;
  consumption_unit?: string;
  billing_date: string;
  due_date?: string;
  payment_status: PaymentStatus;
  is_recurring?: boolean;
  recurring_frequency?: RecurringFrequency;
  invoice_url?: string;
  notes?: string;
  journal_entry_id?: string;
}

export type UpdateUtilityInput = Partial<CreateUtilityInput>;

export interface Account {
  id: string;
  code: string;
  name: string;
}

export const utilitiesApi = {
  /**
   * Get all utilities for a farm
   */
  async getAll(farmId: string, organizationId?: string): Promise<Utility[]> {
    requireOrganizationId(organizationId, 'utilitiesApi.getAll');
    return apiClient.get<Utility[]>(`/api/v1/organizations/${organizationId}/farms/${farmId}/utilities`);
  },

  /**
   * Get a single utility by ID
   */
  async getOne(utilityId: string, farmId: string, organizationId?: string): Promise<Utility> {
    requireOrganizationId(organizationId, 'utilitiesApi.getOne');
    return apiClient.get<Utility>(`/api/v1/organizations/${organizationId}/farms/${farmId}/utilities/${utilityId}`);
  },

  // Alias for backwards compatibility
  async getById(organizationId: string, farmId: string, utilityId: string): Promise<Utility> {
    return this.getOne(utilityId, farmId, organizationId);
  },

  /**
   * Create a new utility
   */
  async create(data: CreateUtilityInput, organizationId?: string): Promise<Utility> {
    requireOrganizationId(organizationId, 'utilitiesApi.create');
    return apiClient.post<Utility>(`/api/v1/organizations/${organizationId}/farms/${data.farm_id}/utilities`, data);
  },

  /**
   * Update a utility
   */
  async update(utilityId: string, data: UpdateUtilityInput, farmId: string, organizationId?: string): Promise<Utility> {
    requireOrganizationId(organizationId, 'utilitiesApi.update');
    return apiClient.patch<Utility>(`/api/v1/organizations/${organizationId}/farms/${farmId}/utilities/${utilityId}`, data);
  },

  /**
   * Delete a utility
   */
  async delete(organizationId: string, farmId: string, utilityId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/v1/organizations/${organizationId}/farms/${farmId}/utilities/${utilityId}`);
  },

  /**
   * Get account by type for journal entries
   */
  async getAccountByType(
    organizationId: string,
    farmId: string,
    accountType: string,
    accountSubtype?: string,
  ): Promise<Account> {
    const params = new URLSearchParams({ accountType });
    if (accountSubtype) params.append('accountSubtype', accountSubtype);
    return apiClient.get<Account>(
      `/api/v1/organizations/${organizationId}/farms/${farmId}/utilities/accounts/by-type?${params.toString()}`
    );
  },
};
