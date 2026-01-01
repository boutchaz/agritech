import { apiClient } from '../api-client';

const BASE_URL = '/api/v1/organization-ai-settings';

export type AIProviderType = 'openai' | 'gemini' | 'groq';

export interface AIProviderSettings {
  provider: AIProviderType;
  configured: boolean;
  enabled: boolean;
  masked_key?: string;
  updated_at?: string;
}

export interface UpsertAIProviderDto {
  provider: AIProviderType;
  api_key: string;
  enabled?: boolean;
}

export interface ToggleProviderDto {
  enabled: boolean;
}

export const organizationAISettingsApi = {
  /**
   * Get all AI provider settings for the organization
   */
  async getSettings(organizationId: string): Promise<AIProviderSettings[]> {
    return apiClient.get(BASE_URL, {}, organizationId);
  },

  /**
   * Create or update an AI provider setting
   */
  async upsertProvider(
    data: UpsertAIProviderDto,
    organizationId: string
  ): Promise<AIProviderSettings> {
    return apiClient.post(BASE_URL, data, {}, organizationId);
  },

  /**
   * Delete an AI provider setting
   */
  async deleteProvider(
    provider: AIProviderType,
    organizationId: string
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.delete(`${BASE_URL}/${provider}`, {}, organizationId);
  },

  /**
   * Toggle provider enabled status
   */
  async toggleProvider(
    provider: AIProviderType,
    enabled: boolean,
    organizationId: string
  ): Promise<AIProviderSettings> {
    return apiClient.patch(
      `${BASE_URL}/${provider}/toggle`,
      { enabled },
      {},
      organizationId
    );
  },
};
