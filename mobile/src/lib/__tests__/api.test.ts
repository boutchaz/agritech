import * as SecureStore from 'expo-secure-store';
import { trackError } from '../gtm';

(global as any).__DEV__ = false;

import { api } from '../api';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '17.0',
  },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    deviceId: 'device-123',
    sessionId: 'session-123',
    expoConfig: { version: '1.0.0' },
  },
}));

jest.mock('expo-device', () => ({
  DeviceType: {
    UNKNOWN: 0,
    PHONE: 1,
    TABLET: 2,
    DESKTOP: 3,
  },
  deviceType: 1,
}));

jest.mock('@/constants/config', () => ({
  Config: {
    API_URL: 'https://mock.api',
    environment: 'test',
  },
  APP_CONFIG: {
    VERSION: '1.2.3',
  },
}));

jest.mock('../gtm', () => ({
  trackError: jest.fn().mockResolvedValue(undefined),
}));

const mockedSecureStore = jest.mocked(SecureStore);
const mockedTrackError = jest.mocked(trackError);

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).__DEV__ = false;
    (global as any).fetch = jest.fn();
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    (api as any).accessToken = null;
    (api as any).organizationId = null;
    (api as any).refreshPromise = null;
  });

  it('uses configured base URL for requests', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await api.get('/health');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://mock.api/api/v1/health',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('loads persisted auth data on initialize and injects auth/org headers', async () => {
    mockedSecureStore.getItemAsync.mockImplementation(async (key: string) => {
      if (key === 'agritech_access_token') return 'persisted-access';
      if (key === 'agritech_organization_id') return 'org-42';
      if (key === 'agritech_device_id') return 'device-123';
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });

    await api.initialize();
    await api.get('/tasks');

    const requestInit = (global.fetch as jest.Mock).mock.calls[0][1];
    const headers = requestInit.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer persisted-access');
    expect(headers['x-organization-id']).toBe('org-42');
  });

  it('persists tokens and sends Authorization header in subsequent requests', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await api.setTokens('new-access', 'new-refresh');
    await api.get('/private');

    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('agritech_access_token', 'new-access');
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('agritech_refresh_token', 'new-refresh');

    const requestInit = (global.fetch as jest.Mock).mock.calls[0][1];
    const headers = requestInit.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer new-access');
  });

  it('supports public requests without auth token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });

    await api.get('/public');

    const requestInit = (global.fetch as jest.Mock).mock.calls[0][1];
    const headers = requestInit.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('refreshes token and retries request on 401', async () => {
    mockedSecureStore.getItemAsync.mockImplementation(async (key: string) => {
      if (key === 'agritech_refresh_token') return 'refresh-123';
      if (key === 'agritech_device_id') return 'device-123';
      return null;
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ statusCode: 401, message: 'Unauthorized' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'refreshed-access', refresh_token: 'refreshed-refresh' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'ok' }),
      });

    const response = await api.get<{ data: string }>('/protected');

    expect(response).toEqual({ data: 'ok' });
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://mock.api/api/v1/auth/refresh-token',
      expect.objectContaining({ method: 'POST' })
    );
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('agritech_access_token', 'refreshed-access');
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('agritech_refresh_token', 'refreshed-refresh');
    expect(mockedTrackError).toHaveBeenCalledWith('Unauthorized', '/protected (401)');
  });
});
