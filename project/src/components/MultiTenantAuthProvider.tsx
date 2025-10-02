import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Role, UserRole } from '../types/auth';
import Auth from './Auth';
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
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentFarm, setCurrentFarm] = useState<Farm | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register'];

  // TanStack Query hooks
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const { data: organizations = [], isLoading: orgsLoading } = useUserOrganizations(user?.id);
  const { data: farms = [], isLoading: farmsLoading } = useOrganizationFarms(currentOrganization?.id);
  // Pass currentOrganization directly to avoid circular dependency
  const { data: subscription, isLoading: subscriptionLoading, error: subscriptionError, dataUpdatedAt } = useSubscription(currentOrganization);

  // Force log subscription state
  console.log('🔍 SUBSCRIPTION STATE:', {
    subscription,
    subscriptionLoading,
    subscriptionError,
    dataUpdatedAt: new Date(dataUpdatedAt).toISOString(),
    currentOrgId: currentOrganization?.id,
    currentOrgName: currentOrganization?.name
  });
  const signOutMutation = useSignOut();
  const refreshMutation = useRefreshUserData();

  // Calculate loading state
  // IMPORTANT: Also wait for currentOrganization to be set when we have organizations
  const waitingForOrganization = organizations.length > 0 && !currentOrganization && !orgsLoading;
  const loading = authLoading || profileLoading || orgsLoading || farmsLoading || subscriptionLoading || waitingForOrganization;

  // Calculate onboarding state - check profile and organizations
  const needsOnboarding = !!(
    user && (
      // No profile yet
      (!profile && !profileLoading) ||
      // No organizations yet
      (organizations.length === 0 && !orgsLoading)
    )
  );

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
      const { data: roleData, error } = await supabase
        .rpc('get_user_role', {
          user_id: user.id,
          organization_id: currentOrganization.id
        });

      if (error) throw error;
      setUserRole(roleData?.[0] || null);
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

  // Navigate to onboarding if needed
  useEffect(() => {
    if (!loading && user && needsOnboarding && !location.pathname.startsWith('/onboarding')) {
      navigate({ to: '/onboarding' });
    }
  }, [needsOnboarding, loading, user, location, navigate]);

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

  // Check if current route is public
  const isPublicRoute = publicRoutes.includes(location.pathname);

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
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  // Check subscription status (block access if no valid subscription)
  const hasValidSubscription = isSubscriptionValid(subscription);
  const isOnSettingsPage = location.pathname.startsWith('/settings');
  const isOnOnboardingPage = location.pathname.startsWith('/onboarding');
  const isOnCheckoutSuccessPage = location.pathname.startsWith('/checkout-success');
  const protectedRoutes = !isPublicRoute && !isOnSettingsPage && !isOnOnboardingPage && !isOnCheckoutSuccessPage;

  console.log('🔍 Subscription check in provider:', {
    subscription,
    subscriptionStatus: subscription?.status,
    subscriptionEnd: subscription?.current_period_end,
    hasValidSubscription,
    currentOrganization: currentOrganization?.name,
    currentOrganizationId: currentOrganization?.id,
    location: location.pathname,
    isPublicRoute,
    isOnSettingsPage,
    isOnOnboardingPage,
    isOnCheckoutSuccessPage,
    protectedRoutes,
    shouldBlock: !hasValidSubscription && protectedRoutes && currentOrganization && user,
    user: user?.email
  });

  // Block access if no valid subscription (except on settings/onboarding pages)
  if (!hasValidSubscription && protectedRoutes && currentOrganization && user) {
    const reason = !subscription
      ? 'no_subscription'
      : subscription.status === 'canceled'
      ? 'canceled'
      : subscription.status === 'past_due'
      ? 'past_due'
      : 'expired';

    console.log('🚫 BLOCKING ACCESS - Reason:', reason);
    return (
      <AuthContext.Provider value={value}>
        <SubscriptionRequired reason={reason} />
      </AuthContext.Provider>
    );
  }

  // Show main app (onboarding redirect is handled by useEffect above)
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};