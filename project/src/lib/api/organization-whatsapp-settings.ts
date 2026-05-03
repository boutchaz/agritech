import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/organization-whatsapp-settings';

export interface WhatsAppSettings {
  configured: boolean;
  enabled: boolean;
  phone_number_id?: string;
  masked_access_token?: string;
  business_account_id?: string;
  display_phone_number?: string;
  last_tested_at?: string;
  last_test_status?: 'success' | 'failed';
  last_test_error?: string;
  updated_at?: string;
}

export interface UpsertWhatsAppSettingsDto {
  phone_number_id: string;
  access_token?: string;
  business_account_id?: string;
  display_phone_number?: string;
  enabled?: boolean;
}

export interface TestWhatsAppPayload {
  to: string;
  template?: string;
  language?: string;
}

export interface TestWhatsAppResult {
  success: boolean;
  error?: string;
}

export const organizationWhatsAppSettingsApi = {
  async get(organizationId: string): Promise<WhatsAppSettings> {
    return apiClient.get(BASE_URL, {}, organizationId);
  },

  async upsert(
    data: UpsertWhatsAppSettingsDto,
    organizationId: string,
  ): Promise<WhatsAppSettings> {
    return apiClient.put(BASE_URL, data, {}, organizationId);
  },

  async remove(organizationId: string): Promise<void> {
    return apiClient.delete(BASE_URL, {}, organizationId);
  },

  async test(
    payload: TestWhatsAppPayload,
    organizationId: string,
  ): Promise<TestWhatsAppResult> {
    return apiClient.post(`${BASE_URL}/test`, payload, {}, organizationId);
  },
};
