import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/share';

export type ShareableResourceType =
  | 'invoice'
  | 'quote'
  | 'sales_order'
  | 'purchase_order'
  | 'delivery'
  | 'payment';

export type ShareChannel = 'email' | 'whatsapp';

export interface ShareResourcePayload {
  resource_type: ShareableResourceType;
  resource_id: string;
  channel: ShareChannel;
  recipient?: string;
  subject?: string;
  message?: string;
  whatsapp_template?: string;
  whatsapp_language?: string;
  whatsapp_template_params?: string[];
  metadata?: Record<string, unknown>;
  attach_pdf?: boolean;
}

export interface ShareResult {
  success: boolean;
  recipient: string;
  error?: string;
}

export interface ShareLogRow {
  id: string;
  organization_id: string;
  resource_type: ShareableResourceType;
  resource_id: string;
  channel: ShareChannel;
  recipient: string;
  subject: string | null;
  success: boolean;
  error_message: string | null;
  sent_by: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export const shareApi = {
  async listTypes(
    organizationId: string,
  ): Promise<{ types: ShareableResourceType[] }> {
    return apiClient.get(`${BASE_URL}/resource-types`, {}, organizationId);
  },

  async share(
    payload: ShareResourcePayload,
    organizationId: string,
  ): Promise<ShareResult> {
    return apiClient.post(BASE_URL, payload, {}, organizationId);
  },

  async history(
    organizationId: string,
    params?: {
      resource_type?: ShareableResourceType;
      resource_id?: string;
      limit?: number;
    },
  ): Promise<{ data: ShareLogRow[] }> {
    const qs = new URLSearchParams();
    if (params?.resource_type) qs.set('resource_type', params.resource_type);
    if (params?.resource_id) qs.set('resource_id', params.resource_id);
    if (params?.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return apiClient.get(`${BASE_URL}/history${suffix}`, {}, organizationId);
  },
};
