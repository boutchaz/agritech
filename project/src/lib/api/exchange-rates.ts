import { apiClient } from '../api-client';

export interface ExchangeRate {
  id: string;
  organization_id: string | null;
  rate_date: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  source: string;
  created_at: string;
}

export interface ExchangeRateFilters {
  from_currency?: string;
  to_currency?: string;
  from_date?: string;
  to_date?: string;
}

export interface CreateExchangeRateInput {
  rate_date: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  source?: string;
}

export type UpdateExchangeRateInput = Partial<CreateExchangeRateInput>;

export interface RateLookupResult {
  from_currency: string;
  to_currency: string;
  date: string;
  rate: number;
}

export const exchangeRatesApi = {
  async getAll(filters?: ExchangeRateFilters, organizationId?: string): Promise<ExchangeRate[]> {
    const params = new URLSearchParams();
    if (filters?.from_currency) params.append('from_currency', filters.from_currency);
    if (filters?.to_currency) params.append('to_currency', filters.to_currency);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    const qs = params.toString();
    return apiClient.get<ExchangeRate[]>(
      `/api/v1/exchange-rates${qs ? `?${qs}` : ''}`,
      {},
      organizationId,
    );
  },

  async getRate(
    fromCurrency: string,
    toCurrency: string,
    date: string,
    organizationId?: string,
  ): Promise<RateLookupResult> {
    const params = new URLSearchParams({
      from_currency: fromCurrency,
      to_currency: toCurrency,
      date,
    });
    return apiClient.get<RateLookupResult>(
      `/api/v1/exchange-rates/lookup?${params.toString()}`,
      {},
      organizationId,
    );
  },

  async create(data: CreateExchangeRateInput, organizationId?: string): Promise<ExchangeRate> {
    return apiClient.post<ExchangeRate>('/api/v1/exchange-rates', data, {}, organizationId);
  },

  async update(id: string, data: UpdateExchangeRateInput, organizationId?: string): Promise<ExchangeRate> {
    return apiClient.patch<ExchangeRate>(`/api/v1/exchange-rates/${id}`, data, {}, organizationId);
  },

  async delete(id: string, organizationId?: string): Promise<void> {
    await apiClient.delete(`/api/v1/exchange-rates/${id}`, {}, organizationId);
  },
};
