import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import type { Action, Subject } from '../../lib/casl/ability';

/**
 * Higher-order component that wraps a route component with CASL permission checking
 * Usage: component: withRouteProtection(MyComponent, 'read', 'Dashboard')
 */
export function withRouteProtection<P extends object>(
  Component: React.ComponentType<P>,
  action: Action,
  subject: Subject,
  redirectTo?: string
) {
  const ProtectedComponent: React.FC<P> = (props) => {
    return (
      <ProtectedRoute action={action} subject={subject} redirectTo={redirectTo}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };

  // Set display name for debugging
  ProtectedComponent.displayName = `withRouteProtection(${Component.displayName || Component.name || 'Component'})`;

  return ProtectedComponent;
}

export default withRouteProtection;
