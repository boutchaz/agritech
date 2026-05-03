/**
 * Pure module-gating logic. Used by useModuleBasedDashboard and ModuleGate.
 *
 * Given a runtime path and the module catalog (each module has a list of
 * `navigation_items` which may contain React-Router style `:param` placeholders),
 * find the module that OWNS the path using longest-prefix-wins.
 */

export interface ModuleNavInfo {
  slug: string;
  navigationItems: string[];
}

/**
 * Convert a nav_item path-pattern to a RegExp that matches runtime paths.
 * - `:id`, `:slug`, etc. become a segment wildcard `[^/]+`
 * - Segment boundary is enforced: `/parcels` must NOT match `/parcelsXYZ`
 *   but MUST match `/parcels` and `/parcels/...`
 */
function navPatternToRegex(nav: string): RegExp {
  // Replace :param / $param with a sentinel BEFORE regex-escaping, so the
  // `$` prefix in the TanStack convention isn't escaped into `\$`.
  const PARAM_SENTINEL = '\x00PARAM\x00';
  const escaped = nav
    .replace(/[:$][^/]+/g, PARAM_SENTINEL)
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(new RegExp(PARAM_SENTINEL, 'g'), '[^/]+');
  return new RegExp(`^${escaped}(?=/|$)`);
}

/**
 * Returns the slug of the module whose navigation_items contains the
 * longest path-pattern that matches `path`. Returns null when no nav_item
 * matches.
 *
 * "Longest" = longest literal pattern string (before regex expansion).
 * Tie-breaker: first in iteration order — callers should sort modules by
 * display_order if ties need deterministic resolution.
 */
export function findOwningModuleSlug(
  path: string,
  modules: ModuleNavInfo[],
): string | null {
  let bestLength = -1;
  let bestSlug: string | null = null;

  for (const m of modules) {
    for (const nav of m.navigationItems) {
      if (typeof nav !== 'string' || nav.length === 0) continue;
      const re = navPatternToRegex(nav);
      if (re.test(path) && nav.length > bestLength) {
        bestLength = nav.length;
        bestSlug = m.slug;
      }
    }
  }

  return bestSlug;
}

/**
 * True when the path is owned by an ACTIVE module (strict mode).
 *
 * - If a module claims the path (longest-prefix-wins) and is active → allowed
 * - If a module claims the path but is NOT active → blocked
 * - If NO module claims the path → BLOCKED (strict: unclaimed = blocked)
 *
 * This ensures every route must be explicitly registered in some module's
 * navigation_items to be visible. Orphan routes are blocked by default.
 * Routes not yet ready (e.g. lab-services) stay unclaimed and inaccessible.
 */
export function isPathEnabled(
  path: string,
  modules: ModuleNavInfo[],
  activeSlugs: Set<string> | string[],
): boolean {
  const slug = findOwningModuleSlug(path, modules);
  if (slug === null) return false;
  const set = activeSlugs instanceof Set ? activeSlugs : new Set(activeSlugs);
  return set.has(slug);
}
