import { apiClient } from '../api-client';
import { getApiHeaders } from '../api-client';
import { OrganizationRequiredError } from '../errors';

const BASE_URL = '/api/v1';

export interface SendMessageDto {
  query: string;
  language?: 'en' | 'fr' | 'ar';
  save_history?: boolean;
  image?: string;
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
  suggestions?: string[];
}

export interface ChatResponse {
  response: string;
  context_summary: ChatContextSummary;
  metadata: ChatMetadata;
  suggestions?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
  image?: string;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  total: number;
  hasMore: boolean;
}

export const chatApi = {
  async sendMessage(
    dto: SendMessageDto,
    organizationId?: string,
  ): Promise<ChatResponse> {
    if (!organizationId) {
      throw new OrganizationRequiredError();
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
    before?: string,
  ): Promise<ChatHistoryResponse> {
    if (!organizationId) {
      throw new OrganizationRequiredError();
    }
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.append('before', before);
    return apiClient.get(
      `${BASE_URL}/organizations/${organizationId}/chat/history?${params.toString()}`,
      {},
      organizationId,
    );
  },

  async clearHistory(organizationId?: string): Promise<{ success: boolean }> {
    if (!organizationId) {
      throw new OrganizationRequiredError();
    }
    return apiClient.delete(
      `${BASE_URL}/organizations/${organizationId}/chat/history`,
      {},
      organizationId,
    );
  },

  async textToSpeech(
    text: string,
    language?: string,
    voice?: string,
    speed?: number,
    organizationId?: string,
  ): Promise<Blob> {
    if (!organizationId) {
      throw new OrganizationRequiredError();
    }

    // Get auth headers
    const headers = await getApiHeaders(organizationId);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    const response = await fetch(
      `${API_URL}/api/v1/organizations/${organizationId}/chat/tts`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ text, language, voice, speed }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'TTS request failed' }));
      throw new Error(error.message || 'Failed to generate speech');
    }

    return response.blob();
  },

  async sendMessageStream(
    dto: SendMessageDto,
    organizationId: string,
    onToken: (token: string) => void,
    onComplete: (metadata: ChatMetadata) => void,
    onError: (error: Error) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const headers = await getApiHeaders(organizationId);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    const response = await fetch(
      `${API_URL}/api/v1/organizations/${organizationId}/chat/stream`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dto),
        signal,
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Stream request failed' }));
      onError(new Error(err.message || 'Failed to start stream'));
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Cancel the reader if the signal is aborted
    if (signal) {
      signal.addEventListener('abort', () => reader.cancel(), { once: true });
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'token') onToken(data.content);
            else if (data.type === 'done') onComplete({ ...data.metadata, suggestions: data.metadata?.suggestions });
            else if (data.type === 'error') onError(new Error(data.message));
          } catch {
            // Skip malformed SSE data
          }
        }
      }
    } catch (error) {
      // Ignore abort errors — they're expected when the user navigates away
      if (error instanceof DOMException && error.name === 'AbortError') return;
      onError(error instanceof Error ? error : new Error('Stream read error'));
    }
  },
};
