import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get authentication headers for admin API requests
 */
export async function getApiHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No active session');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = await getApiHeaders();
  const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: response.statusText,
      error: 'Unknown error',
      statusCode: response.status
    }));
    throw new Error(error.message || error.error || 'API request failed');
  }

  return response.json();
}

/**
 * Admin API client
 */
export const adminApi = {
  // Reference Data
  async getReferenceData(table: string, query?: Record<string, string>) {
    const params = new URLSearchParams(query);
    return apiRequest<{ data: any[]; total: number }>(
      `/api/v1/admin/ref/${table}${params.toString() ? `?${params}` : ''}`
    );
  },

  async getReferenceDataDiff(table: string, fromVersion: string, toVersion?: string) {
    const params = new URLSearchParams({ fromVersion });
    if (toVersion) params.append('toVersion', toVersion);
    return apiRequest<any>(`/api/v1/admin/ref/${table}/diff?${params}`);
  },

  async importReferenceData(data: {
    table: string;
    rows: any[];
    dryRun?: boolean;
    updateExisting?: boolean;
    version?: string;
  }) {
    return apiRequest<any>('/api/v1/admin/ref/import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async publishReferenceData(data: {
    table: string;
    ids: string[];
    unpublish?: boolean;
  }) {
    return apiRequest<any>('/api/v1/admin/ref/publish', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async seedAccounts(data: {
    organizationId: string;
    chartType: string;
    version?: string;
  }) {
    return apiRequest<any>('/api/v1/admin/ref/seed-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Analytics
  async getSaasMetrics() {
    return apiRequest<any>('/api/v1/admin/saas-metrics');
  },

  async getOrganizations(query?: Record<string, string>) {
    const params = new URLSearchParams(query);
    return apiRequest<{ data: any[]; total: number }>(
      `/api/v1/admin/orgs${params.toString() ? `?${params}` : ''}`
    );
  },

  async getOrgUsage(orgId: string) {
    return apiRequest<any>(`/api/v1/admin/orgs/${orgId}/usage`);
  },

  async getJobLogs(limit?: number, offset?: number) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', String(limit));
    if (offset) params.append('offset', String(offset));
    return apiRequest<{ data: any[]; total: number }>(
      `/api/v1/admin/jobs${params.toString() ? `?${params}` : ''}`
    );
  },

  // Events
  async getEvents(query?: Record<string, string>) {
    const params = new URLSearchParams(query);
    return apiRequest<{ data: any[]; total: number }>(
      `/api/v1/admin/events${params.toString() ? `?${params}` : ''}`
    );
  },

  async getEventDistribution(days?: number, orgId?: string) {
    const params = new URLSearchParams();
    if (days) params.append('days', String(days));
    if (orgId) params.append('organization_id', orgId);
    return apiRequest<any[]>(`/api/v1/admin/events/distribution?${params}`);
  },

  async getDailyEventCounts(days?: number, orgId?: string) {
    const params = new URLSearchParams();
    if (days) params.append('days', String(days));
    if (orgId) params.append('organization_id', orgId);
    return apiRequest<any[]>(`/api/v1/admin/events/daily-counts?${params}`);
  },
};
