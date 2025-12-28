import { apiClient } from '../api-client';
import type {
  OpeningStockBalance,
  CreateOpeningStockInput,
  UpdateOpeningStockInput,
  OpeningStockFilters,
  StockAccountMapping,
  CreateStockAccountMappingInput,
  UpdateStockAccountMappingInput,
} from '@/types/opening-stock';

const BASE_URL = '/api/v1/stock-entries';

function buildQueryString(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export const openingStockApi = {
  async getOpeningBalances(
    filters: OpeningStockFilters = {},
    organizationId?: string,
  ): Promise<OpeningStockBalance[]> {
    const url = `${BASE_URL}/opening-balances${buildQueryString(filters)}`;
    return apiClient.get<OpeningStockBalance[]>(url, {}, organizationId);
  },

  async getOpeningBalance(
    id: string,
    organizationId?: string,
  ): Promise<OpeningStockBalance> {
    return apiClient.get<OpeningStockBalance>(
      `${BASE_URL}/opening-balances/${id}`,
      {},
      organizationId,
    );
  },

  async createOpeningBalance(
    data: CreateOpeningStockInput,
    organizationId?: string,
  ): Promise<OpeningStockBalance> {
    return apiClient.post<OpeningStockBalance>(
      `${BASE_URL}/opening-balances`,
      data,
      {},
      organizationId,
    );
  },

  async updateOpeningBalance(
    id: string,
    data: UpdateOpeningStockInput,
    organizationId?: string,
  ): Promise<OpeningStockBalance> {
    return apiClient.patch<OpeningStockBalance>(
      `${BASE_URL}/opening-balances/${id}`,
      data,
      {},
      organizationId,
    );
  },

  async postOpeningBalance(
    id: string,
    organizationId?: string,
  ): Promise<{ journal_entry_id: string }> {
    return apiClient.post<{ journal_entry_id: string }>(
      `${BASE_URL}/opening-balances/${id}/post`,
      {},
      {},
      organizationId,
    );
  },

  async cancelOpeningBalance(
    id: string,
    organizationId?: string,
  ): Promise<OpeningStockBalance> {
    return apiClient.patch<OpeningStockBalance>(
      `${BASE_URL}/opening-balances/${id}/cancel`,
      {},
      {},
      organizationId,
    );
  },

  async deleteOpeningBalance(
    id: string,
    organizationId?: string,
  ): Promise<void> {
    return apiClient.delete<void>(
      `${BASE_URL}/opening-balances/${id}`,
      {},
      organizationId,
    );
  },

  async getAccountMappings(
    organizationId?: string,
  ): Promise<StockAccountMapping[]> {
    return apiClient.get<StockAccountMapping[]>(
      `${BASE_URL}/account-mappings`,
      {},
      organizationId,
    );
  },

  async createAccountMapping(
    data: CreateStockAccountMappingInput,
    organizationId?: string,
  ): Promise<StockAccountMapping> {
    return apiClient.post<StockAccountMapping>(
      `${BASE_URL}/account-mappings`,
      data,
      {},
      organizationId,
    );
  },

  async updateAccountMapping(
    id: string,
    data: UpdateStockAccountMappingInput,
    organizationId?: string,
  ): Promise<StockAccountMapping> {
    return apiClient.patch<StockAccountMapping>(
      `${BASE_URL}/account-mappings/${id}`,
      data,
      {},
      organizationId,
    );
  },

  async deleteAccountMapping(
    id: string,
    organizationId?: string,
  ): Promise<void> {
    return apiClient.delete<void>(
      `${BASE_URL}/account-mappings/${id}`,
      {},
      organizationId,
    );
  },
};
