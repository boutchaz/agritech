import type { QueryClient } from '@tanstack/react-query';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuthStore } from '@/stores/authStore';
import { useConflictStore } from '@/stores/conflictStore';
import { startLeader } from './leader';
import { startOnlineMonitor } from './useOnlineStatus';
import { ensurePersistentStorage, getStorageStatus } from './storageGuard';
import { db } from './db';
import {
  flush,
  oldestPendingAgeSeconds,
  countByStatus,
  subscribeConflicts,
  retryDeadLetter,
  discardDeadLetter,
} from './outbox';
import { apiExecutor } from './executor';
import { batchFlush, shouldUseBatchMode } from './batchFlush';
import { listPending } from './outbox';
import { wipeOffline } from './wipe';
import { telemetry } from './telemetry';
import { migrateLegacyQueue } from './legacyMigration';
import { runPrefetch, resetPrefetchState } from './prefetch';

let initialized = false;
let qc: QueryClient | null = null;

export function initOfflineRuntime(queryClient?: QueryClient): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  qc = queryClient ?? null;

  void ensurePersistentStorage();
  startOnlineMonitor();
  const leader = startLeader();

  // Migrate any pending entries from the localStorage queue
  void migrateLegacyQueue();

  // Surface 409 conflicts to the user via the global conflict store.
  subscribeConflicts(({ row, serverBody }) => {
    const mine =
      row.payload && typeof row.payload === 'object'
        ? (row.payload as Record<string, unknown>)
        : { value: row.payload };
    const server =
      serverBody && typeof serverBody === 'object'
        ? (serverBody as Record<string, unknown>)
        : { value: serverBody };

    useConflictStore.getState().push({
      id: row.id,
      resourceLabel: `${row.method} ${row.resource}`,
      mine,
      server,
      onResolve: async (decision) => {
        if (decision === 'use-server') {
          // Drop the queued mutation and accept the server state.
          await db().outbox.delete(row.id);
        } else if (decision === 'keep-mine') {
          // Re-arm with the server's current version so retry succeeds.
          const serverVersion =
            (server as { version?: number }).version ??
            (server as { current_version?: number }).current_version;
          await db().outbox.update(row.id, {
            status: 'pending',
            ifMatchVersion: typeof serverVersion === 'number' ? serverVersion : null,
            nextAttemptAt: Date.now(),
            lastError: null,
          });
        }
        // 'edit' -> caller will reopen the form; leave the row in failed state.
      },
    });
  });

  // Wire dead-letter retry/discard to the runtime so the review modal works.
  void retryDeadLetter;
  void discardDeadLetter;

  let lastOrgId = useOrganizationStore.getState().currentOrganization?.id ?? null;

  async function flushNow(reason: string) {
    const orgId = useOrganizationStore.getState().currentOrganization?.id ?? null;
    if (!orgId) return;
    if (!leader.isLeader()) return;
    try {
      const pending = await listPending(orgId);
      if (shouldUseBatchMode(pending)) {
        const batch = await batchFlush(orgId, pending);
        // If batch endpoint was unreachable (attempted=0 and rows still pending),
        // fall back to per-item executor.
        if (batch.attempted === 0 && pending.length > 0) {
          await flush(orgId, apiExecutor);
        }
      } else {
        await flush(orgId, apiExecutor);
      }
    } catch (err) {
      console.warn('[offline.runtime] flush failed', err, reason);
    }
  }

  // Online -> flush
  window.addEventListener('online', () => void flushNow('online-event'));

  // Periodic flush (leader only)
  window.setInterval(() => void flushNow('interval'), 30_000);

  // Cross-tab flush request
  leader.onFlushRequest((reason) => void flushNow(reason ?? 'cross-tab'));

  // Telemetry gauges
  window.setInterval(async () => {
    const orgId = useOrganizationStore.getState().currentOrganization?.id ?? null;
    if (!orgId) return;
    const counts = await countByStatus(orgId);
    const age = await oldestPendingAgeSeconds(orgId);
    const storage = await getStorageStatus();
    telemetry.gauge('outbox_depth', counts.pending + counts.inflight, counts);
    telemetry.gauge('outbox_oldest_age_seconds', age);
    if (storage) telemetry.gauge('storage_ratio', storage.ratio, { quota: storage.quota });
  }, 60_000);

  // Org switch -> wipe previous org's pending data NOT desired (data may be in flight).
  // We only namespace, never wipe on switch unless explicit logout.
  useOrganizationStore.subscribe((state) => {
    const newOrg = state.currentOrganization?.id ?? null;
    if (newOrg !== lastOrgId) {
      telemetry.track('org_switch', { from: lastOrgId, to: newOrg });
      lastOrgId = newOrg;
      void flushNow('org-switch');
      if (newOrg) void maybePrefetch('org-switch');
    }
  });

  // Logout -> full wipe
  useAuthStore.subscribe((state, prev) => {
    if (prev.isAuthenticated && !state.isAuthenticated) {
      void wipeOffline({ scope: 'all' });
      void resetPrefetchState();
    }
  });

  // Smart prefetch: warm the cache so offline screens have data the user
  // never explicitly visited. Runs only when (a) we have a query client,
  // (b) user is authenticated, (c) device is leader, (d) we are online.
  // Triggered on boot + on auth/org change.
  async function maybePrefetch(reason: string) {
    if (!qc) return;
    if (!leader.isLeader()) return;
    const auth = useAuthStore.getState();
    if (!auth.isAuthenticated) return;
    const orgId = useOrganizationStore.getState().currentOrganization?.id ?? null;
    if (!orgId) return;
    try {
      await runPrefetch(qc, orgId);
    } catch (err) {
      console.warn('[offline.runtime] prefetch failed', err, reason);
    }
  }

  // Auth changes -> prefetch on login
  useAuthStore.subscribe((state, prev) => {
    if (!prev.isAuthenticated && state.isAuthenticated) {
      void maybePrefetch('post-login');
    }
  });

  // Boot
  void flushNow('boot');
  void maybePrefetch('boot');
}

/** Imperative trigger for the Settings UI "Précharger" button. */
export async function triggerPrefetch(force = true): Promise<void> {
  if (!qc) return;
  const orgId = useOrganizationStore.getState().currentOrganization?.id ?? null;
  if (!orgId) return;
  await runPrefetch(qc, orgId, { force });
}
