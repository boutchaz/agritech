import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Device Analytics Headers
interface DeviceInfo {
  deviceType: 'web' | 'desktop';
  deviceOs: string;
  appVersion: string;
  deviceId: string;
}

function getDeviceInfo(): DeviceInfo {
  // Check if running in Tauri desktop app
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  const deviceType = isTauri ? 'desktop' : 'web';

  // Get or generate device ID
  let deviceId = localStorage.getItem('agritech_admin_device_id');
  if (!deviceId) {
    deviceId = `admin_${deviceType}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('agritech_admin_device_id', deviceId);
  }

  // Detect OS
  let deviceOs = 'unknown';
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) deviceOs = 'windows';
    else if (userAgent.includes('Mac')) deviceOs = 'macos';
    else if (userAgent.includes('Linux')) deviceOs = 'linux';
    else if (userAgent.includes('Android')) deviceOs = 'android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) deviceOs = 'ios';
    else deviceOs = 'web';
  }

  // Get app version from package.json or build info
  const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';

  return {
    deviceType,
    deviceOs: isTauri ? `tauri-${deviceOs}` : deviceOs,
    appVersion,
    deviceId,
  };
}

function getAnalyticsHeaders(): Record<string, string> {
  const deviceInfo = getDeviceInfo();
  return {
    'X-Device-Type': deviceInfo.deviceType,
    'X-Device-OS': deviceInfo.deviceOs,
    'X-App-Version': deviceInfo.appVersion,
    'X-Device-Id': deviceInfo.deviceId,
    'X-Client-App': 'admin',
  };
}

/**
 * Get authentication headers for admin API requests
 */
export async function getApiHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No active session');
  }

  const analyticsHeaders = getAnalyticsHeaders();

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    ...analyticsHeaders,
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

  // Adoption Analytics
  async getAdoptionDashboard(funnelName?: string) {
    const params = new URLSearchParams();
    if (funnelName) params.append('funnel', funnelName);
    return apiRequest<any>(`/api/v1/admin/adoption/dashboard?${params}`);
  },

  async getAvailableFunnels() {
    return apiRequest<string[]>('/api/v1/admin/adoption/funnels');
  },

  async getFunnelConversionRates(funnelName: string) {
    return apiRequest<any[]>(`/api/v1/admin/adoption/funnels/${funnelName}/conversion-rates`);
  },

  async getTimeToMilestone(funnelName: string) {
    return apiRequest<any[]>(`/api/v1/admin/adoption/funnels/${funnelName}/time-to-milestone`);
  },

  async getDropoffAnalysis(funnelName: string) {
    return apiRequest<any[]>(`/api/v1/admin/adoption/funnels/${funnelName}/dropoffs`);
  },

  async getCohortAnalysis(funnelName: string, months?: number) {
    const params = new URLSearchParams();
    if (months) params.append('months', String(months));
    return apiRequest<any[]>(`/api/v1/admin/adoption/funnels/${funnelName}/cohorts?${params}`);
  },

  async getDailyAdoptionTrend(funnelName: string, days?: number) {
    const params = new URLSearchParams();
    if (days) params.append('days', String(days));
    return apiRequest<any[]>(`/api/v1/admin/adoption/funnels/${funnelName}/daily-trend?${params}`);
  },

  async getUserMilestones(userId: string) {
    return apiRequest<any[]>(`/api/v1/admin/adoption/users/${userId}/milestones`);
  },

  async getMilestoneTypes() {
    return apiRequest<string[]>('/api/v1/admin/adoption/milestone-types');
  },
};
