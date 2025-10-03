import React from 'react';
import { Can as CASLCan } from '../../lib/casl/AbilityContext';
import type { Action, Subject } from '../../lib/casl/ability';

interface CanProps {
  I: Action;
  a: Subject;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component to conditionally render based on permissions
 *
 * @example
 * <Can I="create" a="Farm">
 *   <button>Create Farm</button>
 * </Can>
 *
 * @example With fallback
 * <Can I="create" a="Farm" fallback={<div>Upgrade to create more farms</div>}>
 *   <button>Create Farm</button>
 * </Can>
 */
export const Can: React.FC<CanProps> = ({ I, a, children, fallback }) => {
  return (
    <CASLCan I={I} a={a} passThrough>
      {(allowed) => (allowed ? <>{children}</> : fallback ? <>{fallback}</> : null)}
    </CASLCan>
  );
};

export default Can;
