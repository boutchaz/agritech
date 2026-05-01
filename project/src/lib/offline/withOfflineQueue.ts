import { v4 as uuidv4 } from 'uuid';
import { runOrQueue } from './runOrQueue';
import type { HttpMethod } from './db';

export interface OfflineMutationConfig<TInput, TResult> {
  organizationId: string | null | undefined;
  resource: string;
  method: HttpMethod;
  /** Either a static URL or a function of the input. */
  url: string | ((input: TInput) => string);
  /** When the mutation needs optimistic concurrency. */
  ifMatchVersion?: number | ((input: TInput) => number | null | undefined);
  /** Build the request body from the input. Defaults to `input` itself. */
  buildPayload?: (input: TInput, clientId: string) => unknown;
  /** Optional stub returned when queued so the UI has something to render. */
  buildOptimisticStub?: (input: TInput, clientId: string) => TResult;
}

/**
 * Wraps a live mutation function with the offline outbox. When the device
 * is online the call goes straight through. When offline (or the call
 * throws a network error), the request is enqueued with a stable
 * `client_id` and the optional optimistic stub is returned so the UI
 * doesn't hang waiting for a network round-trip.
 *
 * The runtime drains the outbox on reconnect; idempotency is enforced by
 * the backend `Idempotency-Key` header carrying the same `client_id`.
 */
export function withOfflineQueue<TInput, TResult>(
  config: OfflineMutationConfig<TInput, TResult>,
  live: (input: TInput) => Promise<TResult>,
): (input: TInput) => Promise<TResult> {
  return async (input: TInput): Promise<TResult> => {
    if (!config.organizationId) {
      // Without an org we can't tag the outbox row — fall through to the
      // live call so the existing error surfaces normally.
      return live(input);
    }
    const clientId = uuidv4();
    const url = typeof config.url === 'function' ? config.url(input) : config.url;
    const ifMatchVersion =
      typeof config.ifMatchVersion === 'function'
        ? config.ifMatchVersion(input)
        : config.ifMatchVersion;
    const payload = config.buildPayload
      ? config.buildPayload(input, clientId)
      : input;

    const outcome = await runOrQueue(
      {
        organizationId: config.organizationId,
        resource: config.resource,
        method: config.method,
        url,
        payload,
        ifMatchVersion: ifMatchVersion ?? null,
        clientId,
      },
      () => live(input),
    );
    if (outcome.status === 'queued') {
      if (config.buildOptimisticStub) {
        return config.buildOptimisticStub(input, clientId);
      }
      return { id: clientId, _pending: true } as unknown as TResult;
    }
    return outcome.result;
  };
}
