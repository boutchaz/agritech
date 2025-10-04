import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/MultiTenantAuthProvider';
import type { UserRole, UserPermission, ResourceType, ActionType } from '../types/auth';

interface RoleBasedAccess {
  userRole: UserRole | null;
  userPermissions: UserPermission[];
  loading: boolean;
  error: string | null;
  hasPermission: (resource: ResourceType, action: ActionType) => boolean;
  hasAnyPermission: (permissions: Array<{ resource: ResourceType; action: ActionType }>) => boolean;
  hasRole: (roleName: string | string[]) => boolean;
  isAtLeastRole: (roleName: string) => boolean;
  canAccessResource: (resource: ResourceType) => boolean;
  refresh: () => Promise<void>;
}

export const useRoleBasedAccess = (): RoleBasedAccess => {
  const { user, currentOrganization } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserRoleAndPermissions = useCallback(async () => {
    if (!user?.id) {
      setUserRole(null);
      setUserPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get user role
      const { data: roleData, error: roleError } = await supabase
        .rpc('get_user_role', {
          user_id: user.id,
          org_id: currentOrganization?.id
        });

      if (roleError) throw roleError;

      // Get user permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .rpc('get_user_permissions', {
          user_id: user.id
        });

      if (permissionsError) throw permissionsError;

      setUserRole(roleData?.[0] || null);
      setUserPermissions(permissionsData || []);
    } catch (err) {
      console.error('Error fetching user role and permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch role and permissions');
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentOrganization?.id]);

  useEffect(() => {
    fetchUserRoleAndPermissions();
  }, [fetchUserRoleAndPermissions]);

  const hasPermission = useCallback((resource: ResourceType, action: ActionType): boolean => {
    return userPermissions.some(
      p => p.resource === resource && (p.action === action || p.action === 'manage')
    );
  }, [userPermissions]);

  const hasAnyPermission = useCallback((permissions: Array<{ resource: ResourceType; action: ActionType }>): boolean => {
    return permissions.some(({ resource, action }) => hasPermission(resource, action));
  }, [hasPermission]);

  const hasRole = useCallback((roleName: string | string[]): boolean => {
    if (!userRole) return false;
    const roles = Array.isArray(roleName) ? roleName : [roleName];
    return roles.includes(userRole.role_name);
  }, [userRole]);

  const isAtLeastRole = useCallback((roleName: string): boolean => {
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
  }, [userRole]);

  const canAccessResource = useCallback((resource: ResourceType): boolean => {
    return userPermissions.some(p => p.resource === resource);
  }, [userPermissions]);

  const refresh = useCallback(async () => {
    await fetchUserRoleAndPermissions();
  }, [fetchUserRoleAndPermissions]);

  return {
    userRole,
    userPermissions,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasRole,
    isAtLeastRole,
    canAccessResource,
    refresh,
  };
};

// Permission checker component
interface PermissionGuardProps {
  resource: ResourceType;
  action: ActionType;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  resource,
  action,
  fallback = null,
  children,
}) => {
  const { hasPermission, loading } = useRoleBasedAccess();

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>;
  }

  if (!hasPermission(resource, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Role checker component
interface RoleGuardProps {
  roles: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  roles,
  fallback = null,
  children,
}) => {
  const { hasRole, loading } = useRoleBasedAccess();

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>;
  }

  if (!hasRole(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Higher-order component for permission-based rendering
export const withPermission = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  resource: ResourceType,
  action: ActionType,
  fallback?: React.ComponentType<P>
) => {
  return (props: P) => {
    const { hasPermission, loading } = useRoleBasedAccess();

    if (loading) {
      return <div className="animate-pulse bg-gray-200 h-8 w-32 rounded"></div>;
    }

    if (!hasPermission(resource, action)) {
      return fallback ? <fallback {...props} /> : null;
    }

    return <WrappedComponent {...props} />;
  };
};