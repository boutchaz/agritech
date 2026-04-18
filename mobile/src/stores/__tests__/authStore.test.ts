import * as SecureStore from 'expo-secure-store';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { version: '1.0.0-test' },
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

jest.mock('@/lib/ability', () => ({
  createAbility: jest.fn(() => ({ can: jest.fn(), cannot: jest.fn() })),
}));

jest.mock('@/lib/api', () => ({
  api: {
    setTokens: jest.fn(),
    clearTokens: jest.fn(),
    initialize: jest.fn(),
    setOrganizationId: jest.fn(),
    getOrganizationId: jest.fn(),
  },
  authApi: {
    login: jest.fn(),
    getProfile: jest.fn(),
    getOrganizations: jest.fn(),
    getUserRole: jest.fn(),
    getAbilities: jest.fn(),
  },
  farmsApi: {
    getFarms: jest.fn(),
  },
}));

jest.mock('@/lib/gtm', () => ({
  trackAuth: jest.fn().mockResolvedValue(undefined),
  trackAction: jest.fn().mockResolvedValue(undefined),
  trackLoginAttempt: jest.fn().mockResolvedValue(undefined),
  trackLoginSuccess: jest.fn().mockResolvedValue(undefined),
  trackLoginFailure: jest.fn().mockResolvedValue(undefined),
  trackLogout: jest.fn().mockResolvedValue(undefined),
  trackBiometricAuth: jest.fn().mockResolvedValue(undefined),
  trackAppOpen: jest.fn().mockResolvedValue(undefined),
  setUserProperties: jest.fn().mockResolvedValue(undefined),
}));

import { useAuthStore } from '../authStore';
import { api, authApi, farmsApi } from '@/lib/api';
import { createAbility } from '@/lib/ability';

const mockedSecureStore = jest.mocked(SecureStore);
const mockedApi = jest.mocked(api);
const mockedAuthApi = jest.mocked(authApi);
const mockedFarmsApi = jest.mocked(farmsApi);
const mockedCreateAbility = jest.mocked(createAbility);

const defaultOrg = {
  id: 'org-1',
  name: 'Agri Org',
  slug: 'agri-org',
  description: null,
  logo_url: null,
  currency_code: 'MAD',
  timezone: 'Africa/Casablanca',
  is_active: true,
  role: 'farm_manager',
  role_display_name: 'Farm Manager',
  role_level: 50,
};

const defaultProfile = {
  id: 'user-1',
  email: 'karim@example.com',
  first_name: 'Karim',
  last_name: 'A',
  avatar_url: null,
  phone: null,
};

function resetAuthState() {
  useAuthStore.setState({
    user: null,
    profile: null,
    organizations: [],
    currentOrganization: null,
    currentFarm: null,
    role: null,
    permissions: [],
    abilities: null,
    ability: mockedCreateAbility(null),
    isLoading: true,
    isAuthenticated: false,
    biometricEnabled: false,
  });
}

describe('authStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAuthState();
    mockedSecureStore.getItemAsync.mockResolvedValue(null);
    mockedApi.getOrganizationId.mockReturnValue(null);
    mockedAuthApi.getUserRole.mockResolvedValue({ role: 'farm_manager', permissions: ['tasks:read'] });
    mockedAuthApi.getAbilities.mockResolvedValue({ role: { name: 'farm_manager', display_name: 'Farm Manager', level: 50 }, abilities: [] });
    mockedFarmsApi.getFarms.mockResolvedValue([]);
  });

  it('has expected initial state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.organizations).toEqual([]);
    expect(state.currentOrganization).toBeNull();
  });

  it('handles login success and persists tokens', async () => {
    mockedAuthApi.login.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: { id: 'user-1', email: 'karim@example.com' },
    });
    mockedAuthApi.getProfile.mockResolvedValue(defaultProfile);
    mockedAuthApi.getOrganizations.mockResolvedValue([defaultOrg]);

    await useAuthStore.getState().signIn('KARIM@EXAMPLE.COM', 'pass123');

    expect(mockedAuthApi.login).toHaveBeenCalledWith('karim@example.com', 'pass123');
    expect(mockedApi.setTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
    expect(mockedApi.setOrganizationId).toHaveBeenCalledWith('org-1');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual({ id: 'user-1', email: 'karim@example.com' });
    expect(state.currentOrganization?.id).toBe('org-1');
  });

  it('handles logout and clears auth state', async () => {
    useAuthStore.setState({
      user: { id: 'user-1', email: 'karim@example.com' },
      profile: defaultProfile,
      organizations: [defaultOrg],
      currentOrganization: defaultOrg,
      isAuthenticated: true,
      isLoading: false,
    });

    await useAuthStore.getState().signOut();

    expect(mockedApi.clearTokens).toHaveBeenCalledTimes(1);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.profile).toBeNull();
    expect(state.currentOrganization).toBeNull();
  });

  it('refreshes an existing session from persisted auth data', async () => {
    mockedApi.getOrganizationId.mockReturnValue('org-1');
    mockedAuthApi.getProfile.mockResolvedValue(defaultProfile);
    mockedAuthApi.getOrganizations.mockResolvedValue([defaultOrg]);
    mockedFarmsApi.getFarms.mockResolvedValue([{ id: 'farm-1', name: 'Farm A', location: null, size: null, size_unit: null }]);
    mockedSecureStore.getItemAsync.mockResolvedValueOnce('true');

    await useAuthStore.getState().refreshSession();

    expect(mockedApi.initialize).toHaveBeenCalledTimes(1);
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.profile?.id).toBe('user-1');
    expect(state.currentOrganization?.id).toBe('org-1');
    expect(state.currentFarm?.id).toBe('farm-1');
    expect(state.biometricEnabled).toBe(true);
  });

  it('updates current organization and reloads role/abilities', async () => {
    await useAuthStore.getState().setCurrentOrganization(defaultOrg);

    expect(mockedApi.setOrganizationId).toHaveBeenCalledWith('org-1');
    expect(mockedAuthApi.getUserRole).toHaveBeenCalledTimes(1);
    expect(mockedAuthApi.getAbilities).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().currentOrganization?.id).toBe('org-1');
  });
});
