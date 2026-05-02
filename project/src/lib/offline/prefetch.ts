import type { QueryClient } from '@tanstack/react-query';
import { farmHierarchyApi } from '../api/farm-hierarchy';
import { tasksApi } from '../api/tasks';
import { workersApi } from '../api/workers';
import { stockEntriesApi } from '../api/stock';
import { parcelsApi } from '../api/parcels';
import { harvestsApi } from '../api/harvests';
import { analysesApi } from '../api/analyses';
import { usersApi } from '../api/users';
import { dashboardService } from '../../services/dashboardService';
import { db } from './db';
import { telemetry } from './telemetry';
import { isLikelyOnline } from './useOnlineStatus';

export interface PrefetchStep {
  name: string;
  queryKey: readonly unknown[];
  queryFn: () => Promise<unknown>;
  /** If true, failure of this step does not abort the run. */
  optional?: boolean;
}

export interface PrefetchProgress {
  total: number;
  completed: number;
  currentStep: string | null;
  isRunning: boolean;
  lastError: string | null;
  lastRunAt: number | null;
}

const META_KEY = 'prefetch:state:v1';
// Re-run every 30 min instead of 24h so users get fresh data within a
// working session (and so testing offline doesn't require waiting a day).
const RERUN_INTERVAL_MS = 30 * 60 * 1000;
const STEP_TIMEOUT_MS = 30_000;

interface MetaState {
  organizationId: string;
  completedSteps: string[];
  lastRunAt: number;
  lastError: string | null;
}

async function loadMeta(): Promise<MetaState | null> {
  const row = await db().meta.get(META_KEY);
  return (row?.value as MetaState | undefined) ?? null;
}

async function saveMeta(state: MetaState): Promise<void> {
  await db().meta.put({ key: META_KEY, value: state, updatedAt: Date.now() });
}

async function clearMeta(): Promise<void> {
  await db().meta.delete(META_KEY);
}

export function buildPrefetchPlan(organizationId: string): PrefetchStep[] {
  // Only fetch what a field worker actually needs offline. Skip history,
  // analytics, and anything heavy. Filters mirror what the corresponding
  // hooks request so persisted entries match the live queryKey.
  const today = new Date();
  const sevenDaysOut = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const taskFilters = {
    date_from: today.toISOString().slice(0, 10),
    date_to: sevenDaysOut.toISOString().slice(0, 10),
  };
  const taskFilterKey = JSON.stringify(taskFilters);

  return [
    {
      name: 'farm-hierarchy',
      queryKey: ['farm-hierarchy', organizationId],
      queryFn: () => farmHierarchyApi.getOrganizationFarms(organizationId),
    },
    {
      name: 'parcels',
      queryKey: ['parcels', organizationId],
      queryFn: () => parcelsApi.getAll({}, organizationId),
      optional: true,
    },
    {
      name: 'tasks',
      queryKey: ['tasks', organizationId, taskFilterKey],
      queryFn: () => tasksApi.getAll(organizationId, taskFilters),
    },
    {
      name: 'task-categories',
      queryKey: ['task-categories', organizationId],
      queryFn: () => tasksApi.getCategories(organizationId),
      optional: true,
    },
    {
      name: 'workers',
      queryKey: ['workers', organizationId, undefined],
      queryFn: () => workersApi.getAll(undefined, organizationId),
    },
    {
      name: 'active-workers',
      queryKey: ['active-workers', organizationId],
      queryFn: () => workersApi.getActive(organizationId),
      optional: true,
    },
    {
      name: 'stock-entries',
      queryKey: ['stock-entries', organizationId, undefined],
      queryFn: () => stockEntriesApi.getAll(undefined, organizationId),
      optional: true,
    },
    {
      // Used by /dashboard and AI views — without this, dashboard shows
      // blank cards offline.
      name: 'dashboard-summary',
      queryKey: ['dashboard-summary', organizationId, undefined],
      queryFn: () => dashboardService.getDashboardSummary(undefined),
      optional: true,
    },
    {
      // Parcels-with-details powers most parcel cards (area, current crop,
      // last harvest etc.). The lighter `parcels` step above doesn't cover it.
      name: 'parcels-with-details',
      queryKey: ['parcels-with-details', organizationId],
      queryFn: () => parcelsApi.getAll({}, organizationId),
      optional: true,
    },
    {
      name: 'harvests',
      queryKey: ['harvests', organizationId, undefined],
      queryFn: () => harvestsApi.getAll(undefined, organizationId),
      optional: true,
    },
    {
      name: 'analyses',
      queryKey: ['analyses', organizationId],
      queryFn: () => analysesApi.getAll(undefined, organizationId),
      optional: true,
    },
    {
      // /users/me — needed for role/permissions-aware UI gating offline.
      name: 'user-profile',
      queryKey: ['auth', 'profile'],
      queryFn: () => usersApi.getMe(),
      optional: true,
    },
    {
      name: 'organizations',
      queryKey: ['auth', 'organizations'],
      queryFn: () => usersApi.getMyOrganizations(),
      optional: true,
    },
  ];
}

const listeners = new Set<(p: PrefetchProgress) => void>();
let current: PrefetchProgress = {
  total: 0,
  completed: 0,
  currentStep: null,
  isRunning: false,
  lastError: null,
  lastRunAt: null,
};
let abortController: AbortController | null = null;

function emit() {
  listeners.forEach((l) => {
    try {
      l(current);
    } catch {
      /* ignore */
    }
  });
}

export function getPrefetchProgress(): PrefetchProgress {
  return current;
}

export function subscribePrefetchProgress(cb: (p: PrefetchProgress) => void): () => void {
  listeners.add(cb);
  try {
    cb(current);
  } catch {
    /* ignore */
  }
  return () => listeners.delete(cb);
}

export function abortPrefetch(): void {
  abortController?.abort();
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export interface RunPrefetchOptions {
  /** When true, skip the 24h cooldown and re-run all steps. */
  force?: boolean;
}

export async function runPrefetch(
  queryClient: QueryClient,
  organizationId: string,
  opts: RunPrefetchOptions = {},
): Promise<PrefetchProgress> {
  if (current.isRunning) return current;
  if (!isLikelyOnline()) return current;

  const meta = await loadMeta();
  const isSameOrg = meta?.organizationId === organizationId;
  const fresh = isSameOrg && meta && Date.now() - meta.lastRunAt < RERUN_INTERVAL_MS;
  if (fresh && !opts.force) return current;

  const steps = buildPrefetchPlan(organizationId);
  const completedSet = new Set(isSameOrg ? meta?.completedSteps ?? [] : []);
  if (opts.force) completedSet.clear();

  abortController = new AbortController();
  current = {
    total: steps.length,
    completed: completedSet.size,
    currentStep: null,
    isRunning: true,
    lastError: null,
    lastRunAt: current.lastRunAt,
  };
  emit();
  telemetry.track('prefetch_started', { total: steps.length, organizationId });
  const startedAt = Date.now();

  try {
    for (const step of steps) {
      if (abortController.signal.aborted) break;
      if (completedSet.has(step.name)) continue;
      if (!isLikelyOnline()) {
        current.lastError = 'offline-during-prefetch';
        break;
      }
      current.currentStep = step.name;
      emit();
      try {
        await queryClient.fetchQuery({
          queryKey: step.queryKey,
          queryFn: () => withTimeout(step.queryFn(), STEP_TIMEOUT_MS),
          staleTime: 5 * 60 * 1000,
        });
        completedSet.add(step.name);
        current.completed = completedSet.size;
        emit();
        await saveMeta({
          organizationId,
          completedSteps: [...completedSet],
          lastRunAt: Date.now(),
          lastError: null,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!step.optional) {
          current.lastError = `${step.name}: ${msg}`;
          telemetry.track('prefetch_step_failed', { step: step.name, error: msg });
          // Keep going on transient errors; the next boot will resume
          // missing steps thanks to completedSet persistence.
        } else {
          telemetry.track('prefetch_step_skipped', { step: step.name, error: msg });
        }
      }
    }
  } finally {
    abortController = null;
    current.isRunning = false;
    current.currentStep = null;
    current.lastRunAt = Date.now();
    emit();
    telemetry.track('prefetch_completed', {
      completed: current.completed,
      total: current.total,
      durationMs: Date.now() - startedAt,
      error: current.lastError,
    });
  }
  return current;
}

export async function resetPrefetchState(): Promise<void> {
  await clearMeta();
  current = {
    total: 0,
    completed: 0,
    currentStep: null,
    isRunning: false,
    lastError: null,
    lastRunAt: null,
  };
  emit();
}
