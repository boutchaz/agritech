import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/banners';

export type BannerSeverity = 'info' | 'success' | 'warning' | 'critical';
export type BannerAudience = 'all' | 'admins' | 'managers' | 'growers';

export interface Banner {
  id: string;
  organization_id: string;
  title: string;
  message: string;
  severity: BannerSeverity;
  audience: BannerAudience;
  enabled: boolean;
  dismissible: boolean;
  cta_label?: string;
  cta_url?: string;
  priority: number;
  start_at?: string;
  end_at?: string;
  impressions: number;
  dismissals: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBannerInput {
  title: string;
  message: string;
  severity?: BannerSeverity;
  audience?: BannerAudience;
  enabled?: boolean;
  dismissible?: boolean;
  cta_label?: string;
  cta_url?: string;
  priority?: number;
  start_at?: string;
  end_at?: string;
}

export type UpdateBannerInput = Partial<CreateBannerInput>;

export const bannersApi = {
  async getAll(organizationId?: string) {
    return apiClient.get<{ data: Banner[] }>(BASE_URL, {}, organizationId);
  },

  async getActive(organizationId?: string) {
    return apiClient.get<Banner[]>(`${BASE_URL}/active`, {}, organizationId);
  },

  async getOne(id: string, organizationId?: string) {
    return apiClient.get<Banner>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  async create(data: CreateBannerInput, organizationId?: string) {
    return apiClient.post<Banner>(BASE_URL, data, {}, organizationId);
  },

  async update(id: string, data: UpdateBannerInput, organizationId?: string) {
    return apiClient.patch<Banner>(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  async delete(id: string, organizationId?: string) {
    return apiClient.delete<void>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  async dismiss(id: string, organizationId?: string) {
    return apiClient.post<void>(`${BASE_URL}/${id}/dismiss`, {}, {}, organizationId);
  },
};
