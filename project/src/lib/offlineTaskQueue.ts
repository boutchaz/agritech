/**
 * Offline task queue — captures clock-in/clock-out and comment actions when
 * the device has no network (rural 3G/4G drops in Morocco) and replays them
 * when the browser fires the 'online' event.
 *
 * Queue lives in localStorage so it survives reloads while offline. Each
 * entry has a stable UUID and retry count so we can skip entries that fail
 * too many times without hammering the backend forever.
 *
 * Deliberately small and dependency-free: no Service Worker, no IndexedDB.
 * For SIAM we need the common case (farm worker clocks in/out in the field)
 * to just work; comment replay is a nice side-effect.
 */

import { tasksApi } from './api/tasks';

export type QueuedAction =
  | {
      id: string;
      kind: 'clock-in';
      organizationId: string;
      taskId: string;
      payload: {
        worker_id: string;
        location_lat?: number;
        location_lng?: number;
        notes?: string;
      };
      createdAt: number;
      retries: number;
    }
  | {
      id: string;
      kind: 'clock-out';
      organizationId: string;
      timeLogId: string;
      payload: {
        break_duration?: number;
        notes?: string;
        units_completed?: number;
        photo_url?: string;
      };
      createdAt: number;
      retries: number;
    }
  | {
      id: string;
      kind: 'comment';
      organizationId: string;
      taskId: string;
      payload: {
        comment: string;
        worker_id?: string;
        type?: string;
      };
      createdAt: number;
      retries: number;
    };

const STORAGE_KEY = 'agrigina.tasks.offline-queue.v1';
const MAX_RETRIES = 5;

type Listener = (items: QueuedAction[]) => void;
const listeners = new Set<Listener>();

function readQueue(): QueuedAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedAction[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((l) => l(items));
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `q-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

// Discriminated union with the queue-generated fields stripped, so callers
// can pass the shape for their kind without worrying about id/timestamps.
export type QueuedActionInput =
  | Omit<Extract<QueuedAction, { kind: 'clock-in' }>, 'id' | 'createdAt' | 'retries'>
  | Omit<Extract<QueuedAction, { kind: 'clock-out' }>, 'id' | 'createdAt' | 'retries'>
  | Omit<Extract<QueuedAction, { kind: 'comment' }>, 'id' | 'createdAt' | 'retries'>;

export function enqueueAction(action: QueuedActionInput): QueuedAction {
  const entry = { ...action, id: uuid(), createdAt: Date.now(), retries: 0 } as QueuedAction;
  const items = readQueue();
  items.push(entry);
  writeQueue(items);
  return entry;
}

export function getQueue(): QueuedAction[] {
  return readQueue();
}

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  // Fire immediately so the subscriber gets initial state
  try {
    listener(readQueue());
  } catch {
    /* ignore */
  }
  return () => {
    listeners.delete(listener);
  };
}

async function executeAction(action: QueuedAction): Promise<void> {
  if (action.kind === 'clock-in') {
    await tasksApi.clockIn(action.organizationId, action.taskId, action.payload);
    return;
  }
  if (action.kind === 'clock-out') {
    await tasksApi.clockOut(action.organizationId, action.timeLogId, action.payload);
    return;
  }
  await tasksApi.addComment(action.organizationId, action.taskId, action.payload);
}

let flushing = false;

/**
 * Attempt to replay every queued action against the live API. Returns a
 * summary of what succeeded and what is still pending after retries.
 * Idempotent — a subsequent call picks up whatever is still in the queue.
 */
export async function flushQueue(): Promise<{ sent: number; failed: number; remaining: number }> {
  if (flushing) return { sent: 0, failed: 0, remaining: readQueue().length };
  flushing = true;
  let sent = 0;
  let failed = 0;
  try {
    let items = readQueue();
    if (items.length === 0) return { sent: 0, failed: 0, remaining: 0 };
    const remaining: QueuedAction[] = [];

    for (const item of items) {
      try {
         
        await executeAction(item);
        sent += 1;
      } catch (err) {
        const nextRetries = (item.retries ?? 0) + 1;
        if (nextRetries >= MAX_RETRIES) {
          // Drop after too many retries so we don't block the queue forever.
          // In a fuller build we'd surface these in an "errors" bucket for
          // manual retry; for SIAM, logging + dropping is enough.
          console.warn('[offlineQueue] dropping action after max retries', item, err);
          failed += 1;
        } else {
          remaining.push({ ...item, retries: nextRetries });
          failed += 1;
        }
      }
    }

    items = remaining;
    writeQueue(items);
    return { sent, failed, remaining: items.length };
  } finally {
    flushing = false;
  }
}

/**
 * Try to run the action immediately; if the device is offline or the call
 * throws a network-style error, enqueue for later replay. Always resolves
 * with either the API result OR a "queued" sentinel so callers don't have
 * to know about the queue.
 */
export async function runOrQueue<T>(
  action: QueuedActionInput,
  live: () => Promise<T>,
): Promise<{ status: 'sent'; result: T } | { status: 'queued'; action: QueuedAction }> {
  if (!isOnline()) {
    return { status: 'queued', action: enqueueAction(action) };
  }
  try {
    const result = await live();
    return { status: 'sent', result };
  } catch (err) {
    const message = (err as Error)?.message ?? '';
    // Queue on classic network errors; re-throw validation / auth errors
    // since retrying them wouldn't help and the user needs to see them.
    const looksLikeNetworkError =
      message.toLowerCase().includes('failed to fetch') ||
      message.toLowerCase().includes('networkerror') ||
      message.toLowerCase().includes('network request failed') ||
      message.toLowerCase().includes('load failed');
    if (looksLikeNetworkError) {
      return { status: 'queued', action: enqueueAction(action) };
    }
    throw err;
  }
}

let wired = false;

/**
 * Install window listeners that flush the queue whenever the browser goes
 * back online. Idempotent — safe to call multiple times.
 */
export function wireOfflineQueue(onFlush?: (summary: { sent: number; failed: number; remaining: number }) => void) {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  const handler = async () => {
    const summary = await flushQueue();
    if (onFlush) onFlush(summary);
  };
  window.addEventListener('online', handler);
  // Run once on boot in case we're already online with items queued from a
  // previous session.
  if (isOnline()) {
    void handler();
  }
}
