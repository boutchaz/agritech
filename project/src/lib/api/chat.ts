import { apiClient } from '../api-client';

const BASE_URL = '/api/v1';

export interface SendMessageDto {
  query: string;
  language?: 'en' | 'fr' | 'ar';
  save_history?: boolean;
}

export interface ChatContextSummary {
  organization: string;
  farms_count: number;
  parcels_count: number;
  workers_count: number;
  pending_tasks: number;
  recent_invoices: number;
  inventory_items: number;
  recent_harvests: number;
}

export interface ChatMetadata {
  provider: string;
  model: string;
  tokensUsed?: number;
  timestamp: string;
}

export interface ChatResponse {
  response: string;
  context_summary: ChatContextSummary;
  metadata: ChatMetadata;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  total: number;
}

export const chatApi = {
  async sendMessage(
    dto: SendMessageDto,
    organizationId?: string,
  ): Promise<ChatResponse> {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return apiClient.post(
      `${BASE_URL}/organizations/${organizationId}/chat`,
      dto,
      {},
      organizationId,
    );
  },

  async getHistory(
    organizationId?: string,
    limit = 20,
  ): Promise<ChatHistoryResponse> {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return apiClient.get(
      `${BASE_URL}/organizations/${organizationId}/chat/history?limit=${limit}`,
      {},
      organizationId,
    );
  },

  async clearHistory(organizationId?: string): Promise<{ success: boolean }> {
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return apiClient.delete_(
      `${BASE_URL}/organizations/${organizationId}/chat/history`,
      {},
      organizationId,
    );
  },
};
