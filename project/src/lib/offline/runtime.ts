import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuthStore } from '@/stores/authStore';
import { startLeader } from './leader';
import { startOnlineMonitor } from './useOnlineStatus';
import { ensurePersistentStorage, getStorageStatus } from './storageGuard';
import { flush, oldestPendingAgeSeconds, countByStatus } from './outbox';
import { apiExecutor } from './executor';
import { wipeOffline } from './wipe';
import { telemetry } from './telemetry';
import { migrateLegacyQueue } from './legacyMigration';

let initialized = false;

export function initOfflineRuntime(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  void ensurePersistentStorage();
  startOnlineMonitor();
  const leader = startLeader();

  // Migrate any pending entries from the localStorage queue
  void migrateLegacyQueue();

  let lastOrgId = useOrganizationStore.getState().currentOrganization?.id ?? null;

  async function flushNow(reason: string) {
    const orgId = useOrganizationStore.getState().currentOrganization?.id ?? null;
    if (!orgId) return;
    if (!leader.isLeader()) return;
    try {
      await flush(orgId, apiExecutor);
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
    }
  });

  // Logout -> full wipe
  useAuthStore.subscribe((state, prev) => {
    if (prev.isAuthenticated && !state.isAuthenticated) {
      void wipeOffline({ scope: 'all' });
    }
  });

  // Initial flush attempt on boot if online
  void flushNow('boot');
}
