import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * Component to protect routes based on user role
 * If user doesn't have required role, shows access denied or redirects
 */
export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/settings/account'
}) => {
  const { userRole, loading, currentOrganization, refreshUserData } = useAuth();

  // Show loading state while checking role
  // Also show loading if we have an organization but role is still being fetched
  const isWaitingForRole = currentOrganization && !userRole && !loading;
  if (loading || isWaitingForRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  // Use userRole if available, otherwise fall back to organization.role
  const effectiveRole = userRole?.role_name || currentOrganization?.role;

  // If no role after loading completes AND no organization role, show error
  if (!effectiveRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Rôle non détecté
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Impossible de charger vos permissions pour cette organisation.
          </p>
          {currentOrganization && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              Organisation: {currentOrganization.name}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => refreshUserData()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
            <Button
              onClick={() => window.location.href = redirectTo}
              className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg transition-colors"
            >
              Retour
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has required role
  const hasAccess = allowedRoles.includes(effectiveRole);

  if (!hasAccess) {
    // Show access denied message
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Accès refusé
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Rôle requis: {allowedRoles.join(', ')}
          </p>
          <Button
            onClick={() => window.location.href = redirectTo}
            className="inline-flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
          >
            Retour aux paramètres
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
