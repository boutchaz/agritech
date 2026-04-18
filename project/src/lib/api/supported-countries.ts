import { apiClient } from '../api-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const ADMIN_URL = '/api/v1/admin/supported-countries';
const PUBLIC_URL = '/api/v1/supported-countries';

export interface SupportedCountry {
  id: string;
  country_code: string;
  country_name: string;
  region: string;
  enabled: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateSupportedCountryInput {
  country_code: string;
  country_name: string;
  region: string;
  enabled?: boolean;
  display_order?: number;
}

export interface UpdateSupportedCountryInput {
  country_name?: string;
  region?: string;
  enabled?: boolean;
  display_order?: number;
}

export const supportedCountriesApi = {
  /** Public endpoint — no auth needed, uses raw fetch to skip auth headers */
  async getEnabled(): Promise<SupportedCountry[]> {
    const res = await fetch(`${API_URL}${PUBLIC_URL}`);
    if (!res.ok) throw new Error('Failed to fetch supported countries');
    return res.json();
  },

  /** Admin endpoint — returns all countries (enabled + disabled) */
  async getAll() {
    return apiClient.get<SupportedCountry[]>(ADMIN_URL);
  },

  async create(data: CreateSupportedCountryInput) {
    return apiClient.post<SupportedCountry>(ADMIN_URL, data);
  },

  async update(id: string, data: UpdateSupportedCountryInput) {
    return apiClient.put<SupportedCountry>(`${ADMIN_URL}/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete<void>(`${ADMIN_URL}/${id}`);
  },

  async toggle(id: string, enabled: boolean) {
    return apiClient.put<SupportedCountry>(`${ADMIN_URL}/${id}/toggle`, { enabled });
  },
};
