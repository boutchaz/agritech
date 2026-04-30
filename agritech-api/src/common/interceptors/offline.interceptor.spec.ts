import { ConflictException, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { OfflineInterceptor } from './offline.interceptor';
import {
  IDEMPOTENT_KEY,
  OPTIMISTIC_LOCK_KEY,
} from '../decorators/offline.decorators';

class FakeQuery {
  constructor(private result: unknown) {}
  select() { return this; }
  eq() { return this; }
  maybeSingle() { return Promise.resolve({ data: this.result }); }
}
class FakeSb {
  constructor(private existing: Record<string, unknown> = {}) {}
  from(_table: string) {
    return new FakeQuery(this.existing[_table] ?? null);
  }
}

function makeCtx(meta: Record<string, unknown>, req: Record<string, unknown>) {
  const handler = () => undefined;
  const reflector = new Reflector();
  // Encode metadata onto the handler so reflector.get works
  if (meta[IDEMPOTENT_KEY]) Reflect.defineMetadata(IDEMPOTENT_KEY, meta[IDEMPOTENT_KEY], handler);
  if (meta[OPTIMISTIC_LOCK_KEY]) Reflect.defineMetadata(OPTIMISTIC_LOCK_KEY, meta[OPTIMISTIC_LOCK_KEY], handler);
  const ctx = {
    getHandler: () => handler,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, reflector };
}

describe('OfflineInterceptor', () => {
  it('replays existing row by client_id (idempotency)', async () => {
    const existingRow = { id: 'r1', title: 'task A' };
    const db = { getAdminClient: () => new FakeSb({ tasks: existingRow }) };
    const { ctx, reflector } = makeCtx(
      { [IDEMPOTENT_KEY]: { table: 'tasks' } },
      {
        headers: { 'x-organization-id': 'org-1', 'idempotency-key': 'cid-1' },
        params: {},
        body: {},
      },
    );
    const interceptor = new OfflineInterceptor(reflector, db as never);
    const next: CallHandler = { handle: () => of('handler-result') };
    const result = await firstValueFrom(interceptor.intercept(ctx, next));
    expect(result).toEqual(existingRow);
  });

  it('throws 409 on stale If-Match version', async () => {
    const db = { getAdminClient: () => new FakeSb({ tasks: { version: 5 } }) };
    const { ctx, reflector } = makeCtx(
      { [OPTIMISTIC_LOCK_KEY]: { table: 'tasks' } },
      {
        headers: { 'x-organization-id': 'org-1', 'if-match': '3' },
        params: { taskId: 't-1' },
        body: {},
      },
    );
    const interceptor = new OfflineInterceptor(reflector, db as never);
    const next: CallHandler = { handle: () => of('ok') };
    await expect(firstValueFrom(interceptor.intercept(ctx, next))).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('passes through when no metadata applied', async () => {
    const db = { getAdminClient: () => new FakeSb() };
    const { ctx, reflector } = makeCtx({}, { headers: {}, params: {}, body: {} });
    const interceptor = new OfflineInterceptor(reflector, db as never);
    const next: CallHandler = { handle: () => of('handler-result') };
    const result = await firstValueFrom(interceptor.intercept(ctx, next));
    expect(result).toBe('handler-result');
  });

  it('proceeds when version matches', async () => {
    const db = { getAdminClient: () => new FakeSb({ tasks: { version: 3 } }) };
    const { ctx, reflector } = makeCtx(
      { [OPTIMISTIC_LOCK_KEY]: { table: 'tasks' } },
      {
        headers: { 'x-organization-id': 'org-1', 'if-match': '3' },
        params: { taskId: 't-1' },
        body: {},
      },
    );
    const interceptor = new OfflineInterceptor(reflector, db as never);
    const next: CallHandler = { handle: () => of('ok') };
    const result = await firstValueFrom(interceptor.intercept(ctx, next));
    expect(result).toBe('ok');
  });
});
