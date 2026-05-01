/**
 * Self-service scoping helper.
 *
 * Roles that should ONLY ever see their own HR rows (leaves, slips, expenses,
 * appraisals, grievances, etc.) — even if they don't pass scope=mine.
 */
const SELF_ONLY_ROLES = new Set(['farm_worker', 'day_laborer', 'viewer']);

interface UserCtx {
  orgRole?: string | null;
  workerId?: string | null;
}

export interface SelfScope {
  /** When set, callers MUST filter by `worker_id = workerId`. */
  workerId: string | null;
  /** True if this is a forced self-only scope (worker can't override). */
  forced: boolean;
  /** True if the user requested `scope=mine` or is in a self-only role. */
  mine: boolean;
}

/**
 * Resolve the effective self-service scope for a request.
 *
 * - If user is in SELF_ONLY_ROLES → always restrict to their worker_id.
 * - Else if `requested === 'mine'` → restrict to their worker_id (opt-in).
 * - Else → no restriction (full org-wide list, subject to org policies).
 *
 * Throws when self-only is required but the user has no linked worker.
 */
export function resolveSelfScope(
  user: UserCtx,
  requested?: string | null,
): SelfScope {
  const isSelfOnlyRole = !!user.orgRole && SELF_ONLY_ROLES.has(user.orgRole);
  const optedIn = requested === 'mine';

  if (isSelfOnlyRole || optedIn) {
    if (!user.workerId) {
      // User has no worker record — they can only see their own rows by
      // contract, but no rows match. Return a sentinel that produces an
      // empty result set when applied as a filter.
      return { workerId: null, forced: isSelfOnlyRole, mine: true };
    }
    return { workerId: user.workerId, forced: isSelfOnlyRole, mine: true };
  }

  return { workerId: null, forced: false, mine: false };
}

/**
 * Apply a self-scope to a Supabase query builder. When `mine` is true and
 * `workerId` is null (user has no worker record), force a 0-row result.
 */
export function applySelfScope<T extends { eq: (col: string, val: any) => T; in: (col: string, val: any[]) => T }>(
  query: T,
  scope: SelfScope,
  workerColumn = 'worker_id',
): T {
  if (!scope.mine) return query;
  if (!scope.workerId) {
    // No linked worker → force empty result set.
    return query.in(workerColumn, []);
  }
  return query.eq(workerColumn, scope.workerId);
}
