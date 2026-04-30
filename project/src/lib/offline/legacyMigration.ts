import { enqueue } from './outbox';
import { useOrganizationStore } from '@/stores/organizationStore';

const LEGACY_KEY = 'agrigina.tasks.offline-queue.v1';
const MIGRATED_FLAG = 'agrogina:legacy-queue-migrated-v1';

interface LegacyAction {
  id: string;
  kind: 'clock-in' | 'clock-out' | 'comment';
  organizationId: string;
  taskId?: string;
  timeLogId?: string;
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
}

export async function migrateLegacyQueue(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.localStorage.getItem(MIGRATED_FLAG)) return;
  const raw = window.localStorage.getItem(LEGACY_KEY);
  if (!raw) {
    window.localStorage.setItem(MIGRATED_FLAG, String(Date.now()));
    return;
  }
  let items: LegacyAction[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    /* ignore */
  }
  const fallbackOrg = useOrganizationStore.getState().currentOrganization?.id ?? null;
  for (const item of items) {
    const orgId = item.organizationId || fallbackOrg;
    if (!orgId) continue;
    if (item.kind === 'clock-in' && item.taskId) {
      await enqueue({
        organizationId: orgId,
        resource: 'task-time-log',
        method: 'POST',
        url: `/tasks/${item.taskId}/clock-in`,
        payload: item.payload,
      });
    } else if (item.kind === 'clock-out' && item.timeLogId) {
      await enqueue({
        organizationId: orgId,
        resource: 'task-time-log',
        method: 'POST',
        url: `/tasks/time-logs/${item.timeLogId}/clock-out`,
        payload: item.payload,
      });
    } else if (item.kind === 'comment' && item.taskId) {
      await enqueue({
        organizationId: orgId,
        resource: 'task-comment',
        method: 'POST',
        url: `/tasks/${item.taskId}/comments`,
        payload: item.payload,
      });
    }
  }
  window.localStorage.removeItem(LEGACY_KEY);
  window.localStorage.setItem(MIGRATED_FLAG, String(Date.now()));
}
