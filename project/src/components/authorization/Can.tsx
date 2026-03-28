import React from 'react';
import { Can as CASLCan } from '../../lib/casl/AbilityContext';
import type { Action, Subject } from '../../lib/casl/ability';
import { Button } from '@/components/ui/button';

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
 *   <Button>Create Farm</Button>
 * </Can>
 *
 * @example With fallback
 * <Can I="create" a="Farm" fallback={<div>Upgrade to create more farms</div>}>
 *   <Button>Create Farm</Button>
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
