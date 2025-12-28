import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/organizations';

export type DocumentType = 'invoice' | 'quote' | 'sales_order' | 'purchase_order' | 'report' | 'general';

export interface DocumentTemplate {
  id: string;
  organization_id: string;
  name: string;
  document_type: DocumentType;
  description: string | null;
  html_content: string;
  css_styles: string | null;
  header_html: string | null;
  footer_html: string | null;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentTemplateDto {
  name: string;
  document_type: DocumentType;
  description?: string;
  html_content: string;
  css_styles?: string;
  header_html?: string;
  footer_html?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export interface UpdateDocumentTemplateDto {
  name?: string;
  document_type?: DocumentType;
  description?: string;
  html_content?: string;
  css_styles?: string;
  header_html?: string;
  footer_html?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export const documentTemplatesApi = {
  async getAll(
    documentType?: DocumentType,
    organizationId?: string,
  ): Promise<DocumentTemplate[]> {
    const params = documentType ? `?document_type=${documentType}` : '';
    return apiClient.get<DocumentTemplate[]>(
      `${BASE_URL}/${organizationId}/document-templates${params}`,
      {},
      organizationId,
    );
  },

  async getOne(
    templateId: string,
    organizationId?: string,
  ): Promise<DocumentTemplate> {
    return apiClient.get<DocumentTemplate>(
      `${BASE_URL}/${organizationId}/document-templates/${templateId}`,
      {},
      organizationId,
    );
  },

  async getDefault(
    documentType: DocumentType,
    organizationId?: string,
  ): Promise<DocumentTemplate | null> {
    return apiClient.get<DocumentTemplate | null>(
      `${BASE_URL}/${organizationId}/document-templates/default/${documentType}`,
      {},
      organizationId,
    );
  },

  async create(
    data: CreateDocumentTemplateDto,
    organizationId?: string,
  ): Promise<DocumentTemplate> {
    return apiClient.post<DocumentTemplate>(
      `${BASE_URL}/${organizationId}/document-templates`,
      data,
      {},
      organizationId,
    );
  },

  async update(
    templateId: string,
    data: UpdateDocumentTemplateDto,
    organizationId?: string,
  ): Promise<DocumentTemplate> {
    return apiClient.patch<DocumentTemplate>(
      `${BASE_URL}/${organizationId}/document-templates/${templateId}`,
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
      `${BASE_URL}/${organizationId}/document-templates/${templateId}`,
      {},
      organizationId,
    );
  },

  async setDefault(
    templateId: string,
    organizationId?: string,
  ): Promise<DocumentTemplate> {
    return apiClient.post<DocumentTemplate>(
      `${BASE_URL}/${organizationId}/document-templates/${templateId}/set-default`,
      {},
      {},
      organizationId,
    );
  },

  async duplicate(
    templateId: string,
    newName?: string,
    organizationId?: string,
  ): Promise<DocumentTemplate> {
    return apiClient.post<DocumentTemplate>(
      `${BASE_URL}/${organizationId}/document-templates/${templateId}/duplicate`,
      { name: newName },
      {},
      organizationId,
    );
  },
};
