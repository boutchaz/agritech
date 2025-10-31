import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAbility } from '../../lib/casl/AbilityContext';
import { useAuth } from '../MultiTenantAuthProvider';
import type { Action, Subject } from '../../lib/casl/ability';

interface ProtectedRouteProps {
  action: Action;
  subject: Subject;
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * Component that protects routes based on CASL permissions
 * Redirects unauthorized users to a safe location (default: /tasks)
 *
 * IMPORTANT: This component waits for auth to fully load before checking permissions
 * to avoid race conditions where guest abilities are evaluated before user data loads.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  action,
  subject,
  children,
  redirectTo = '/tasks',
}) => {
  const ability = useAbility();
  const { loading: authLoading, user, currentOrganization, userRole } = useAuth();
  const navigate = useNavigate();

  // Check if ability has rules loaded AND auth has finished loading
  const hasRulesLoaded = ability.rules && ability.rules.length > 0;
  const authFullyLoaded = !authLoading && user && currentOrganization && userRole;
  const isReady = hasRulesLoaded && authFullyLoaded;

  useEffect(() => {
    // Only check permission after BOTH auth and rules are fully loaded
    if (isReady && !ability.can(action, subject)) {
      console.warn(`Access denied to ${subject}. Required: ${action}`, {
        user: user?.email,
        role: userRole?.role_name,
        organization: currentOrganization?.name,
      });
      navigate({ to: redirectTo });
    }
  }, [ability, action, subject, navigate, redirectTo, isReady, user, userRole, currentOrganization]);

  // Show loading while auth is loading OR rules aren't loaded yet
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {authLoading ? 'Loading authentication...' : 'Loading permissions...'}
          </p>
        </div>
      </div>
    );
  }

  // If no permission after everything is loaded, show access denied
  if (!ability.can(action, subject)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-4">
            Required: {action} on {subject}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
            Your role: {userRole?.role_name || 'Unknown'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
