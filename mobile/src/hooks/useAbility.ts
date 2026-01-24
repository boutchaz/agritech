/**
 * Hook for checking CASL permissions in components
 *
 * Example usage:
 * ```tsx
 * const { can, cannot } = useAbility();
 *
 * // Check if user can create invoices
 * if (can('create', 'Invoice')) {
 *   // Show create button
 * }
 *
 * // Check if user cannot delete tasks
 * if (cannot('delete', 'Task')) {
 *   // Hide delete button
 * }
 * ```
 */

import { useAuthStore } from '@/stores/authStore';
import type { Action, Subject } from '@/lib/ability';

/**
 * Hook to access CASL abilities for permission checking
 */
export function useAbility() {
  const ability = useAuthStore((state) => state.ability);

  return {
    /**
     * Check if user can perform an action on a subject
     */
    can: (action: Action, subject: Subject) => ability.can(action, subject),

    /**
     * Check if user cannot perform an action on a subject
     */
    cannot: (action: Action, subject: Subject) => ability.cannot(action, subject),

    /**
     * Get the user's role level
     */
    getRoleLevel: () => ability.getRoleLevel(),

    /**
     * Check if user has at least a certain role level
     */
    hasMinimumRoleLevel: (level: number) => ability.hasMinimumRoleLevel(level),

    /**
     * The underlying ability instance
     */
    ability,
  };
}

/**
 * Hook to check a specific permission
 *
 * Example:
 * ```tsx
 * const canCreateHarvest = useCan('create', 'Harvest');
 * ```
 */
export function useCan(action: Action, subject: Subject): boolean {
  const ability = useAuthStore((state) => state.ability);
  return ability.can(action, subject);
}

/**
 * Hook to check if a permission is denied
 *
 * Example:
 * ```tsx
 * const cannotDeleteTask = useCannot('delete', 'Task');
 * ```
 */
export function useCannot(action: Action, subject: Subject): boolean {
  const ability = useAuthStore((state) => state.ability);
  return ability.cannot(action, subject);
}
