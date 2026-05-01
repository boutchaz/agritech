import { v4 as uuidv4 } from 'uuid';
import { db, OutboxRow, HttpMethod, CURRENT_PAYLOAD_VERSION, DeadLetterRow } from './db';
import { nowClient } from './clock';
import { telemetry } from './telemetry';

export const MAX_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 5 * 60_000;

function computeBackoff(attempts: number): number {
  const exp = Math.min(BASE_BACKOFF_MS * 2 ** attempts, MAX_BACKOFF_MS);
  const jitter = Math.random() * exp * 0.3;
  return exp + jitter;
}

export interface EnqueueInput {
  organizationId: string;
  resource: string;
  method: HttpMethod;
  url: string;
  payload: unknown;
  ifMatchVersion?: number | null;
  clientId?: string;
  deps?: string[];
  photoIds?: string[];
}

export interface FlushSummary {
  attempted: number;
  succeeded: number;
  failed: number;
  conflicts: number;
  dead: number;
  remaining: number;
}

export interface ExecuteResult {
  status: 'ok' | 'conflict' | 'fatal' | 'retry';
  body?: unknown;
  serverVersion?: number;
  error?: string;
}

export type Executor = (row: OutboxRow) => Promise<ExecuteResult>;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore */
    }
  });
}

export function subscribeOutbox(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export interface ConflictEvent {
  row: OutboxRow;
  serverBody: unknown;
}

const conflictListeners = new Set<(e: ConflictEvent) => void>();

export function subscribeConflicts(cb: (e: ConflictEvent) => void): () => void {
  conflictListeners.add(cb);
  return () => conflictListeners.delete(cb);
}

function emitConflict(e: ConflictEvent) {
  conflictListeners.forEach((l) => {
    try {
      l(e);
    } catch {
      /* ignore */
    }
  });
}

export async function enqueue(input: EnqueueInput): Promise<OutboxRow> {
  const ts = nowClient();
  const row: OutboxRow = {
    id: uuidv4(),
    organizationId: input.organizationId,
    clientId: input.clientId ?? uuidv4(),
    resource: input.resource,
    method: input.method,
    url: input.url,
    payload: input.payload,
    ifMatchVersion: input.ifMatchVersion ?? null,
    payloadVersion: CURRENT_PAYLOAD_VERSION,
    attempts: 0,
    status: 'pending',
    nextAttemptAt: Date.now(),
    clientCreatedAt: ts.clientCreatedAt,
    clientTzOffset: ts.clientTzOffset,
    deps: input.deps,
    photoIds: input.photoIds,
  };
  await db().outbox.add(row);
  telemetry.track('enqueue', { resource: input.resource, method: input.method });
  notify();
  return row;
}

export async function listPending(organizationId: string): Promise<OutboxRow[]> {
  return db().outbox
    .where('[organizationId+status]')
    .equals([organizationId, 'pending'])
    .toArray();
}

export async function countByStatus(organizationId: string): Promise<{
  pending: number;
  inflight: number;
  failed: number;
  dead: number;
}> {
  const all = await db().outbox.where('organizationId').equals(organizationId).toArray();
  const out = { pending: 0, inflight: 0, failed: 0, dead: 0 };
  for (const r of all) out[r.status] += 1;
  return out;
}

export async function oldestPendingAgeSeconds(organizationId: string): Promise<number> {
  const all = await db().outbox.where('organizationId').equals(organizationId).toArray();
  if (all.length === 0) return 0;
  const oldest = all.reduce((min, r) => (r.clientCreatedAt < min ? r.clientCreatedAt : min), Infinity);
  return Math.max(0, Math.floor((Date.now() - oldest) / 1000));
}

async function moveToDead(row: OutboxRow, reason: string): Promise<void> {
  const dl: DeadLetterRow = {
    id: row.id,
    organizationId: row.organizationId,
    original: row,
    reason,
    movedAt: Date.now(),
  };
  await db().transaction('rw', db().outbox, db().deadLetter, async () => {
    await db().deadLetter.put(dl);
    await db().outbox.delete(row.id);
  });
  telemetry.track('dead_letter', { resource: row.resource, reason });
}

let flushing = false;

export async function flush(
  organizationId: string,
  executor: Executor,
): Promise<FlushSummary> {
  const summary: FlushSummary = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    conflicts: 0,
    dead: 0,
    remaining: 0,
  };
  if (flushing) {
    summary.remaining = (await listPending(organizationId)).length;
    return summary;
  }
  flushing = true;
  const startedAt = Date.now();
  try {
    const now = Date.now();
    const all = await db().outbox
      .where('[organizationId+status]')
      .equals([organizationId, 'pending'])
      .toArray();
    // Topological sort by deps (best-effort)
    const sorted = topoSort(all);
    for (const row of sorted) {
      if (row.nextAttemptAt > now) continue;
      summary.attempted += 1;
      await db().outbox.update(row.id, { status: 'inflight' });
      let result: ExecuteResult;
      try {
        result = await executor(row);
      } catch (err) {
        result = {
          status: 'retry',
          error: err instanceof Error ? err.message : String(err),
        };
      }
      const attempts = row.attempts + 1;
      if (result.status === 'ok') {
        await db().outbox.delete(row.id);
        summary.succeeded += 1;
      } else if (result.status === 'conflict') {
        await db().outbox.update(row.id, {
          status: 'failed',
          attempts,
          lastError: result.error ?? 'conflict',
          nextAttemptAt: Date.now() + computeBackoff(attempts),
        });
        emitConflict({ row, serverBody: result.body });
        summary.conflicts += 1;
        summary.failed += 1;
      } else if (result.status === 'fatal') {
        const fresh = await db().outbox.get(row.id);
        if (fresh) await moveToDead(fresh, result.error ?? 'fatal');
        summary.dead += 1;
        summary.failed += 1;
      } else {
        if (attempts >= MAX_ATTEMPTS) {
          const fresh = await db().outbox.get(row.id);
          if (fresh) await moveToDead(fresh, result.error ?? 'max retries');
          summary.dead += 1;
          summary.failed += 1;
        } else {
          await db().outbox.update(row.id, {
            status: 'pending',
            attempts,
            lastError: result.error ?? null,
            nextAttemptAt: Date.now() + computeBackoff(attempts),
          });
          summary.failed += 1;
        }
      }
    }
    summary.remaining = (await listPending(organizationId)).length;
    telemetry.track('flush', { ...summary, durationMs: Date.now() - startedAt });
    notify();
    return summary;
  } finally {
    flushing = false;
  }
}

function topoSort(rows: OutboxRow[]): OutboxRow[] {
  const byClientId = new Map(rows.map((r) => [r.clientId, r] as const));
  const visited = new Set<string>();
  const out: OutboxRow[] = [];
  function visit(r: OutboxRow) {
    if (visited.has(r.id)) return;
    visited.add(r.id);
    for (const dep of r.deps ?? []) {
      const d = byClientId.get(dep);
      if (d) visit(d);
    }
    out.push(r);
  }
  // Stable order: by clientCreatedAt
  const sorted = [...rows].sort((a, b) => a.clientCreatedAt - b.clientCreatedAt);
  for (const r of sorted) visit(r);
  return out;
}

export async function listDeadLetters(organizationId: string): Promise<DeadLetterRow[]> {
  return db().deadLetter.where('organizationId').equals(organizationId).toArray();
}

export async function retryDeadLetter(id: string): Promise<void> {
  const dl = await db().deadLetter.get(id);
  if (!dl) return;
  const row: OutboxRow = {
    ...dl.original,
    attempts: 0,
    status: 'pending',
    lastError: null,
    nextAttemptAt: Date.now(),
  };
  await db().transaction('rw', db().outbox, db().deadLetter, async () => {
    await db().outbox.put(row);
    await db().deadLetter.delete(id);
  });
  notify();
}

export async function discardDeadLetter(id: string): Promise<void> {
  await db().deadLetter.delete(id);
  notify();
}

export async function exportDeadLetters(organizationId: string): Promise<string> {
  const items = await listDeadLetters(organizationId);
  return JSON.stringify(items, null, 2);
}
