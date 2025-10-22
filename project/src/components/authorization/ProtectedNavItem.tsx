import React from 'react';
import { useAbility } from '../../lib/casl/AbilityContext';
import type { Action, Subject } from '../../lib/casl/ability';

interface ProtectedNavItemProps {
  action: Action;
  subject: Subject;
  children: React.ReactNode;
}

/**
 * Component that only renders navigation items if the user has permission
 * Used in Sidebar to hide unauthorized menu items
 */
export const ProtectedNavItem: React.FC<ProtectedNavItemProps> = ({
  action,
  subject,
  children,
}) => {
  const ability = useAbility();

  // Check if user has permission
  if (!ability.can(action, subject)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedNavItem;
