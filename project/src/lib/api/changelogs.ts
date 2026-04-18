import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/changelogs';

export type ChangelogCategory = 'feature' | 'improvement' | 'fix' | 'breaking' | 'infra';

export interface Changelog {
  id: string;
  organization_id?: string;
  title: string;
  description: string;
  version?: string;
  category: ChangelogCategory;
  published_at: string;
  is_global: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateChangelogInput {
  title: string;
  description: string;
  version?: string;
  category?: ChangelogCategory;
  published_at?: string;
  is_global?: boolean;
}

export type UpdateChangelogInput = Partial<CreateChangelogInput>;

export const changelogsApi = {
  async getAll(organizationId?: string) {
    return apiClient.get<{ data: Changelog[] }>(BASE_URL, {}, organizationId);
  },

  async getOne(id: string, organizationId?: string) {
    return apiClient.get<Changelog>(`${BASE_URL}/${id}`, {}, organizationId);
  },

  async create(data: CreateChangelogInput, organizationId?: string) {
    return apiClient.post<Changelog>(BASE_URL, data, {}, organizationId);
  },

  async update(id: string, data: UpdateChangelogInput, organizationId?: string) {
    return apiClient.patch<Changelog>(`${BASE_URL}/${id}`, data, {}, organizationId);
  },

  async delete(id: string, organizationId?: string) {
    return apiClient.delete<void>(`${BASE_URL}/${id}`, {}, organizationId);
  },
};
