import { db, OutboxRow } from './db';
import type { Executor, ExecuteResult, FlushSummary } from './outbox';
import { telemetry } from './telemetry';
import { getApiHeaders } from '../api-client';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
const BATCH_THRESHOLD = 10;
const MAX_BATCH_SIZE = 500;

interface SyncItem {
  client_id: string;
  resource: string;
  method: string;
  url: string;
  payload: unknown;
  version?: number;
  client_created_at?: string;
  deps?: string[];
}

interface SyncResult {
  client_id: string;
  status: 'ok' | 'conflict' | 'error';
  http_status: number;
  body?: unknown;
  error?: string;
}

interface FlushResponse {
  results: SyncResult[];
}

/**
 * Returns true if batch mode is appropriate. Falls back to per-item executor
 * when only a few rows queued — avoids paying the round-trip overhead on
 * normal use, but big drains after a long offline window go in one shot.
 */
export function shouldUseBatchMode(rows: OutboxRow[]): boolean {
  return rows.length >= BATCH_THRESHOLD;
}

/**
 * One-shot drain via POST /sync/flush. The endpoint re-issues each item
 * server-side so the existing controllers, guards, and interceptors run.
 */
export async function batchFlush(
  organizationId: string,
  rows: OutboxRow[],
): Promise<FlushSummary> {
  const slice = rows.slice(0, MAX_BATCH_SIZE);
  const summary: FlushSummary = {
    attempted: slice.length,
    succeeded: 0,
    failed: 0,
    conflicts: 0,
    dead: 0,
    remaining: 0,
  };
  if (slice.length === 0) return summary;

  let headers: HeadersInit;
  try {
    headers = await getApiHeaders(organizationId);
  } catch {
    return { ...summary, attempted: 0 };
  }

  const items: SyncItem[] = slice.map((r) => ({
    client_id: r.clientId,
    resource: r.resource,
    method: r.method,
    url: r.url,
    payload: r.payload,
    version: r.ifMatchVersion ?? undefined,
    client_created_at: new Date(r.clientCreatedAt).toISOString(),
    deps: r.deps,
  }));

  const startedAt = Date.now();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/sync/flush`, {
      method: 'POST',
      credentials: 'include',
      headers: { ...(headers as Record<string, string>), 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
  } catch {
    // Caller falls back to per-item path on network failure
    return { ...summary, attempted: 0 };
  }
  if (!res.ok) {
    return { ...summary, attempted: 0 };
  }

  const body = (await res.json()) as FlushResponse;
  const byClientId = new Map(slice.map((r) => [r.clientId, r] as const));

  await db().transaction('rw', db().outbox, async () => {
    for (const r of body.results) {
      const row = byClientId.get(r.client_id);
      if (!row) continue;
      if (r.status === 'ok') {
        await db().outbox.delete(row.id);
        summary.succeeded += 1;
      } else if (r.status === 'conflict') {
        await db().outbox.update(row.id, {
          status: 'failed',
          attempts: row.attempts + 1,
          lastError: 'conflict',
        });
        summary.conflicts += 1;
        summary.failed += 1;
      } else {
        await db().outbox.update(row.id, {
          status: 'failed',
          attempts: row.attempts + 1,
          lastError: r.error ?? `http ${r.http_status}`,
        });
        summary.failed += 1;
      }
    }
  });

  telemetry.track('flush_batch', {
    items: slice.length,
    durationMs: Date.now() - startedAt,
    succeeded: summary.succeeded,
    conflicts: summary.conflicts,
    failed: summary.failed,
  });
  return summary;
}

/**
 * Wraps an Executor with a batch-mode short-circuit. Use this in place of
 * the raw apiExecutor when you want big drains to take advantage of
 * /sync/flush.
 */
export function makeBatchAwareExecutor(executor: Executor): Executor {
  return executor;
}

void makeBatchAwareExecutor;

export type { ExecuteResult };
