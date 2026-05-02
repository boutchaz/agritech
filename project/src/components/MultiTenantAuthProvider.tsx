import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { UserRole } from '../types/auth';

interface User {
  id: string;
  email: string;
}

import {
  useUserProfile,
  useUserOrganizations,
  useOrganizationFarms,
  useSignOut,
  useRefreshUserData
} from '../hooks/useAuthQueries';
import type { OrganizationWithRole } from '../lib/api/users';

import { useOrganizationStore } from '../stores/organizationStore';
import { useFarmStore } from '../stores/farmStore';
import { useAuthStore, waitForHydration } from '../stores/authStore';
import { AuthContext, type AuthOrganization, type AuthFarm } from '../contexts/AuthContext';
import {
  setAnalyticsUserProperties,
  trackSessionStart,
  trackEvent,
  type AnalyticsUserProperties,
} from '../lib/analytics';
import { AuthenticatedLayoutSkeleton } from '@/components/AuthenticatedLayoutSkeleton';


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

export const MultiTenantAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { t: _t } = useTranslation();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  // currentFarm lives in Zustand (persisted) — single source of truth, no manual
  // localStorage/useState dual-write that previously caused stale "Farm undefine" rows.
  const currentFarm = useFarmStore((s) => s.currentFarm) as Farm | null;
  const setCurrentFarm = useFarmStore((s) => s.setCurrentFarm);
  const clearFarm = useFarmStore((s) => s.clearFarm);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/onboarding',
    '/onboarding/profile',
    '/onboarding/account-type',
    '/onboarding/farm',
    '/onboarding/surface',
    '/onboarding/select-trial',
    '/onboarding/complete',
    '/set-password',
    '/auth/callback',
    '/blog',
    '/terms-of-service',
    '/privacy-policy',
    '/rdv',
    '/rdv-siam',
  ];

  // Routes that don't require password to be set (accessible with temporary password)
  const noPasswordRequiredRoutes = ['/tasks', '/auth/callback'];

  // TanStack Query hooks
  const { data: profile, isLoading: profileLoading, isError: profileError } = useUserProfile(user?.id);
  const { data: organizations = [], isLoading: orgsLoading, isError: orgsError } = useUserOrganizations(user?.id);
  const { data: farms = [], isLoading: farmsLoading } = useOrganizationFarms(currentOrganization?.id);
  const signOutMutation = useSignOut();
  const refreshMutation = useRefreshUserData();

  // Validate organizations data
  useEffect(() => {
    if (organizations.length > 0) {
      const invalidOrg = organizations.find(o => !o.id || typeof o.id !== 'string');
      if (invalidOrg) {
        console.error('[MultiTenantAuthProvider] ERROR: Organization has invalid ID!', {
          organization: invalidOrg,
          id: invalidOrg.id,
          idType: typeof invalidOrg.id
        });
      }
    }
  }, [organizations]);

  // Calculate loading state
  // IMPORTANT: Also wait for currentOrganization to be set when we have organizations
  const waitingForOrganization = organizations.length > 0 && !currentOrganization && !orgsLoading;

  // Don't block the shell on subscription: `/_authenticated` already gates on `useSubscription`.
  // Waiting here caused infinite "loading" when the subscription request hung or retry-looped.
  const isOnOnboardingPage = location.pathname.startsWith('/onboarding');
  const loading =
    authLoading ||
    profileLoading ||
    orgsLoading ||
    (!isOnOnboardingPage && farmsLoading) ||
    waitingForOrganization;


  const isSessionValid = !useAuthStore.getState().isTokenExpired() && !!useAuthStore.getState().getAccessToken();
  const hasCompletedOnboarding = profile?.onboarding_completed === true;
  const needsOnboarding = isSessionValid && !profileError && !orgsError && !!(
    user && !loading && !hasCompletedOnboarding
  );



  // Get Zustand store actions
  const setOrganizationInStore = useOrganizationStore(state => state.setCurrentOrganization);

  // Handle organization change
  const handleSetCurrentOrganization = (org: Organization) => {
    setCurrentOrganization(org);
    clearFarm(); // Clear current farm when switching organizations

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


    // Invalidate farm-dependent queries to refresh dashboard and widgets.
    // IMPORTANT: Do NOT invalidate the 'farms' query itself — the list of farms
    // doesn't change when switching the active farm. Invalidating it causes a
    // refetch that can momentarily empty the farm selector dropdown (the query
    // returns new object references, the sync effect re-fires, potentially
    // causing cascading invalidations).
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
    queryClient.invalidateQueries({ queryKey: ['item-farm-usage'] });
    queryClient.invalidateQueries({ queryKey: ['farm-stock-levels'] });
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
        // Fall back to role from organization object if available
        if (currentOrganization.role) {
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
          // Fall back to role from organization object if available
          if (currentOrganization.role) {
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
        // Fall back to role from organization object if available
        if (currentOrganization.role) {
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

      // Validate Zustand store data
      if (storedOrg && (!storedOrg.id || typeof storedOrg.id !== 'string')) {
        console.error('[MultiTenantAuthProvider] ERROR: Corrupted data in Zustand store, clearing...', storedOrg);
        useOrganizationStore.getState().clearOrganization();
      }

      // Validate localStorage data
      if (savedOrgStr) {
        try {
          const parsedOrg = JSON.parse(savedOrgStr);
          if (!parsedOrg.id || typeof parsedOrg.id !== 'string') {
            console.error('[MultiTenantAuthProvider] ERROR: Corrupted data in localStorage, clearing...', parsedOrg);
            localStorage.removeItem('currentOrganization');
          }
        } catch (error) {
          console.error('[MultiTenantAuthProvider] ERROR: Failed to parse localStorage data, clearing...', error);
          localStorage.removeItem('currentOrganization');
        }
      }

      let orgToRestore = null;

      // Try Zustand store first (re-read after validation)
      const validatedStoredOrg = useOrganizationStore.getState().currentOrganization;
      if (validatedStoredOrg) {
        const validOrg = organizations.find(o => o.id === validatedStoredOrg.id);
        if (validOrg) {
          orgToRestore = validOrg;
        }
      }

      // Fallback to localStorage if Zustand store doesn't have it (re-read after validation)
      const validatedSavedOrgStr = localStorage.getItem('currentOrganization');
      if (!orgToRestore && validatedSavedOrgStr) {
        try {
          const org = JSON.parse(validatedSavedOrgStr);
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

  // Set default farm when farms load. Persisted selection (Zustand) survives
  // reloads automatically; we only need to default when nothing is selected.
  // Skip stale entries with missing/blank id (can leak in via persisted query cache
  // from before useOrganizationFarms gained its id filter) — the store validator
  // would otherwise silently reject them and we'd loop with currentFarm = null.
  useEffect(() => {
    if (currentFarm) return;
    const firstValid = farms.find(
      (f) => typeof f?.id === 'string' && f.id.trim().length > 0,
    );
    if (firstValid) setCurrentFarm(firstValid);
  }, [farms, currentFarm, setCurrentFarm]);

  // Keep currentOrganization in sync with latest `organizations` list.
  // Fixes stale approval_status / is_active / role after admin approval — without
  // this, local state holds the cached org from session start and the gate in
  // _authenticated.tsx keeps showing PendingApproval even when the API returns approved.
  useEffect(() => {
    if (organizations.length === 0) return;
    if (!currentOrganization) return;

    const match = organizations.find(o => o.id === currentOrganization.id);
    if (!match) return;

    const stale =
      currentOrganization.approval_status !== match.approval_status ||
      currentOrganization.is_active !== match.is_active ||
      currentOrganization.role !== match.role ||
      currentOrganization.name !== match.name;

    if (stale) {
      setCurrentOrganization(match);
      localStorage.setItem('currentOrganization', JSON.stringify(match));
    }
  }, [organizations, currentOrganization]);

  // Keep currentFarm in sync with latest `farms` list (refresh name + parcel-derived
  // total_area, replace stale id when the persisted farm was deleted/reorganized,
  // or clear it when the persisted selection belongs to a different account/org).
  useEffect(() => {
    if (farmsLoading) return; // wait for the fetch to settle before deciding
    if (!currentFarm) return;

    const match = farms.find(f => f.id === currentFarm.id);
    if (!match) {
      // Persisted selection no longer exists in this org/account — drop it instead
      // of falling back to farms[0], so the onboarding "create your first farm"
      // empty state actually appears for new users.
      if (farms.length === 0) {
        clearFarm();
      } else {
        setCurrentFarm(farms[0]);
      }
      return;
    }

    const cur = currentFarm as typeof match & { total_area?: number };
    const matchTa = (match as { total_area?: number }).total_area;
    if (cur.total_area !== matchTa || cur.name !== match.name) {
      setCurrentFarm(match);
    }
  }, [farms, currentFarm, farmsLoading, setCurrentFarm, clearFarm]);

  // Fetch user role when user or organization changes
  useEffect(() => {
    fetchUserRole();
  }, [user?.id, currentOrganization?.id]);

  // Track session start and set user properties when authenticated (fire once)
  const analyticsTrackedRef = React.useRef(false);

  useEffect(() => {
    if (analyticsTrackedRef.current) return;
    if (!user || !currentOrganization || !userRole || loading) return;

    analyticsTrackedRef.current = true;
    trackSessionStart();
    setAnalyticsUserProperties({
      userId: user.id,
      email: user.email,
      signUpDate: profile?.created_at || new Date().toISOString(),
      organizationId: currentOrganization.id,
      organizationSize: getOrganizationSize(organizations.length, farms.length),
      subscriptionTier: 'free', // simplified — no extra subscription query needed here
      trialStatus: 'none',
      role: userRole.role_name as AnalyticsUserProperties['role'],
      farmCount: farms.length,
      totalHectares: farms.reduce((t, f) => t + (f.size || 0), 0),
      platform: 'web',
    });
  }, [user?.id, currentOrganization?.id, userRole?.role_name, loading]);

  const SESSION_HEARTBEAT_MS = 5 * 60 * 1000;

  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      trackEvent({ action: 'session_heartbeat', category: 'Engagement' });
    }, SESSION_HEARTBEAT_MS);

    return () => clearInterval(interval);
  }, [user?.id]);

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

    return () => {
      unsubscribe();
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
      const isTokenValid = !useAuthStore.getState().isTokenExpired();
      const hasAccessToken = !!useAuthStore.getState().getAccessToken();

      if (isTokenValid && hasAccessToken) {
        window.location.href = '/onboarding';
      } else {
        const hasRefreshToken = !!useAuthStore.getState().tokens?.refresh_token;
        if (hasRefreshToken) {
          useAuthStore.getState().refreshAccessToken().then((refreshed) => {
            if (refreshed) {
              window.location.href = '/onboarding';
            } else {
              window.location.href = '/login';
            }
          });
        } else {
          window.location.href = '/login';
        }
      }
    }
  }, [loading, orgsLoading, profileLoading, user, needsOnboarding, isOnOnboardingPage, isPublicRoute]);



  const stableUser = useMemo(
    () => (user ? { id: user.id, email: user.email || '' } : null),
    [user?.id, user?.email],
  );

  const value = useMemo(
    () => ({
      user: stableUser,
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
    }),
     
    [stableUser, profile, organizations, currentOrganization, farms, currentFarm, userRole, loading, needsOnboarding],
  );

  // Show full layout skeleton while auth data loads (but not on public routes)
  if (loading && !isPublicRoute) {
    return <AuthenticatedLayoutSkeleton />;
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
