import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/organization-email-settings';

export interface EmailSettings {
  configured: boolean;
  enabled: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  masked_password?: string;
  from_email?: string;
  from_name?: string;
  reply_to?: string;
  last_tested_at?: string;
  last_test_status?: 'success' | 'failed';
  last_test_error?: string;
  updated_at?: string;
}

export interface UpsertEmailSettingsDto {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password?: string;
  from_email: string;
  from_name?: string;
  reply_to?: string;
  enabled?: boolean;
}

export interface TestEmailResult {
  success: boolean;
  error?: string;
}

export const organizationEmailSettingsApi = {
  async get(organizationId: string): Promise<EmailSettings> {
    return apiClient.get(BASE_URL, {}, organizationId);
  },

  async upsert(
    data: UpsertEmailSettingsDto,
    organizationId: string,
  ): Promise<EmailSettings> {
    return apiClient.put(BASE_URL, data, {}, organizationId);
  },

  async remove(organizationId: string): Promise<void> {
    return apiClient.delete(BASE_URL, {}, organizationId);
  },

  async test(to: string, organizationId: string): Promise<TestEmailResult> {
    return apiClient.post(`${BASE_URL}/test`, { to }, {}, organizationId);
  },
};
