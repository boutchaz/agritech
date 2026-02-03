import { apiClient } from '../api-client';

export interface AccountMapping {
  id: string;
  organization_id: string;
  country_code?: string;
  accounting_standard?: string;
  mapping_type: string;
  mapping_key?: string;
  source_key?: string;
  account_code?: string;
  account_id?: string;
  description?: string | null;
  is_active?: boolean;
  metadata?: Record<string, any>;
  created_at?: string;
  account?: {
    id: string;
    code: string;
    name: string;
    account_type: string;
  };
}

export interface AccountMappingFilters {
  mapping_type?: string;
  is_active?: boolean;
  search?: string;
}

export interface AccountMappingOptions {
  types: string[];
  keys_by_type: Record<string, string[]>;
}

export interface CreateAccountMappingInput {
  mapping_type: string;
  mapping_key?: string;
  source_key?: string;
  account_id: string;
  is_active?: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdateAccountMappingInput {
  mapping_type?: string;
  mapping_key?: string;
  source_key?: string;
  account_id?: string;
  is_active?: boolean;
  description?: string;
  metadata?: Record<string, any>;
}

export const accountMappingsApi = {
  async getAll(filters?: AccountMappingFilters, organizationId?: string): Promise<AccountMapping[]> {
    const params = new URLSearchParams();
    if (filters?.mapping_type) params.append('mapping_type', filters.mapping_type);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.search) params.append('search', filters.search);
    const queryString = params.toString();
    return apiClient.get<AccountMapping[]>(
      `/account-mappings${queryString ? `?${queryString}` : ''}`,
      organizationId
    );
  },

  async getOne(id: string, organizationId?: string): Promise<AccountMapping> {
    return apiClient.get<AccountMapping>(`/account-mappings/${id}`, organizationId);
  },

  async getMappingTypes(organizationId?: string): Promise<string[]> {
    return apiClient.get<string[]>('/account-mappings/types', organizationId);
  },

  async getMappingOptions(organizationId?: string): Promise<AccountMappingOptions> {
    return apiClient.get<AccountMappingOptions>('/account-mappings/options', organizationId);
  },

  async create(data: CreateAccountMappingInput, organizationId?: string): Promise<AccountMapping> {
    return apiClient.post<AccountMapping>('/account-mappings', data, organizationId);
  },

  async update(id: string, data: UpdateAccountMappingInput, organizationId?: string): Promise<AccountMapping> {
    return apiClient.patch<AccountMapping>(`/account-mappings/${id}`, data, organizationId);
  },

  async delete(id: string, organizationId?: string): Promise<void> {
    await apiClient.delete(`/account-mappings/${id}`, organizationId);
  },

  async initializeDefaults(countryCode: string, organizationId?: string): Promise<{ message: string; count: number }> {
    return apiClient.post<{ message: string; count: number }>(
      `/account-mappings/initialize?country_code=${countryCode}`,
      {},
      organizationId
    );
  },
};
