import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/organizations';

export type DocumentType = 'invoice' | 'quote' | 'sales_order' | 'purchase_order' | 'report' | 'general';

/** Matches Nest/DB document_templates row + optional legacy html fields */
export interface DocumentTemplate {
  id: string;
  organization_id: string;
  name: string;
  document_type: DocumentType;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  html_content?: string | null;
  css_styles?: string | null;
  header_html?: string | null;
  footer_html?: string | null;
  header_enabled?: boolean;
  header_height?: number;
  header_logo_url?: string | null;
  header_logo_position?: string | null;
  header_logo_width?: number;
  header_logo_height?: number;
  header_company_name?: boolean;
  header_company_info?: boolean;
  header_custom_text?: string | null;
  header_background_color?: string | null;
  header_text_color?: string | null;
  header_border_bottom?: boolean;
  header_border_color?: string | null;
  footer_enabled?: boolean;
  footer_height?: number;
  footer_text?: string | null;
  footer_position?: string | null;
  footer_include_company_info?: boolean;
  footer_custom_text?: string | null;
  footer_background_color?: string | null;
  footer_text_color?: string | null;
  footer_border_top?: boolean;
  footer_border_color?: string | null;
  footer_font_size?: number;
  page_margin_top?: number;
  page_margin_bottom?: number;
  page_margin_left?: number;
  page_margin_right?: number;
  accent_color?: string | null;
  secondary_color?: string | null;
  font_family?: string | null;
  title_font_size?: number;
  heading_font_size?: number;
  body_font_size?: number;
  table_header_bg_color?: string | null;
  table_header_text_color?: string | null;
  table_row_alt_color?: string | null;
  table_border_color?: string | null;
  show_tax_id?: boolean;
  show_terms?: boolean;
  show_notes?: boolean;
  show_payment_info?: boolean;
  show_bank_details?: boolean;
  show_qr_code?: boolean;
  terms_content?: string | null;
  payment_terms_content?: string | null;
  bank_details_content?: string | null;
  watermark_enabled?: boolean;
  watermark_text?: string | null;
  watermark_opacity?: number;
}

export interface CreateDocumentTemplateDto {
  name: string;
  document_type: DocumentType;
  description?: string;
  html_content?: string;
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
    const res = await apiClient.get<
      | DocumentTemplate[]
      | { data: DocumentTemplate[]; total: number; page: number; pageSize: number; totalPages: number }
    >(
      `${BASE_URL}/${organizationId}/document-templates${params}`,
      {},
      organizationId,
    );
    return Array.isArray(res) ? res : res.data ?? [];
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
