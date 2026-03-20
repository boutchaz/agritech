import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Config, APP_CONFIG } from '@/constants/config';
import { trackError } from './gtm';

function resolveOrganizationId(): string | null {
  try {
    const mod = require('../stores/authStore');
    return mod.useAuthStore?.getState()?.currentOrganization?.id ?? null;
  } catch {
    return null;
  }
}

const ACCESS_TOKEN_KEY = 'agritech_access_token';
const REFRESH_TOKEN_KEY = 'agritech_refresh_token';
const ORGANIZATION_ID_KEY = 'agritech_organization_id';
const DEVICE_ID_KEY = 'agritech_device_id';

// Device Analytics Headers
interface DeviceInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  deviceOs: string;
  appVersion: string;
  deviceId: string;
}

async function getDeviceInfo(): Promise<DeviceInfo> {
  // Get or generate unique device ID
  const storedDeviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  const deviceId = storedDeviceId ?? Constants.deviceId ?? Constants.sessionId ?? `mobile_${Date.now()}`;

  if (!storedDeviceId) {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }

  // Determine device type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'mobile';
  if (Device.deviceType === Device.DeviceType.TABLET) {
    deviceType = 'tablet';
  } else if (Platform.OS === 'web' && Device.deviceType === Device.DeviceType.DESKTOP) {
    deviceType = 'desktop';
  }

  return {
    deviceType,
    deviceOs: `${Platform.OS}-${Platform.Version}`,
    appVersion: APP_CONFIG.VERSION,
    deviceId,
  };
}

async function getAnalyticsHeaders(): Promise<Record<string, string>> {
  const deviceInfo = await getDeviceInfo();
  return {
    'X-Device-Type': deviceInfo.deviceType,
    'X-Device-OS': deviceInfo.deviceOs,
    'X-App-Version': deviceInfo.appVersion,
    'X-Device-Id': deviceInfo.deviceId,
  };
}

interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private organizationId: string | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    this.baseUrl = `${Config.API_URL}/api/v1`;
    if (__DEV__) {
      console.log(`[API] Base URL: ${this.baseUrl} (env: ${Config.environment})`);
    }
  }

  async initialize(): Promise<void> {
    this.accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    this.organizationId = await SecureStore.getItemAsync(ORGANIZATION_ID_KEY);
  }

  async setTokens(accessToken: string, refreshToken?: string): Promise<void> {
    this.accessToken = accessToken;
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    if (typeof refreshToken === 'string') {
      if (refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      } else {
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      }
    }
  }

  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.organizationId = null;
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(ORGANIZATION_ID_KEY);
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!refreshToken) return false;

        const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          return false;
        }

        const data = await response.json();
        await this.setTokens(data.access_token, data.refresh_token);
        return true;
      } catch {
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async setOrganizationId(orgId: string): Promise<void> {
    this.organizationId = orgId;
    await SecureStore.setItemAsync(ORGANIZATION_ID_KEY, orgId);
  }

  getOrganizationId(): string | null {
    return this.organizationId;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOnUnauthorized: boolean = true
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const analyticsHeaders = await getAnalyticsHeaders();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...analyticsHeaders,
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const orgId = this.organizationId || resolveOrganizationId();
    if (orgId) {
      (headers as Record<string, string>)['x-organization-id'] = orgId;
    }

    if (__DEV__) {
      console.log(`[API] ${options.method || 'GET'} ${url}`, { orgId, orgIdSource: this.organizationId ? 'instance' : 'store', hasToken: !!this.accessToken });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: Response;

    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (fetchError) {
      if (
        retryOnUnauthorized &&
        (fetchError instanceof TypeError ||
          (fetchError instanceof Error && fetchError.name === 'AbortError'))
      ) {
        return this.request<T>(endpoint, options, false);
      }

      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        statusCode: response.status,
        message: response.statusText,
      }));

      // Track API error with GTM
      await trackError(error.message || 'Request failed', `${endpoint} (${response.status})`);

      if (response.status === 401) {
        if (retryOnUnauthorized) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            return this.request<T>(endpoint, options, false);
          }
        }
        await this.clearTokens();
      }

      if (__DEV__) {
        console.error(`[API] ERROR ${response.status} ${endpoint}:`, error.message);
      }
      throw new Error(error.message || 'Request failed');
    }

    if (response.status === 204) {
      return {} as T;
    }

    const data = await response.json();
    if (__DEV__) {
      const preview = JSON.stringify(data).slice(0, 200);
      console.log(`[API] OK ${endpoint} →`, preview);
    }
    return data;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async uploadFile(
    endpoint: string,
    file: { uri: string; name: string; type: string }
  ): Promise<{ url: string }> {
    const url = `${this.baseUrl}${endpoint}`;
    const formData = new FormData();

    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);

    const analyticsHeaders = await getAnalyticsHeaders();

    const headers: HeadersInit = {
      ...analyticsHeaders,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const uploadOrgId = this.organizationId || resolveOrganizationId();
    if (uploadOrgId) {
      (headers as Record<string, string>)['x-organization-id'] = uploadOrgId;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error('File upload failed');
    }

    return response.json();
  }
}

export const api = new ApiClient();

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    email: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  password_set?: boolean | null;
  onboarding_completed?: boolean | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  currency_code: string;
  timezone: string;
  is_active: boolean;
  role: string;
  role_display_name: string;
  role_level: number;
}

export interface Farm {
  id: string;
  name: string;
  location: string | null;
  size: number | null;
  size_unit: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  task_type: string | null;
  farm_id: string;
  parcel_id: string | null;
  assigned_to: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  farm?: Farm;
  parcel?: { id: string; name: string };
  assigned_worker?: { id: string; first_name: string; last_name: string };
}

export interface HarvestRecord {
  id: string;
  organization_id: string;
  farm_id: string;
  parcel_id: string;
  crop_id: string | null;
  harvest_date: string;
  quantity: number;
  unit: string;
  quality_grade: string | null;
  quality_score: number | null;
  notes: string | null;
  photos: string[] | null;
  status: string;
  created_at: string;
  farm?: Farm;
  parcel?: { id: string; name: string };
  crop?: { id: string; name: string };
}

export interface TimeLog {
  id: string;
  task_id: string;
  worker_id: string;
  clock_in: string;
  clock_out: string | null;
  location_in: { lat: number; lng: number } | null;
  location_out: { lat: number; lng: number } | null;
  duration_minutes: number | null;
}

export interface Parcel {
  id: string;
  name: string;
  farm_id: string;
  area: number | null;
  area_unit: string | null;
  current_crop: string | null;
  status: string;
}

// CASL Ability Types
export interface RoleInfo {
  name: string;
  display_name: string;
  level: number;
}

export interface AbilityRule {
  action: string;
  subject: string;
  inverted?: boolean;
}

export interface UserAbilities {
  role: RoleInfo | null;
  abilities: AbilityRule[];
}

export const authApi = {
  login: (email: string, password: string, rememberMe: boolean = true) =>
    api.post<LoginResponse>('/auth/login', { email, password, rememberMe }),

  getProfile: () => api.get<UserProfile>('/auth/me'),

  changePassword: (newPassword: string) =>
    api.post<{ success: boolean }>('/auth/change-password', { newPassword }),

  getOrganizations: () => api.get<Organization[]>('/users/me/organizations'),

  getUserRole: () => api.get<{ role: string; permissions: string[] }>('/auth/me/role'),

  /**
   * Get CASL abilities for the current user
   * This is the single source of truth for permissions
   */
  getAbilities: () => api.get<UserAbilities>('/auth/me/abilities'),
};

export const tasksApi = {
  getMyTasks: () => api.get<Task[]>('/tasks/my-tasks'),

  getTasks: (filters?: { status?: string; farmId?: string; parcelId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.farmId) params.append('farmId', filters.farmId);
    if (filters?.parcelId) params.append('parcelId', filters.parcelId);
    const query = params.toString();
    return api.get<{ data: Task[]; total: number }>(`/tasks${query ? `?${query}` : ''}`);
  },

  getTask: (taskId: string) => api.get<Task>(`/tasks/${taskId}`),

  getStatistics: async () => {
    const res = await api.get<{
      total_tasks: number;
      completed_tasks: number;
      in_progress_tasks: number;
      overdue_tasks: number;
    }>('/tasks/statistics');
    return {
      total: res.total_tasks ?? 0,
      pending: (res.total_tasks ?? 0) - (res.completed_tasks ?? 0) - (res.in_progress_tasks ?? 0),
      in_progress: res.in_progress_tasks ?? 0,
      completed: res.completed_tasks ?? 0,
      overdue: res.overdue_tasks ?? 0,
    };
  },

  createTask: (data: Partial<Task>) => api.post<Task>('/tasks', data),

  updateTask: (taskId: string, data: Partial<Task>) =>
    api.patch<Task>(`/tasks/${taskId}`, data),

  updateTaskStatus: (taskId: string, status: Task['status']) =>
    api.patch<Task>(`/tasks/${taskId}`, { status }),

  completeTask: (taskId: string, data: { notes?: string; completion_data?: unknown }) =>
    api.patch<Task>(`/tasks/${taskId}/complete`, data),

  clockIn: (taskId: string, data: { location?: { lat: number; lng: number } }) =>
    api.post<TimeLog>(`/tasks/${taskId}/clock-in`, data),

  clockOut: (timeLogId: string, data: { location?: { lat: number; lng: number }; notes?: string }) =>
    api.patch<TimeLog>(`/tasks/time-logs/${timeLogId}/clock-out`, data),

  getTimeLogs: (taskId: string) => api.get<TimeLog[]>(`/tasks/${taskId}/time-logs`),

  addComment: (taskId: string, content: string) =>
    api.post(`/tasks/${taskId}/comments`, { content }),
};

export const harvestsApi = {
  getHarvests: (filters?: { dateFrom?: string; dateTo?: string; farmId?: string }) => {
    const orgId = api.getOrganizationId();
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.farmId) params.append('farmId', filters.farmId);
    const query = params.toString();
    return api.get<{ data: HarvestRecord[]; total: number }>(
      `/organizations/${orgId}/harvests${query ? `?${query}` : ''}`
    );
  },

  getHarvest: (harvestId: string) => {
    const orgId = api.getOrganizationId();
    return api.get<HarvestRecord>(`/organizations/${orgId}/harvests/${harvestId}`);
  },

  createHarvest: (data: {
    farm_id: string;
    parcel_id: string;
    crop_id?: string;
    harvest_date: string;
    quantity: number;
    unit: string;
    quality_grade?: string;
    notes?: string;
    photos?: string[];
    location?: { lat: number; lng: number };
  }) => {
    const orgId = api.getOrganizationId();
    return api.post<HarvestRecord>(`/organizations/${orgId}/harvests`, data);
  },

  updateHarvest: (harvestId: string, data: Partial<HarvestRecord>) => {
    const orgId = api.getOrganizationId();
    return api.patch<HarvestRecord>(`/organizations/${orgId}/harvests/${harvestId}`, data);
  },

  deleteHarvest: (harvestId: string) => {
    const orgId = api.getOrganizationId();
    return api.delete(`/organizations/${orgId}/harvests/${harvestId}`);
  },
};

export const farmsApi = {
  getFarms: async (): Promise<Farm[]> => {
    const res = await api.get<{ success: boolean; farms: Array<Record<string, unknown>> }>('/farms');
    return (res.farms || []).map((f) => ({
      id: (f.farm_id as string) || (f.id as string),
      name: (f.farm_name as string) || (f.name as string) || '',
      location: (f.farm_location as string | null) ?? null,
      size: (f.farm_size as number | null) ?? null,
      size_unit: (f.size_unit as string | null) ?? null,
    }));
  },

  getFarm: async (farmId: string): Promise<Farm> => {
    const res = await api.get<{ success: boolean; farm: Record<string, unknown> }>(`/farms/${farmId}`);
    const f = res.farm || res;
    return {
      id: (f.farm_id as string) || (f.id as string),
      name: (f.farm_name as string) || (f.name as string) || '',
      location: (f.farm_location as string | null) ?? null,
      size: (f.farm_size as number | null) ?? null,
      size_unit: (f.size_unit as string | null) ?? null,
    };
  },
};

export const parcelsApi = {
  getParcels: async (farmId?: string): Promise<Parcel[]> => {
    const query = farmId ? `?farm_id=${farmId}` : '';
    const res = await api.get<{ success: boolean; parcels: Parcel[] }>(`/parcels${query}`);
    return res.parcels || [];
  },

  getParcel: async (parcelId: string): Promise<Parcel> => {
    const res = await api.get<{ success: boolean; parcel: Parcel }>(`/parcels/${parcelId}`);
    return res.parcel || res;
  },
};

export const filesApi = {
  uploadImage: (uri: string, folder: string = 'general') => {
    const filename = uri.split('/').pop() || 'photo.jpg';
    return api.uploadFile(`/files/upload?folder=${folder}`, {
      uri,
      name: filename,
      type: 'image/jpeg',
    });
  },
};
