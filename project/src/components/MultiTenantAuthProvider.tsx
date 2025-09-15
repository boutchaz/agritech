import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import Auth from './Auth';
import OnboardingFlow from './OnboardingFlow';
import {
  useUserProfile,
  useUserOrganizations,
  useOrganizationFarms,
  useSignOut,
  useRefreshUserData
} from '../hooks/useAuthQueries';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
  is_active: boolean;
}

interface Farm {
  id: string;
  name: string;
  location: string;
  size: number;
  manager_name: string;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  phone?: string;
  timezone: string;
  language: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  farms: Farm[];
  currentFarm: Farm | null;
  loading: boolean;
  needsOnboarding: boolean;
  setCurrentOrganization: (org: Organization) => void;
  setCurrentFarm: (farm: Farm) => void;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  organizations: [],
  currentOrganization: null,
  farms: [],
  currentFarm: null,
  loading: true,
  needsOnboarding: false,
  setCurrentOrganization: () => {},
  setCurrentFarm: () => {},
  signOut: async () => {},
  refreshUserData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const MultiTenantAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentFarm, setCurrentFarm] = useState<Farm | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  // TanStack Query hooks
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const { data: organizations = [], isLoading: orgsLoading } = useUserOrganizations(user?.id);
  const { data: farms = [], isLoading: farmsLoading } = useOrganizationFarms(currentOrganization?.id);
  const signOutMutation = useSignOut();
  const refreshMutation = useRefreshUserData();

  // Calculate loading state
  const loading = authLoading || profileLoading || orgsLoading || farmsLoading;

  // Calculate onboarding state
  const needsOnboarding = !!(user && !profile && !profileLoading) ||
                          (user && organizations.length === 0 && !orgsLoading);

  // Handle organization change
  const handleSetCurrentOrganization = (org: Organization) => {
    setCurrentOrganization(org);
    setCurrentFarm(null); // Clear current farm when switching organizations
    localStorage.setItem('currentOrganization', JSON.stringify(org));
  };

  // Handle farm change
  const handleSetCurrentFarm = (farm: Farm) => {
    setCurrentFarm(farm);
    localStorage.setItem('currentFarm', JSON.stringify(farm));
  };

  // Sign out handler
  const signOut = async () => {
    try {
      await signOutMutation.mutateAsync();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Refresh user data handler
  const refreshUserData = async () => {
    if (user) {
      try {
        await refreshMutation.mutateAsync(user.id);
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    }
  };

  // Set default organization when organizations load
  useEffect(() => {
    if (organizations.length > 0 && !currentOrganization) {
      // Try to restore from localStorage first
      const savedOrg = localStorage.getItem('currentOrganization');
      if (savedOrg) {
        try {
          const org = JSON.parse(savedOrg);
          // Verify the saved org still exists in user's organizations
          const validOrg = organizations.find(o => o.id === org.id);
          if (validOrg) {
            setCurrentOrganization(validOrg);
            return;
          }
        } catch (error) {
          console.error('Error parsing saved organization:', error);
        }
      }

      // Default to first organization
      setCurrentOrganization(organizations[0]);
    }
  }, [organizations, currentOrganization]);

  // Set default farm when farms load
  useEffect(() => {
    if (farms.length > 0 && !currentFarm) {
      // Try to restore from localStorage first
      const savedFarm = localStorage.getItem('currentFarm');
      if (savedFarm) {
        try {
          const farm = JSON.parse(savedFarm);
          // Verify the saved farm still exists in current organization
          const validFarm = farms.find(f => f.id === farm.id);
          if (validFarm) {
            setCurrentFarm(validFarm);
            return;
          }
        } catch (error) {
          console.error('Error parsing saved farm:', error);
        }
      }

      // Default to first farm
      setCurrentFarm(farms[0]);
    }
  }, [farms, currentFarm]);

  // Auth state management
  useEffect(() => {
    // Check active sessions and set the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setShowAuth(!sessionUser);
      setAuthLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);

      if (sessionUser) {
        setShowAuth(false);
      } else {
        // Clear all user data on sign out
        setCurrentOrganization(null);
        setCurrentFarm(null);
        setShowAuth(true);
        // localStorage is cleared by the signOut mutation
      }

      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    setShowAuth(false);
  };

  const handleOnboardingComplete = async () => {
    await refreshUserData();
  };

  const value = {
    user,
    profile: profile || null,
    organizations,
    currentOrganization,
    farms,
    currentFarm,
    loading,
    needsOnboarding,
    setCurrentOrganization: handleSetCurrentOrganization,
    setCurrentFarm: handleSetCurrentFarm,
    signOut,
    refreshUserData,
  };

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show authentication form
  if (showAuth) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // Show onboarding flow
  if (needsOnboarding && user) {
    return <OnboardingFlow user={user} onComplete={handleOnboardingComplete} />;
  }

  // Show main app
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};