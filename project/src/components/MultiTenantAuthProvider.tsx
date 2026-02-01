import React, { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { authSupabase } from '../lib/auth-supabase';
import type { User } from '@supabase/supabase-js';
import type { UserRole } from '../types/auth';

import {
  useUserProfile,
  useUserOrganizations,
  useOrganizationFarms,
  useSignOut,
  useRefreshUserData
} from '../hooks/useAuthQueries';
import type { OrganizationWithRole } from '../lib/api/users';
import { useSubscription } from '../hooks/useSubscription';

import { useOrganizationStore } from '../stores/organizationStore';
import { useAuthStore, waitForHydration } from '../stores/authStore';
import { AuthContext, type AuthOrganization, type AuthFarm } from '../contexts/AuthContext';
import {
  setAnalyticsUserProperties,
  trackSessionStart,
  type AnalyticsUserProperties,
} from '../lib/analytics';

type Organization = AuthOrganization;
type Farm = AuthFarm;

const FALLBACK_ROLE_METADATA: Record<string, { display: string; level: number }> = {
  system_admin: { display: 'System Admin', level: 1 },
  organization_admin: { display: 'Organization Admin', level: 2 },
  farm_manager: { display: 'Farm Manager', level: 3 },
  farm_worker: { display: 'Farm Worker', level: 4 },
  day_laborer: { display: 'Day Laborer', level: 5 },
  viewer: { display: 'Viewer', level: 6 },
};

const toTitleCase = (value: string) =>
  value
    .split('_')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

export const MultiTenantAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [currentFarm, setCurrentFarm] = useState<Farm | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/onboarding/select-trial', '/set-password', '/auth/callback', '/blog'];

  // Routes that don't require password to be set (accessible with temporary password)
  const noPasswordRequiredRoutes = ['/tasks', '/auth/callback'];

  // TanStack Query hooks
  const { data: profile, isLoading: profileLoading } = useUserProfile(user?.id);
  const { data: organizations = [], isLoading: orgsLoading } = useUserOrganizations(user?.id);
  const { data: farms = [], isLoading: farmsLoading } = useOrganizationFarms(currentOrganization?.id);
  const { isLoading: subscriptionLoading } = useSubscription(currentOrganization);
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


  // Calculate onboarding state - check profile, organizations, and onboarding completion
  // IMPORTANT: Only calculate needsOnboarding if the session is actually valid
  const isSessionValid = !useAuthStore.getState().isTokenExpired() && !!useAuthStore.getState().getAccessToken();
  const needsOnboarding = isSessionValid && !!(
    user && !loading && (
      // No profile yet (missing required fields)
      !profile || !profile.full_name ||
      // No organizations yet
      organizations.length === 0 ||
      // Onboarding not marked as completed in user_profiles
      (profile && profile.onboarding_completed === false)
    )
  );



  // Get Zustand store actions
  const setOrganizationInStore = useOrganizationStore(state => state.setCurrentOrganization);

  // Handle organization change
  const handleSetCurrentOrganization = (org: Organization) => {
    setCurrentOrganization(org);
    setCurrentFarm(null); // Clear current farm when switching organizations

    // Clear all cached data when switching organizations to ensure fresh data
    queryClient.clear();

    // Save to both localStorage (for backward compatibility) and Zustand store
    localStorage.setItem('currentOrganization', JSON.stringify(org));
    setOrganizationInStore({
      id: org.id,
      name: org.name,
      description: undefined,
      slug: org.slug || undefined,
      currency_code: (org as unknown as OrganizationWithRole).currency_code || org.currency || undefined,
      timezone: org.timezone || undefined,
      is_active: org.is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  // Handle farm change
  const handleSetCurrentFarm = (farm: Farm) => {
    setCurrentFarm(farm);
    localStorage.setItem('currentFarm', JSON.stringify(farm));
    
    // Invalidate all farm-related queries to refresh dashboard and widgets
    // Use predicate to match any query that might be farm-related
    queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        // Check if query key contains farm-related terms
        const keyString = JSON.stringify(queryKey).toLowerCase();
        return (
          keyString.includes('farm') ||
          keyString.includes('parcel') ||
          keyString.includes('dashboard') ||
          keyString.includes('analys') ||
          keyString.includes('harvest') ||
          keyString.includes('task') ||
          keyString.includes('worker') ||
          keyString.includes('inventory') ||
          keyString.includes('stock') ||
          keyString.includes('sales-order') ||
          keyString.includes('invoice') ||
          keyString.includes('crop') ||
          keyString.includes('satellite') ||
          keyString.includes('intelligence') ||
          keyString.includes('lab-service') ||
          keyString.includes('piece-work') ||
          keyString.includes('metayage') ||
          keyString.includes('item-farm-usage') ||
          keyString.includes('farm-stock-levels')
        );
      },
    });
    
    // Also explicitly invalidate common query key patterns
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['parcels'] });
    queryClient.invalidateQueries({ queryKey: ['parcels-with-details'] });
    queryClient.invalidateQueries({ queryKey: ['analyses'] });
    queryClient.invalidateQueries({ queryKey: ['harvests'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['workers'] });
    queryClient.invalidateQueries({ queryKey: ['worker-stats'] });
    queryClient.invalidateQueries({ queryKey: ['worker-payment-history'] });
    queryClient.invalidateQueries({ queryKey: ['worker-payments'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['stock'] });
    queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: ['crops'] });
    queryClient.invalidateQueries({ queryKey: ['satellite'] });
    queryClient.invalidateQueries({ queryKey: ['production-intelligence'] });
    queryClient.invalidateQueries({ queryKey: ['lab-services'] });
    queryClient.invalidateQueries({ queryKey: ['piece-work'] });
    queryClient.invalidateQueries({ queryKey: ['farms'] });
    
    // Force refetch active queries immediately
    queryClient.refetchQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        const keyString = JSON.stringify(queryKey).toLowerCase();
        return (
          keyString.includes('farm') ||
          keyString.includes('parcel') ||
          keyString.includes('dashboard') ||
          keyString.includes('analys') ||
          keyString.includes('harvest') ||
          keyString.includes('task') ||
          keyString.includes('worker') ||
          keyString.includes('inventory') ||
          keyString.includes('stock')
        );
      },
    });
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

    const resolveFallbackRole = (roleName: string | null | undefined) => {
      if (!roleName) {
        return null;
      }

      const fallback = FALLBACK_ROLE_METADATA[roleName] ?? {
        display: toTitleCase(roleName),
        level: Number.MAX_SAFE_INTEGER,
      };

      return {
        role_name: roleName,
        role_display_name: fallback.display,
        role_level: fallback.level,
      };
    };

    try {
      // Use NestJS API endpoint to get user role
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const { getAccessToken } = await import('../stores/authStore');
      const accessToken = getAccessToken();

      if (!accessToken) {
        console.warn('⚠️ No access token for role fetch');
        // Fall back to role from organization object if available
        if (currentOrganization.role) {
          console.warn('ℹ️ Fallback: Using role from organization object:', currentOrganization.role);
          setUserRole(resolveFallbackRole(currentOrganization.role));
          return;
        }
        setUserRole(null);
        return;
      }

      const response = await fetch(
        `${API_URL}/api/v1/auth/me/role`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'X-Organization-Id': currentOrganization.id,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn('⚠️ Not authorized for role fetch, status:', response.status);
          // Fall back to role from organization object if available
          if (currentOrganization.role) {
            console.warn('ℹ️ Fallback: Using role from organization object:', currentOrganization.role);
            setUserRole(resolveFallbackRole(currentOrganization.role));
            return;
          }
          setUserRole(null);
          return;
        }
        throw new Error(`Role fetch failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data || !data.role) {
        console.warn('⚠️ No role found for user in organization from API');
        // Fall back to role from organization object if available
        if (currentOrganization.role) {
          console.warn('ℹ️ Fallback: Using role from organization object:', currentOrganization.role);
          setUserRole(resolveFallbackRole(currentOrganization.role));
          return;
        }
        setUserRole(null);
        return;
      }

      setUserRole({
        role_name: data.role.role_name,
        role_display_name: data.role.role_display_name,
        role_level: data.role.role_level
      });
    } catch (error) {
      console.error('Error fetching user role:', error);
      // Fall back to role from organization object if available
      if (currentOrganization.role) {
        console.warn('ℹ️ Fallback: Using role from organization object on error:', currentOrganization.role);
        setUserRole(resolveFallbackRole(currentOrganization.role));
        return;
      }
      setUserRole(resolveFallbackRole(null));
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
      // Try to restore from Zustand store first, then localStorage
      const storedOrg = useOrganizationStore.getState().currentOrganization;
      const savedOrgStr = localStorage.getItem('currentOrganization');

      let orgToRestore = null;

      // Try Zustand store first
      if (storedOrg) {
        const validOrg = organizations.find(o => o.id === storedOrg.id);
        if (validOrg) {
          orgToRestore = validOrg;
        }
      }

      // Fallback to localStorage if Zustand store doesn't have it
      if (!orgToRestore && savedOrgStr) {
        try {
          const org = JSON.parse(savedOrgStr);
          const validOrg = organizations.find(o => o.id === org.id);
          if (validOrg) {
            orgToRestore = validOrg;
          }
        } catch (error) {
          console.error('Error parsing saved organization:', error);
        }
      }

      // Use restored org or default to first organization
      const finalOrg = orgToRestore || organizations[0];
      setCurrentOrganization(finalOrg);

      // IMPORTANT: Also save to localStorage so services can read it immediately
      // This fixes the bug where parcels don't load on first render
      localStorage.setItem('currentOrganization', JSON.stringify(finalOrg));

      // Sync to Zustand store
      setOrganizationInStore({
        id: finalOrg.id,
        name: finalOrg.name,
        description: undefined,
        slug: finalOrg.slug || undefined,
        currency_code: (finalOrg as unknown as OrganizationWithRole).currency_code || undefined,
        timezone: finalOrg.timezone || undefined,
        is_active: finalOrg.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
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

  // Track session start and set user properties when authenticated
  useEffect(() => {
    if (user && profile && currentOrganization && userRole && !loading) {
      // Track session start
      trackSessionStart();

      // Determine organization size
      const orgSize = getOrganizationSize(organizations.length, farms.length);

      // Determine subscription tier from subscription data
      // Default to 'free' if no subscription data available
      const subscriptionTier = 'free'; // TODO: Get from actual subscription data
      const trialStatus = 'none'; // TODO: Get from actual trial data

      // Set user properties for analytics segmentation
      const userProps: AnalyticsUserProperties = {
        userId: user.id,
        email: user.email,
        signUpDate: profile.created_at || new Date().toISOString(),
        organizationId: currentOrganization.id,
        organizationSize: orgSize,
        subscriptionTier: subscriptionTier,
        trialStatus: trialStatus,
        role: userRole.role_name as AnalyticsUserProperties['role'],
        farmCount: farms.length,
        totalHectares: calculateTotalHectares(farms),
        platform: 'web',
      };

      setAnalyticsUserProperties(userProps);
    }
  }, [user?.id, profile, currentOrganization?.id, userRole, loading, farms, organizations]);

/**
 * Calculate total hectares from farms
 */
function calculateTotalHectares(farms: Farm[]): number {
  return farms.reduce((total, farm) => total + (farm.size || 0), 0);
}

/**
 * Determine organization size based on number of organizations and farms
 */
function getOrganizationSize(orgCount: number, farmCount: number): 'solo' | 'small' | 'medium' | 'large' {
  if (orgCount === 1 && farmCount <= 1) return 'solo';
  if (orgCount <= 2 && farmCount <= 5) return 'small';
  if (orgCount <= 5 && farmCount <= 20) return 'medium';
  return 'large';
}

  useEffect(() => {
    const initAuth = async () => {
      await waitForHydration();
      
      const state = useAuthStore.getState();
      const authUser = state.user;
      const isAuthenticated = state.isAuthenticated;

      setUser(authUser ? { id: authUser.id, email: authUser.email } as User : null);
      setShowAuth(!isAuthenticated);
      setAuthLoading(false);
    };

    const unsubscribe = useAuthStore.subscribe((state) => {
      if (!state._hasHydrated) {
        return;
      }

      const authUser = state.user;
      const isAuthenticated = state.isAuthenticated;

      setUser(authUser ? { id: authUser.id, email: authUser.email } as User : null);
      setShowAuth(!isAuthenticated);
      setAuthLoading(false);
    });

    initAuth();

    // For backward compatibility during migration, also listen to Supabase
    authSupabase.auth.getSession().then(({ data: { session } }) => {
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      if (session?.user && !isAuthenticated) {
        useAuthStore.getState().setUser({
          id: session.user.id,
          email: session.user.email || '',
        });
      }
    });

    // Listen for Supabase sign-out only (for backwards compatibility)
    // Don't clear auth on missing session - we use NestJS auth, not Supabase
    const { data: { subscription: supabaseSubscription } } = authSupabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setCurrentOrganization(null);
        setCurrentFarm(null);
        setShowAuth(true);
        useOrganizationStore.getState().clearOrganization();
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }
    });

    return () => {
      unsubscribe();
      supabaseSubscription.unsubscribe();
    };
  }, []);


  // Check if current route is public
  const isPublicRoute = publicRoutes.includes(location.pathname) || location.pathname.startsWith('/blog');
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

    if (!loading && !profileLoading && user && profile && profile.password_set !== true && !isOnSetPasswordPage && !isPublicRoute) {
      // User hasn't set their password - redirect to set-password
      window.location.href = '/set-password';
    }
  }, [loading, profileLoading, user, profile, isOnSetPasswordPage, isPublicRoute, location.pathname]);

  // Redirect to onboarding if user needs onboarding
  useEffect(() => {
    // Only check onboarding if all data is loaded
    if (!loading && !orgsLoading && !profileLoading && user && needsOnboarding && !isOnOnboardingPage && !isPublicRoute) {
      // IMPORTANT: Validate session is actually valid before redirecting to onboarding
      // This prevents redirecting users with expired tokens to onboarding
      const isTokenValid = !useAuthStore.getState().isTokenExpired();
      const hasAccessToken = !!useAuthStore.getState().getAccessToken();

      // Only redirect to onboarding if the session is truly valid
      if (isTokenValid && hasAccessToken) {
        console.log('[AuthProvider] Redirecting to onboarding - user needs onboarding');
        window.location.href = '/onboarding';
      } else {
        // Session is invalid - clear auth and redirect to login
        console.warn('[AuthProvider] Invalid session detected, clearing auth and redirecting to login');
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }
    }
  }, [loading, orgsLoading, profileLoading, user, needsOnboarding, isOnOnboardingPage, isPublicRoute]);



  const value = {
    user: user ? { id: user.id, email: user.email || '' } : null,
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('app.loading')}</p>
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

  // Subscription blocking is handled by _authenticated.tsx for authenticated routes
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
