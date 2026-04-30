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

export const PERSIST_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const PERSIST_BUSTER = `${APP_VERSION}:${SCHEMA_VERSION}`;

export const PERSIST_QUERY_KEY_ALLOWLIST = new Set<string>([
  'tasks',
  'parcels',
  'farms',
  'stock',
  'stock-entries',
  'workers',
  'harvests',
  'pest-reports',
  'pest-alerts',
  'organizations',
  'user-profile',
  'permissions',
]);

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const head = queryKey[0];
  if (typeof head !== 'string') return false;
  return PERSIST_QUERY_KEY_ALLOWLIST.has(head);
}

export function createIDBPersister(orgIdProvider: () => string | null): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      const orgId = orgIdProvider();
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
      const orgId = orgIdProvider();
      try {
        return (await get<PersistedClient>(keyFor(orgId), getStore())) ?? undefined;
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      const orgId = orgIdProvider();
      await del(keyFor(orgId), getStore());
    },
  };
}

export async function clearPersistedQueries(orgId: string | null): Promise<void> {
  await del(keyFor(orgId), getStore());
}
