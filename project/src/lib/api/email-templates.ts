import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/organizations';

export type EmailTemplateCategory =
  | 'marketplace'
  | 'invoice'
  | 'quote'
  | 'order'
  | 'task'
  | 'reminder'
  | 'general';

export interface EmailTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  type: string;
  category: EmailTemplateCategory;
  subject: string;
  html_body: string;
  text_body: string | null;
  variables: string[];
  is_system: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEmailTemplateDto {
  name: string;
  description?: string;
  type: string;
  category: EmailTemplateCategory;
  subject: string;
  html_body: string;
  text_body?: string;
  variables?: string[];
  is_active?: boolean;
}

export interface UpdateEmailTemplateDto {
  name?: string;
  description?: string;
  type?: string;
  category?: EmailTemplateCategory;
  subject?: string;
  html_body?: string;
  text_body?: string;
  variables?: string[];
  is_active?: boolean;
}

export const emailTemplatesApi = {
  async getAll(
    category?: EmailTemplateCategory,
    organizationId?: string,
  ): Promise<EmailTemplate[]> {
    const params = category ? `?category=${category}` : '';
    return apiClient.get<EmailTemplate[]>(
      `${BASE_URL}/${organizationId}/email-templates${params}`,
      {},
      organizationId,
    );
  },

  async getOne(
    templateId: string,
    organizationId?: string,
  ): Promise<EmailTemplate> {
    return apiClient.get<EmailTemplate>(
      `${BASE_URL}/${organizationId}/email-templates/${templateId}`,
      {},
      organizationId,
    );
  },

  async create(
    data: CreateEmailTemplateDto,
    organizationId?: string,
  ): Promise<EmailTemplate> {
    return apiClient.post<EmailTemplate>(
      `${BASE_URL}/${organizationId}/email-templates`,
      data,
      {},
      organizationId,
    );
  },

  async update(
    templateId: string,
    data: UpdateEmailTemplateDto,
    organizationId?: string,
  ): Promise<EmailTemplate> {
    return apiClient.patch<EmailTemplate>(
      `${BASE_URL}/${organizationId}/email-templates/${templateId}`,
      data,
      {},
      organizationId,
    );
  },

  async delete(
    templateId: string,
    organizationId?: string,
  ): Promise<void> {
    return apiClient.delete<void>(
      `${BASE_URL}/${organizationId}/email-templates/${templateId}`,
      {},
      organizationId,
    );
  },

  async duplicate(
    templateId: string,
    newName?: string,
    organizationId?: string,
  ): Promise<EmailTemplate> {
    return apiClient.post<EmailTemplate>(
      `${BASE_URL}/${organizationId}/email-templates/${templateId}/duplicate`,
      { name: newName },
      {},
      organizationId,
    );
  },
};
