import { apiClient } from '../api-client';

const BASE = '/api/v1/admin/referentials';

export interface ReferentialSummary {
  crop: string;
  version: string;
  date: string;
  sections: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export const referentialsApi = {
  list: () => apiClient.get<ReferentialSummary[]>(BASE),
  get: (crop: string) => apiClient.get<Record<string, unknown>>(`${BASE}/${crop}`),
  getSection: (crop: string, section: string) =>
    apiClient.get<unknown>(`${BASE}/${crop}/${section}`),
  updateSection: (crop: string, section: string, data: unknown) =>
    apiClient.put(`${BASE}/${crop}/${section}`, data),
  update: (crop: string, data: Record<string, unknown>) =>
    apiClient.put(`${BASE}/${crop}`, data),
  validate: (crop: string, data: Record<string, unknown>) =>
    apiClient.post<ValidationResult>(`${BASE}/${crop}/validate`, data),
};
