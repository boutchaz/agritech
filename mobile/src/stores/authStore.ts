import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { api, authApi, type UserProfile, type Organization, type Farm, type UserAbilities } from '@/lib/api';
import { createAbility, type Ability } from '@/lib/ability';
import {
  trackAuth,
  trackAction,
  trackLoginAttempt,
  trackLoginSuccess,
  trackLoginFailure,
  trackLogout,
  trackBiometricAuth,
  trackAppOpen,
  setUserProperties,
  type MobileAnalyticsUserProperties,
} from '@/lib/gtm';

const BIOMETRIC_KEY = 'agritech_biometric_enabled';
const CREDENTIALS_KEY = 'agritech_credentials';

/**
 * Determine organization size based on organization data
 */
function getOrganizationSize(org: Organization): 'solo' | 'small' | 'medium' | 'large' {
  // TODO: Implement based on actual organization metrics
  // For now, default to 'small'
  return 'small';
}

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
  /** CASL abilities from backend - source of truth for permissions */
  abilities: UserAbilities | null;
  /** CASL ability instance for permission checking */
  ability: Ability;
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
  /** Load CASL abilities from backend (source of truth for permissions) */
  loadAbilities: () => Promise<void>;
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
  abilities: null,
  ability: createAbility(null),
  isLoading: true,
  isAuthenticated: false,
  biometricEnabled: false,

   signIn: async (email: string, password: string) => {
     set({ isLoading: true });
     try {
       // Track login attempt
       await trackLoginAttempt('email');

       const response = await authApi.login(email.toLowerCase(), password);

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
        // Load both user role (legacy) and CASL abilities (source of truth)
        await Promise.all([
          get().loadUserRole(),
          get().loadAbilities(),
        ]);
      }

      if (get().biometricEnabled) {
        await SecureStore.setItemAsync(
          CREDENTIALS_KEY,
          JSON.stringify({ email, password })
        );
      }

      // Track successful login
      await trackLoginSuccess('email');
      await trackAuth('login', 'success');
      await trackAction('login', 'authentication', 'manual');
      await trackAppOpen();

      // Set user properties after successful login
      const role = get().role;
      if (profile && currentOrganization && role) {
        const orgSize = getOrganizationSize(currentOrganization);
        const userProps: MobileAnalyticsUserProperties = {
          userId: profile.id,
          email: profile.email,
          signUpDate: profile.created_at || new Date().toISOString(),
          organizationId: currentOrganization.id,
          organizationSize: orgSize,
          subscriptionTier: 'trial', // TODO: Get from actual subscription data
          trialStatus: 'active', // TODO: Get from actual trial data
          role: role,
          farmCount: organizations.length,
          totalHectares: 0, // TODO: Calculate from farm data
          platform: 'mobile',
          appVersion: Constants.expoConfig?.version || '1.0.0',
        };
        await setUserProperties(userProps);
      }
    } catch (error) {
      set({ isLoading: false });
      // Track failed login
      await trackLoginFailure('email', 'authentication_failed');
      await trackAuth('login', 'failed');
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      // Track logout before clearing tokens
      await trackLogout();
      await trackAuth('logout', 'success');

      await api.clearTokens();

      set({
        user: null,
        profile: null,
        organizations: [],
        currentOrganization: null,
        currentFarm: null,
        role: null,
        permissions: [],
        abilities: null,
        ability: createAbility(null),
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
          // Load both user role (legacy) and CASL abilities (source of truth)
          await Promise.all([
            get().loadUserRole(),
            get().loadAbilities(),
          ]);
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
    // Load both user role (legacy) and CASL abilities when organization changes
    await Promise.all([
      get().loadUserRole(),
      get().loadAbilities(),
    ]);
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

  loadAbilities: async () => {
    try {
      const abilities = await authApi.getAbilities();
      const ability = createAbility(abilities);
      set({
        abilities,
        ability,
        // Also update role from abilities if available
        role: abilities.role?.name as UserRole || get().role,
      });
    } catch (error) {
      console.warn('Failed to load abilities:', error);
      // Keep using existing ability if fetch fails
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
      await trackBiometricAuth(true);
      return true;
    }
    await trackBiometricAuth(false);
    return false;
  },

  disableBiometric: () => {
    SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    set({ biometricEnabled: false });
  },

  authenticateWithBiometric: async () => {
    const biometricEnabled = await SecureStore.getItemAsync(BIOMETRIC_KEY);
    if (biometricEnabled !== 'true') {
      await trackBiometricAuth(false);
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login to AgriTech',
      fallbackLabel: 'Use password',
    });

    if (!result.success) {
      await trackBiometricAuth(false);
      return false;
    }

    await trackBiometricAuth(true);

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
