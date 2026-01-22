import type { Session, User } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type UserRole =
  | 'system_admin'
  | 'organization_admin'
  | 'farm_manager'
  | 'farm_worker'
  | 'day_laborer'
  | 'viewer';

export type Profile = Database['public']['Tables']['user_profiles']['Row'];
export type Organization = Database['public']['Tables']['organizations']['Row'];
export type Farm = Database['public']['Tables']['farms']['Row'];
export type Worker = Database['public']['Tables']['workers']['Row'];

export interface AuthUser extends Omit<User, 'role'> {
  profile?: Profile;
  role?: UserRole;
  organizationId?: string;
  farmIds?: string[];
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  profile: Profile | null;
  currentOrganization: Organization | null;
  currentFarm: Farm | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  biometricEnabled: boolean;
}

export interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setCurrentOrganization: (org: Organization) => void;
  setCurrentFarm: (farm: Farm) => void;
  enableBiometric: () => Promise<boolean>;
  disableBiometric: () => void;
  authenticateWithBiometric: () => Promise<boolean>;
}
