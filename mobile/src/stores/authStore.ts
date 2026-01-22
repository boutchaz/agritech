import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { api, authApi, type UserProfile, type Organization, type Farm } from '@/lib/api';

const BIOMETRIC_KEY = 'agritech_biometric_enabled';
const CREDENTIALS_KEY = 'agritech_credentials';

export type UserRole =
  | 'system_admin'
  | 'organization_admin'
  | 'farm_manager'
  | 'farm_worker'
  | 'day_laborer'
  | 'viewer';

export interface AuthState {
  user: { id: string; email: string } | null;
  profile: UserProfile | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  currentFarm: Farm | null;
  role: UserRole | null;
  permissions: string[];
  isLoading: boolean;
  isAuthenticated: boolean;
  biometricEnabled: boolean;
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setCurrentOrganization: (org: Organization) => Promise<void>;
  setCurrentFarm: (farm: Farm) => void;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => void;
  authenticateWithBiometric: () => Promise<boolean>;
  loadUserRole: () => Promise<void>;
}

interface AuthStore extends AuthState, AuthActions {}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  organizations: [],
  currentOrganization: null,
  currentFarm: null,
  role: null,
  permissions: [],
  isLoading: true,
  isAuthenticated: false,
  biometricEnabled: false,

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login(email, password);
      
      await api.setTokens(response.access_token, response.refresh_token);
      
      const [profile, organizations] = await Promise.all([
        authApi.getProfile(),
        authApi.getOrganizations(),
      ]);

      let currentOrganization: Organization | null = null;
      if (organizations.length > 0) {
        currentOrganization = organizations[0];
        await api.setOrganizationId(currentOrganization.id);
      }

      set({
        user: response.user,
        profile,
        organizations,
        currentOrganization,
        isAuthenticated: true,
        isLoading: false,
      });

      if (currentOrganization) {
        await get().loadUserRole();
      }

      if (get().biometricEnabled) {
        await SecureStore.setItemAsync(
          CREDENTIALS_KEY,
          JSON.stringify({ email, password })
        );
      }
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await api.clearTokens();
      set({
        user: null,
        profile: null,
        organizations: [],
        currentOrganization: null,
        currentFarm: null,
        role: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  refreshSession: async () => {
    set({ isLoading: true });
    try {
      await api.initialize();
      
      const profile = await authApi.getProfile().catch(() => null);
      
      if (profile) {
        const organizations = await authApi.getOrganizations();
        
        let currentOrganization: Organization | null = null;
        const savedOrgId = api.getOrganizationId();
        
        if (savedOrgId) {
          currentOrganization = organizations.find(o => o.id === savedOrgId) || null;
        }
        if (!currentOrganization && organizations.length > 0) {
          currentOrganization = organizations[0];
          await api.setOrganizationId(currentOrganization.id);
        }

        set({
          user: { id: profile.id, email: profile.email },
          profile,
          organizations,
          currentOrganization,
          isAuthenticated: true,
          isLoading: false,
        });

        if (currentOrganization) {
          await get().loadUserRole();
        }
      } else {
        set({ isLoading: false });
      }

      const biometricEnabled = await SecureStore.getItemAsync(BIOMETRIC_KEY);
      set({ biometricEnabled: biometricEnabled === 'true' });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  setCurrentOrganization: async (org: Organization) => {
    await api.setOrganizationId(org.id);
    set({ currentOrganization: org, currentFarm: null });
    await get().loadUserRole();
  },

  setCurrentFarm: (farm: Farm) => {
    set({ currentFarm: farm });
  },

  loadUserRole: async () => {
    try {
      const { role, permissions } = await authApi.getUserRole();
      set({ role: role as UserRole, permissions });
    } catch (error) {
      console.warn('Failed to load user role:', error);
    }
  },

  enableBiometric: async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable biometric login',
      fallbackLabel: 'Use passcode',
    });

    if (result.success) {
      await SecureStore.setItemAsync(BIOMETRIC_KEY, 'true');
      set({ biometricEnabled: true });
      return true;
    }
    return false;
  },

  disableBiometric: () => {
    SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    set({ biometricEnabled: false });
  },

  authenticateWithBiometric: async () => {
    const biometricEnabled = await SecureStore.getItemAsync(BIOMETRIC_KEY);
    if (biometricEnabled !== 'true') return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login to AgriTech',
      fallbackLabel: 'Use password',
    });

    if (!result.success) return false;

    const credentialsStr = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    if (!credentialsStr) return false;

    try {
      const credentials = JSON.parse(credentialsStr);
      await get().signIn(credentials.email, credentials.password);
      return true;
    } catch {
      return false;
    }
  },
}));
