import { createContext } from 'react';
import type { UserRole } from '../types/auth';

export interface AuthOrganization {
  id: string;
  name: string;
  slug: string | null;
  role: string;
  role_id?: string;
  is_active: boolean;
  onboarding_completed?: boolean;
  currency?: string;
  timezone?: string;
  language?: string;
}

export interface AuthFarm {
  id: string;
  name: string;
  location: string | null;
  size: number | null;
  manager_name: string | null;
}

export interface AuthUserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  timezone: string | null;
  language: string | null;
  password_set?: boolean | null;
  onboarding_completed?: boolean | null;
  created_at?: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  profile: AuthUserProfile | null;
  organizations: AuthOrganization[];
  currentOrganization: AuthOrganization | null;
  farms: AuthFarm[];
  currentFarm: AuthFarm | null;
  userRole: UserRole | null;
  loading: boolean;
  needsOnboarding: boolean;
  needsImport?: boolean;
  setCurrentOrganization: (org: AuthOrganization) => void;
  setCurrentFarm: (farm: AuthFarm) => void;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  hasRole: (roleName: string | string[]) => boolean;
  isAtLeastRole: (roleName: string) => boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  organizations: [],
  currentOrganization: null,
  farms: [],
  currentFarm: null,
  userRole: null,
  loading: true,
  needsOnboarding: false,
  needsImport: false,
  setCurrentOrganization: () => {},
  setCurrentFarm: () => {},
  signOut: async () => {},
  refreshUserData: async () => {},
  hasRole: () => false,
  isAtLeastRole: () => false,
});
