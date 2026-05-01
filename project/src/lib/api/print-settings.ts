import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/organizations';

export interface PrintSettings {
  id: string;
  organization_id: string;
  paper_size: string;
  compact_tables: boolean;
  repeat_header_footer: boolean;
  created_at: string;
  updated_at: string;
}

export const printSettingsApi = {
  async get(organizationId: string): Promise<PrintSettings> {
    return apiClient.get<PrintSettings>(
      `${BASE_URL}/${organizationId}/print-settings`,
      {},
      organizationId,
    );
  },

  async update(organizationId: string, data: Partial<PrintSettings>): Promise<PrintSettings> {
    return apiClient.put<PrintSettings>(
      `${BASE_URL}/${organizationId}/print-settings`,
      data,
      {},
      organizationId,
    );
  },
};
