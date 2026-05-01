import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENT_KEY = 'offline:idempotent';
export const OPTIMISTIC_LOCK_KEY = 'offline:optimistic-lock';

export interface IdempotentOptions {
  table: string;
  returning?: string;
}

export interface OptimisticLockOptions {
  table: string;
}

export const Idempotent = (opts: IdempotentOptions) =>
  SetMetadata(IDEMPOTENT_KEY, opts);

export const OptimisticLock = (opts: OptimisticLockOptions) =>
  SetMetadata(OPTIMISTIC_LOCK_KEY, opts);
