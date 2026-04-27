import { useMemo } from 'react';
import { useModuleBasedDashboard } from './useModuleBasedDashboard';

/**
 * Returns whether the given module slug is currently active for the org,
 * suitable for gating TanStack Query hooks via `enabled:`.
 *
 * While module data loads we return `false` so queries don't briefly fire
 * against an endpoint the org might not have access to (avoids 403 noise on
 * cross-module data dependencies — e.g. QuoteForm reading stock levels).
 *
 * Usage:
 *   const stockEnabled = useModuleEnabled('stock');
 *   useQuery({ ..., enabled: stockEnabled && !!orgId });
 */
export function useModuleEnabled(slug: string): boolean {
  const { activeModules, isLoading } = useModuleBasedDashboard();
  return useMemo(() => {
    if (isLoading) return false;
    return activeModules.includes(slug);
  }, [activeModules, isLoading, slug]);
}
