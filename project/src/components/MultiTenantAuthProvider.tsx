import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { authSupabase } from '../lib/auth-supabase';
import type { User } from '@supabase/supabase-js';
import type { UserRole } from '../types/auth';
import SubscriptionRequired from './SubscriptionRequired';
import {
  useUserProfile,
  useUserOrganizations,
  useOrganizationFarms,
  useSignOut,
  useRefreshUserData
} from '../hooks/useAuthQueries';
import { useSubscription } from '../hooks/useSubscription';
import { isSubscriptionValid } from '../lib/polar';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
  role_id?: string;
  is_active: boolean;
  onboarding_completed?: boolean;
  currency?: string;
  timezone?: string;
  language?: string;
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
  password_set?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  farms: Farm[];
  currentFarm: Farm | null;
  userRole: UserRole | null;
  loading: boolean;
  needsOnboarding: boolean;
  setCurrentOrganization: (org: Organization) => void;
  setCurrentFarm: (farm: Farm) => void;
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
  setCurrentOrganization: () => {},
  setCurrentFarm: () => {},
  signOut: async () => {},
  refreshUserData: async () => {},
  hasRole: () => false,
  isAtLeastRole: () => false,
});

export const useAuth = () => useContext(AuthContext);

export const MultiTenantAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const _navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentFarm, setCurrentFarm] = useState<Farm | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/select-trial', '/set-password'];

  // Routes that don't require password to be set (accessible with temporary password)
  const noPasswordRequiredRoutes = ['/tasks'];

  // TanStack Query hooks
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const { data: organizations = [], isLoading: orgsLoading } = useUserOrganizations(user?.id);
  const { data: farms = [], isLoading: farmsLoading } = useOrganizationFarms(currentOrganization?.id);
  // Pass currentOrganization directly to avoid circular dependency
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription(currentOrganization);
  const signOutMutation = useSignOut();
  const refreshMutation = useRefreshUserData();

  // Calculate loading state
  // IMPORTANT: Also wait for currentOrganization to be set when we have organizations
  const waitingForOrganization = organizations.length > 0 && !currentOrganization && !orgsLoading;

  // Don't wait for subscription or farms on onboarding page
  const isOnOnboardingPage = location.pathname.startsWith('/onboarding');
  const loading = authLoading || profileLoading || orgsLoading ||
    (!isOnOnboardingPage && (farmsLoading || subscriptionLoading)) ||
    waitingForOrganization;

  // Debug loading state (temporarily disabled)
  // console.log('🔍 MultiTenantAuthProvider loading state:', {
  //   authLoading,
  //   profileLoading,
  //   orgsLoading,
  //   farmsLoading,
  //   subscriptionLoading,
  //   waitingForOrganization,
  //   isOnOnboardingPage,
  //   loading,
  //   organizationsCount: organizations.length,
  //   hasCurrentOrg: !!currentOrganization
  // });

  // Calculate onboarding state - check profile, organizations, and onboarding completion
  // Note: user_profiles table only has full_name field, not first_name/last_name
  // Note: organizations table doesn't have onboarding_completed field
  const needsOnboarding = !!(
    user && !loading && (
      // No profile yet (missing full_name)
      !profile || !profile.full_name ||
      // No organizations yet
      organizations.length === 0
    )
  );

  // Debug onboarding state (temporarily disabled)
  // console.log('🔍 Onboarding debug:', {
  //   user: !!user,
  //   loading,
  //   profile: profile ? {
  //     hasProfile: true,
  //     firstName: profile.first_name,
  //     lastName: profile.last_name,
  //     hasRequiredFields: !!(profile.first_name && profile.last_name)
  //   } : { hasProfile: false },
  //   organizationsCount: organizations.length,
  //   currentOrg: currentOrganization ? {
  //     id: currentOrganization.id,
  //     name: currentOrganization.name,
  //     onboardingCompleted: currentOrganization.onboarding_completed
  //   } : null,
  //   needsOnboarding,
  //   isOnOnboardingPage
  // });

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

  // Fetch user role
  const fetchUserRole = async () => {
    if (!user?.id || !currentOrganization?.id) {
      setUserRole(null);
      return;
    }

    try {
      // Direct query instead of RPC function
      // Get role from organization_users and join with roles table
      const { data: orgUser, error: orgUserError } = await authSupabase
        .from('organization_users')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .maybeSingle();

      if (orgUserError) throw orgUserError;

      // If no org user found, user is not part of this organization
      if (!orgUser) {
        setUserRole(null);
        return;
      }

      // Get role details from roles table
      const { data: roleDetails, error: roleError } = await authSupabase
        .from('roles')
        .select('name, display_name, level')
        .eq('name', orgUser.role)
        .maybeSingle();

      if (roleError) throw roleError;

      if (!roleDetails) {
        console.error('Role not found:', orgUser.role);
        setUserRole(null);
        return;
      }

      setUserRole({
        role_name: roleDetails.name,
        role_display_name: roleDetails.display_name,
        role_level: roleDetails.level
      });
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    }
  };

  // Role checking functions
  const hasRole = (roleName: string | string[]): boolean => {
    if (!userRole) return false;
    const roles = Array.isArray(roleName) ? roleName : [roleName];
    return roles.includes(userRole.role_name);
  };

  const isAtLeastRole = (roleName: string): boolean => {
    if (!userRole) return false;

    const roleHierarchy: Record<string, number> = {
      system_admin: 1,
      organization_admin: 2,
      farm_manager: 3,
      farm_worker: 4,
      day_laborer: 5,
      viewer: 6,
    };

    const userLevel = roleHierarchy[userRole.role_name];
    const requiredLevel = roleHierarchy[roleName];

    return userLevel <= requiredLevel;
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

  // Fetch user role when user or organization changes
  useEffect(() => {
    fetchUserRole();
  }, [user?.id, currentOrganization?.id]);

  // Auth state management
  useEffect(() => {
    // Check active sessions and set the user
    authSupabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setShowAuth(!sessionUser);
      setAuthLoading(false);
    });

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = authSupabase.auth.onAuthStateChange(async (event, session) => {
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

        // Redirect to login on sign out (but not on initial load)
        if (event === 'SIGNED_OUT') {
          window.location.href = '/login';
        }
      }

      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  // Check if current route is public or trial selection
  const isPublicRoute = publicRoutes.includes(location.pathname);
  const isOnSelectTrialPage = location.pathname.startsWith('/select-trial');
  const isOnSetPasswordPage = location.pathname.startsWith('/set-password');

  // Redirect to set-password if user hasn't set their password
  // Skip this check for routes that don't require password setup
  useEffect(() => {
    const isOnNoPasswordRequiredRoute = noPasswordRequiredRoutes.some(route =>
      location.pathname.startsWith(route)
    );

    // Skip password check for routes that don't require it
    if (isOnNoPasswordRequiredRoute) {
      return;
    }

    if (!loading && !profileLoading && user && profile && profile.password_set === false && !isOnSetPasswordPage && !isPublicRoute) {
      // User hasn't set their password - redirect to set-password
      window.location.href = '/set-password';
    }
  }, [loading, profileLoading, user, profile, isOnSetPasswordPage, isPublicRoute, location.pathname]);

  // Redirect to trial selection if user has organization but no subscription
  useEffect(() => {
    if (!loading && !subscriptionLoading && user && currentOrganization && !subscription && !isOnSelectTrialPage && !isPublicRoute && !isOnSetPasswordPage) {
      // User has an organization but no subscription - redirect to trial selection
      window.location.href = '/select-trial';
    }
  }, [loading, subscriptionLoading, user, currentOrganization, subscription, isOnSelectTrialPage, isPublicRoute, isOnSetPasswordPage]);

  const value = {
    user,
    profile: profile || null,
    organizations,
    currentOrganization,
    farms,
    currentFarm,
    userRole,
    loading,
    needsOnboarding,
    setCurrentOrganization: handleSetCurrentOrganization,
    setCurrentFarm: handleSetCurrentFarm,
    signOut,
    refreshUserData,
    hasRole,
    isAtLeastRole,
  };

  // Show loading spinner (but not on public routes)
  if (loading && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show authentication form (but not on public routes)
  if (showAuth && !isPublicRoute) {
    // Redirect to login page instead of showing inline auth form
    window.location.href = '/login';
    return null;
  }

  // Check subscription status (block access if no valid subscription)
  const hasValidSubscription = isSubscriptionValid(subscription);
  const isOnSettingsPage = location.pathname.startsWith('/settings');
  const isOnCheckoutSuccessPage = location.pathname.startsWith('/checkout-success');
  const protectedRoutes = !isPublicRoute && !isOnSettingsPage && !isOnOnboardingPage && !isOnCheckoutSuccessPage && !isOnSelectTrialPage;

  // Block access if no valid subscription (except on settings pages)
  if (!hasValidSubscription && protectedRoutes && currentOrganization && user) {
    const reason = !subscription
      ? 'no_subscription'
      : subscription.status === 'canceled'
      ? 'canceled'
      : subscription.status === 'past_due'
      ? 'past_due'
      : 'expired';
    return (
      <AuthContext.Provider value={value}>
        <SubscriptionRequired reason={reason} />
      </AuthContext.Provider>
    );
  }

  // Show main app (onboarding redirect is handled by useEffect above)
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};