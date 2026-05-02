import { get, set, del, createStore, UseStore } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/query-persist-client-core';

const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '1.0.0';
const SCHEMA_VERSION = 1;
const DB_NAME = 'agrogina_query_cache';
const STORE_NAME = 'queries';

let store: UseStore | null = null;
function getStore(): UseStore {
  if (!store) store = createStore(DB_NAME, STORE_NAME);
  return store;
}

function keyFor(orgId: string | null): string {
  const org = orgId ?? 'no-org';
  return `agm:${org}:${APP_VERSION}:${SCHEMA_VERSION}:queries`;
}

/**
 * Resolve the active org synchronously, in this priority:
 *   1) provided getter (Zustand store, may not be hydrated yet at boot)
 *   2) localStorage 'currentOrganization' (written by MultiTenantAuthProvider)
 * Falls back to null only if neither is set. Without this, the very first
 * `restoreClient` call at boot reads from `agm:no-org:...` (empty) instead
 * of the org-keyed bucket the user actually persisted to last session.
 */
function resolveOrgId(getter: () => string | null): string | null {
  try {
    const fromStore = getter();
    if (fromStore) return fromStore;
  } catch {
    /* ignore */
  }
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('currentOrganization') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.id === 'string') return parsed.id;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export const PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const PERSIST_BUSTER = `${APP_VERSION}:${SCHEMA_VERSION}`;

export const PERSIST_QUERY_KEY_ALLOWLIST = new Set<string>([
  'tasks',
  'task',
  'task-statistics',
  'task-categories',
  'task-comments',
  'task-time-logs',
  'parcels',
  'parcel',
  'parcels-with-details',
  'farms',
  'farm',
  'farm-hierarchy',
  'stock',
  'stock-entries',
  'stock-entry',
  'stock-movements',
  'stock-dashboard',
  'inventory-items',
  'workers',
  'worker',
  'active-workers',
  'harvests',
  'harvest',
  'harvest-statistics',
  'pest-reports',
  'pest-alerts',
  'organizations',
  'organization',
  'organization-modules',
  'user-profile',
  'permissions',
  'auth',
  'subscription',
  'modules',
  'analyses',
  'analysis',
  'crops',
  'crop',
  'crop-cycles',
  'dashboard-summary',
  'compliance',
  'satellite',
  'weather',
  'support-info',
  'landing-settings',
  'supported-countries',
]);

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const head = queryKey[0];
  if (typeof head !== 'string') return false;
  return PERSIST_QUERY_KEY_ALLOWLIST.has(head);
}

export function createIDBPersister(orgIdProvider: () => string | null): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      const orgId = resolveOrgId(orgIdProvider);
      const filtered: PersistedClient = {
        ...client,
        clientState: {
          ...client.clientState,
          queries: client.clientState.queries.filter((q) =>
            shouldPersistQuery(q.queryKey),
          ),
        },
      };
      await set(keyFor(orgId), filtered, getStore());
    },
    restoreClient: async () => {
      const orgId = resolveOrgId(orgIdProvider);
      try {
        return (await get<PersistedClient>(keyFor(orgId), getStore())) ?? undefined;
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      const orgId = resolveOrgId(orgIdProvider);
      await del(keyFor(orgId), getStore());
    },
  };
}

export async function clearPersistedQueries(orgId: string | null): Promise<void> {
  await del(keyFor(orgId), getStore());
}
