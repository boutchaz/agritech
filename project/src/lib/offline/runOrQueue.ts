import { v4 as uuidv4 } from 'uuid';
import { enqueue } from './outbox';
import type { HttpMethod, OutboxRow } from './db';
import { isLikelyOnline } from './useOnlineStatus';

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network request failed') ||
    m.includes('load failed') ||
    m.includes('impossible de joindre')
  );
}

export interface RunOrQueueInput {
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

export type RunOrQueueResult<T> =
  | { status: 'sent'; result: T; clientId: string }
  | { status: 'queued'; row: OutboxRow };

export async function runOrQueue<T>(
  input: RunOrQueueInput,
  live: () => Promise<T>,
): Promise<RunOrQueueResult<T>> {
  const clientId = input.clientId ?? uuidv4();
  if (!isLikelyOnline()) {
    const row = await enqueue({ ...input, clientId });
    return { status: 'queued', row };
  }
  try {
    const result = await live();
    return { status: 'sent', result, clientId };
  } catch (err) {
    if (isNetworkError(err)) {
      const row = await enqueue({ ...input, clientId });
      return { status: 'queued', row };
    }
    throw err;
  }
}
