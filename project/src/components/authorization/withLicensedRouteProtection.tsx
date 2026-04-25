import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import { ModuleGate } from './ModuleGate';
import type { Action, Subject } from '../../lib/casl/ability';

/**
 * Higher-order component for routes that require both:
 * 1. An active licensed module for the current organization.
 * 2. The expected CASL permission for the current user.
 */
export function withLicensedRouteProtection<P extends object>(
  Component: React.ComponentType<P>,
  action: Action,
  subject: Subject,
  redirectTo?: string,
) {
  const ProtectedComponent = (props: P) => {
    return (
      <ModuleGate>
        <ProtectedRoute action={action} subject={subject} redirectTo={redirectTo}>
          <Component {...props} />
        </ProtectedRoute>
      </ModuleGate>
    );
  };

  ProtectedComponent.displayName = `withLicensedRouteProtection(${Component.displayName || Component.name || 'Component'})`;

  return ProtectedComponent;
}

export default withLicensedRouteProtection;
