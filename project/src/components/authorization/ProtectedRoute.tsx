import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAbility } from '../../lib/casl/AbilityContext';
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
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  action,
  subject,
  children,
  redirectTo = '/tasks',
}) => {
  const ability = useAbility();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has permission
    if (!ability.can(action, subject)) {
      console.warn(`Access denied to ${subject}. Required: ${action}`);
      navigate({ to: redirectTo });
    }
  }, [ability, action, subject, navigate, redirectTo]);

  // If no permission, don't render anything (redirect will happen)
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
            Redirecting...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
