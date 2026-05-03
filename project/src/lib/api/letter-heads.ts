import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/organizations';

export interface LetterHead {
  id: string;
  organization_id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  content: string | null;
  footer_content: string | null;
  logo_url: string | null;
  logo_position: string | null;
  logo_width: number;
  logo_height: number;
  company_name: string | null;
  company_info: string | null;
  custom_text: string | null;
  font_family: string | null;
  font_size: number;
  text_color: string | null;
  accent_color: string | null;
  background_color: string | null;
  disable_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLetterHeadDto {
  name: string;
  content?: string;
  footer_content?: string;
  logo_url?: string;
  logo_position?: string;
  logo_width?: number;
  logo_height?: number;
  company_name?: string;
  company_info?: string;
  custom_text?: string;
  font_family?: string;
  font_size?: number;
  text_color?: string;
  accent_color?: string;
  background_color?: string;
  disable_default?: boolean;
  is_default?: boolean;
  is_active?: boolean;
}

export type UpdateLetterHeadDto = Partial<CreateLetterHeadDto>;

export const letterHeadsApi = {
  async getAll(organizationId?: string): Promise<LetterHead[]> {
    const res = await apiClient.get<
      | LetterHead[]
      | { data: LetterHead[]; total: number; page: number; pageSize: number; totalPages: number }
    >(
      `${BASE_URL}/${organizationId}/letter-heads`,
      {},
      organizationId,
    );
    return Array.isArray(res) ? res : res.data ?? [];
  },

  async getOne(letterHeadId: string, organizationId?: string): Promise<LetterHead> {
    return apiClient.get<LetterHead>(
      `${BASE_URL}/${organizationId}/letter-heads/${letterHeadId}`,
      {},
      organizationId,
    );
  },

  async getDefault(organizationId?: string): Promise<LetterHead | null> {
    return apiClient.get<LetterHead | null>(
      `${BASE_URL}/${organizationId}/letter-heads/default`,
      {},
      organizationId,
    );
  },

  async create(data: CreateLetterHeadDto, organizationId?: string): Promise<LetterHead> {
    return apiClient.post<LetterHead>(
      `${BASE_URL}/${organizationId}/letter-heads`,
      data,
      {},
      organizationId,
    );
  },

  async update(letterHeadId: string, data: UpdateLetterHeadDto, organizationId?: string): Promise<LetterHead> {
    return apiClient.patch<LetterHead>(
      `${BASE_URL}/${organizationId}/letter-heads/${letterHeadId}`,
      data,
      {},
      organizationId,
    );
  },

  async delete(letterHeadId: string, organizationId?: string): Promise<void> {
    return apiClient.delete<void>(
      `${BASE_URL}/${organizationId}/letter-heads/${letterHeadId}`,
      {},
      organizationId,
    );
  },

  async setDefault(letterHeadId: string, organizationId?: string): Promise<LetterHead> {
    return apiClient.post<LetterHead>(
      `${BASE_URL}/${organizationId}/letter-heads/${letterHeadId}/set-default`,
      {},
      {},
      organizationId,
    );
  },

  async duplicate(letterHeadId: string, newName?: string, organizationId?: string): Promise<LetterHead> {
    return apiClient.post<LetterHead>(
      `${BASE_URL}/${organizationId}/letter-heads/${letterHeadId}/duplicate`,
      { name: newName },
      {},
      organizationId,
    );
  },
};
