import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import { ModuleGate } from './ModuleGate';
import type { Action, Subject } from '../../lib/casl/ability';

/**
 * HOC that wraps a route with both:
 * 1. Module activation check (is the module enabled for this org?)
 * 2. CASL permission check (does the user have the right role?)
 *
 * Module check runs first — if the module is disabled, the user sees
 * "Module not enabled" instead of "Access denied".
 *
 * Usage:
 *   component: withModuleProtection(MyPage, 'compliance', 'Compliance', 'read', 'Certification')
 */
export function withModuleProtection<P extends object>(
  Component: React.ComponentType<P>,
  moduleSlug: string,
  moduleName: string,
  action: Action,
  subject: Subject,
  redirectTo?: string,
) {
  const ProtectedComponent = (props: P) => {
    return (
      <ModuleGate moduleSlug={moduleSlug} moduleName={moduleName}>
        <ProtectedRoute action={action} subject={subject} redirectTo={redirectTo}>
          <Component {...props} />
        </ProtectedRoute>
      </ModuleGate>
    );
  };

  ProtectedComponent.displayName = `withModuleProtection(${Component.displayName || Component.name || 'Component'})`;

  return ProtectedComponent;
}

export default withModuleProtection;
