import { useModuleBasedDashboard } from './useModuleBasedDashboard';

/**
 * UI-level gate. Returns true only when the module identified by `slug` is
 * active for the current organization. Fails closed while modules are
 * still loading to avoid leaking access.
 *
 * Use this for embedded features that aren't dedicated routes:
 *   - AgromindIA tabs inside /parcels/:id
 *   - compliance badges, marketplace buttons inside other pages
 *   - dashboard widgets
 *
 * For route-level gating, use ModuleGate (which calls isNavigationEnabled
 * from useModuleBasedDashboard).
 */
export function useIsModuleActive(slug: string): boolean {
  const { activeModules, isLoading } = useModuleBasedDashboard();
  if (isLoading) return false;
  return activeModules.includes(slug);
}
