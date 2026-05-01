import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { tauriCommands, type LocalUser, type OrganizationWithRole } from '../lib/tauri-bridge';
import type { UserRole } from '../types/auth';
import {
  AuthContext,
  type AuthContextType,
  type AuthOrganization,
  type AuthFarm,
  type AuthUserProfile,
  type AuthUser,
} from '../contexts/AuthContext';
import { PageLoader } from '@/components/ui/loader';
import { useFarmStore } from '../stores/farmStore';


const ROLE_HIERARCHY: Record<string, number> = {
  system_admin: 1,
  organization_admin: 2,
  farm_manager: 3,
  farm_worker: 4,
  day_laborer: 5,
  viewer: 6,
};



export const LocalAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [user, setUser] = useState<LocalUser | null>(null);
  const [organizations, setOrganizations] = useState<AuthOrganization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<AuthOrganization | null>(null);
  const [farms, setFarms] = useState<AuthFarm[]>([]);
  const currentFarm = useFarmStore((s) => s.currentFarm) as AuthFarm | null;
  const setCurrentFarm = useFarmStore((s) => s.setCurrentFarm);
  const clearFarm = useFarmStore((s) => s.clearFarm);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsImport, setNeedsImport] = useState(true);

  // Map LocalUser to AuthUser
  const authUser: AuthUser | null = user
    ? { id: user.id, email: user.email }
    : null;

  // Map to AuthUserProfile
  const profile: AuthUserProfile | null = user
    ? {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        full_name: user.full_name,
        timezone: 'Africa/Casablanca',
        language: 'en',
        onboarding_completed: true,
      }
    : null;

  const needsOnboarding = false;

  const handleSetCurrentOrganization = (org: AuthOrganization) => {
    setCurrentOrganization(org);
    clearFarm();
    queryClient.clear();
    localStorage.setItem('currentOrganization', JSON.stringify(org));
    loadFarms(org.id);
  };

  const handleSetCurrentFarm = (farm: AuthFarm) => {
    setCurrentFarm(farm);
    queryClient.invalidateQueries();
  };

  const signOut = async () => {
    const sessionId = localStorage.getItem('agritech_desktop_session');
    if (sessionId) {
      await tauriCommands.auth.logout(sessionId);
    }
    localStorage.removeItem('agritech_desktop_session');
    localStorage.removeItem('currentOrganization');
    setUser(null);
    setOrganizations([]);
    setCurrentOrganization(null);
    setFarms([]);
    clearFarm();
    queryClient.clear();
    navigate({ to: '/login' });
  };

  const refreshUserData = async () => {
    if (user) {
      await loadOrganizations(user.id);
    }
  };

  const hasRole = (roleName: string | string[]): boolean => {
    if (!userRole) return false;
    const roles = Array.isArray(roleName) ? roleName : [roleName];
    return roles.includes(userRole.role_name);
  };

  const isAtLeastRole = (roleName: string): boolean => {
    if (!userRole) return false;
    const userLevel = ROLE_HIERARCHY[userRole.role_name];
    const requiredLevel = ROLE_HIERARCHY[roleName];
    return userLevel <= requiredLevel;
  };

  const loadFarms = async (orgId: string) => {
    try {
      const farmsData = await tauriCommands.farms.getAll(orgId);
      const mappedFarms: AuthFarm[] = farmsData.map(f => ({
        id: f.id,
        name: f.name,
        location: f.location,
        size: f.size,
        manager_name: f.manager_name,
      }));
      setFarms(mappedFarms);

      // Drop a persisted selection that no longer belongs to this account/org
      // (e.g. logged in as a different user with the previous farm-storage still in localStorage).
      if (currentFarm && !mappedFarms.some(f => f.id === currentFarm.id)) {
        if (mappedFarms.length === 0) {
          clearFarm();
        } else {
          setCurrentFarm(mappedFarms[0]);
        }
      } else if (mappedFarms.length > 0 && !currentFarm) {
        setCurrentFarm(mappedFarms[0]);
      }
    } catch (error) {
      console.error('Failed to load farms:', error);
    }
  };

  const loadOrganizations = async (userId: string) => {
    try {
      const orgsData = await tauriCommands.organizations.getAll(userId);
      
      const mappedOrgs: AuthOrganization[] = orgsData.map((o: OrganizationWithRole) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        role: o.role,
        role_id: o.role_id,
        is_active: o.is_active,
        onboarding_completed: o.onboarding_completed,
        currency: o.currency ?? undefined,
        timezone: o.timezone ?? undefined,
        language: o.language ?? undefined,
      }));
      
      setOrganizations(mappedOrgs);
      setNeedsImport(mappedOrgs.length === 0);
      
      if (mappedOrgs.length > 0 && !currentOrganization) {
        const savedOrg = localStorage.getItem('currentOrganization');
        if (savedOrg) {
          try {
            const parsed = JSON.parse(savedOrg);
            const valid = mappedOrgs.find(o => o.id === parsed.id);
            if (valid) {
              setCurrentOrganization(valid);
              setUserRole({
                role_name: valid.role,
                role_display_name: valid.role.replace('_', ' '),
                role_level: ROLE_HIERARCHY[valid.role] || 6,
              });
              await loadFarms(valid.id);
              return;
            }
          } catch {
            // Failed to parse saved organization
          }
        }
        
        const firstOrg = mappedOrgs[0];
        setCurrentOrganization(firstOrg);
        setUserRole({
          role_name: firstOrg.role,
          role_display_name: firstOrg.role.replace('_', ' '),
          role_level: ROLE_HIERARCHY[firstOrg.role] || 6,
        });
        await loadFarms(firstOrg.id);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setNeedsImport(true);
    }
  };

  const location = useLocation();
  const isOnImportPage = location.pathname === '/import-data';
  const isOnLoginPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password';
  const isOnPublicPage = location.pathname === '/' || isOnLoginPage;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await tauriCommands.auth.checkStatus();
        if (status.is_authenticated && status.user) {
          setUser(status.user);
          await loadOrganizations(status.user.id);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading && user && needsImport && !isOnImportPage && !isOnPublicPage) {
      window.location.href = '/import-data';
    }
  }, [loading, user, needsImport, isOnImportPage, isOnPublicPage]);

  const value: AuthContextType = {
    user: authUser,
    profile,
    organizations,
    currentOrganization,
    farms,
    currentFarm,
    userRole,
    loading,
    needsOnboarding,
    needsImport,
    setCurrentOrganization: handleSetCurrentOrganization,
    setCurrentFarm: handleSetCurrentFarm,
    signOut,
    refreshUserData,
    hasRole,
    isAtLeastRole,
  };

  if (loading) {
    return (
      <PageLoader />
    );
  }

  if (user && needsImport && !isOnImportPage && !isOnPublicPage) {
    return (
      <PageLoader />
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
