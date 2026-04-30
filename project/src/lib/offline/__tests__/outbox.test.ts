import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { enqueue, flush, listPending, listDeadLetters, MAX_ATTEMPTS } from '../outbox';
import type { Executor } from '../outbox';
import { db, closeDb } from '../db';

const ORG = 'org-1';

beforeEach(async () => {
  await closeDb();
  // wipe by deleting db
  await new Promise<void>((res) => {
    const req = indexedDB.deleteDatabase('agrogina_offline');
    req.onsuccess = () => res();
    req.onerror = () => res();
    req.onblocked = () => res();
  });
});

describe('outbox', () => {
  it('enqueue + flush ok removes row', async () => {
    await enqueue({
      organizationId: ORG,
      resource: 'task',
      method: 'POST',
      url: '/api/tasks',
      payload: { title: 'a' },
    });
    expect((await listPending(ORG)).length).toBe(1);

    const exec: Executor = async () => ({ status: 'ok' });
    const summary = await flush(ORG, exec);
    expect(summary.succeeded).toBe(1);
    expect((await listPending(ORG)).length).toBe(0);
  });

  it('retry status increments attempts and reschedules', async () => {
    await enqueue({
      organizationId: ORG,
      resource: 'task',
      method: 'POST',
      url: '/api/tasks',
      payload: {},
    });
    const exec: Executor = async () => ({ status: 'retry', error: 'net' });
    await flush(ORG, exec);
    const rows = await db().outbox.where('organizationId').equals(ORG).toArray();
    expect(rows[0].attempts).toBe(1);
    expect(rows[0].status).toBe('pending');
    expect(rows[0].nextAttemptAt).toBeGreaterThan(Date.now());
  });

  it('moves to dead letter after MAX_ATTEMPTS retries', async () => {
    const row = await enqueue({
      organizationId: ORG,
      resource: 'task',
      method: 'POST',
      url: '/api/tasks',
      payload: {},
    });
    await db().outbox.update(row.id, { attempts: MAX_ATTEMPTS - 1, nextAttemptAt: 0 });
    const exec: Executor = async () => ({ status: 'retry', error: 'net' });
    const summary = await flush(ORG, exec);
    expect(summary.dead).toBe(1);
    expect((await listPending(ORG)).length).toBe(0);
    expect((await listDeadLetters(ORG)).length).toBe(1);
  });

  it('fatal status moves to dead letter immediately', async () => {
    await enqueue({
      organizationId: ORG,
      resource: 'task',
      method: 'POST',
      url: '/api/tasks',
      payload: {},
    });
    const exec: Executor = async () => ({ status: 'fatal', error: 'bad request' });
    const summary = await flush(ORG, exec);
    expect(summary.dead).toBe(1);
    expect((await listDeadLetters(ORG)).length).toBe(1);
  });

  it('conflict status keeps row as failed and counts conflict', async () => {
    await enqueue({
      organizationId: ORG,
      resource: 'task',
      method: 'PATCH',
      url: '/api/tasks/x',
      payload: {},
      ifMatchVersion: 1,
    });
    const exec: Executor = async () => ({ status: 'conflict', error: 'stale' });
    const summary = await flush(ORG, exec);
    expect(summary.conflicts).toBe(1);
    const rows = await db().outbox.where('organizationId').equals(ORG).toArray();
    expect(rows[0].status).toBe('failed');
  });

  it('respects nextAttemptAt and skips not-yet-due rows', async () => {
    const row = await enqueue({
      organizationId: ORG,
      resource: 'task',
      method: 'POST',
      url: '/api/tasks',
      payload: {},
    });
    await db().outbox.update(row.id, { nextAttemptAt: Date.now() + 60_000 });
    const exec: Executor = async () => ({ status: 'ok' });
    const summary = await flush(ORG, exec);
    expect(summary.attempted).toBe(0);
    expect((await listPending(ORG)).length).toBe(1);
  });

  it('isolates rows per organization', async () => {
    await enqueue({
      organizationId: ORG,
      resource: 'task',
      method: 'POST',
      url: '/api/tasks',
      payload: {},
    });
    await enqueue({
      organizationId: 'org-2',
      resource: 'task',
      method: 'POST',
      url: '/api/tasks',
      payload: {},
    });
    expect((await listPending(ORG)).length).toBe(1);
    expect((await listPending('org-2')).length).toBe(1);
    const exec: Executor = async () => ({ status: 'ok' });
    await flush(ORG, exec);
    expect((await listPending(ORG)).length).toBe(0);
    expect((await listPending('org-2')).length).toBe(1);
  });

  it('processes deps in topological order', async () => {
    const parent = await enqueue({
      organizationId: ORG,
      resource: 'task',
      method: 'POST',
      url: '/api/tasks',
      payload: { title: 'parent' },
    });
    await enqueue({
      organizationId: ORG,
      resource: 'task-comment',
      method: 'POST',
      url: '/api/tasks/x/comments',
      payload: {},
      deps: [parent.clientId],
    });
    const order: string[] = [];
    const exec: Executor = async (row) => {
      order.push(row.resource);
      return { status: 'ok' };
    };
    await flush(ORG, exec);
    expect(order).toEqual(['task', 'task-comment']);
  });
});
