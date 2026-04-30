import { OutboxRow } from './db';
import type { Executor, ExecuteResult } from './outbox';
import { getApiHeaders } from '../api-client';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof TypeError)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network request failed') ||
    m.includes('load failed') ||
    m.includes('fetch')
  );
}

export const apiExecutor: Executor = async (row: OutboxRow): Promise<ExecuteResult> => {
  let headers: HeadersInit;
  try {
    headers = await getApiHeaders(row.organizationId);
  } catch (err) {
    return {
      status: 'retry',
      error: err instanceof Error ? err.message : 'auth',
    };
  }

  const fullUrl = row.url.startsWith('http') ? row.url : `${API_URL}${row.url}`;
  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
    'Idempotency-Key': row.clientId,
    'X-Client-Created-At': new Date(row.clientCreatedAt).toISOString(),
  };
  if (row.method !== 'DELETE') {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (row.ifMatchVersion != null) {
    finalHeaders['If-Match'] = String(row.ifMatchVersion);
  }

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      method: row.method,
      credentials: 'include',
      headers: finalHeaders,
      body: row.method === 'DELETE' ? undefined : JSON.stringify(row.payload),
    });
  } catch (err) {
    if (isNetworkError(err)) {
      return { status: 'retry', error: 'network' };
    }
    return {
      status: 'retry',
      error: err instanceof Error ? err.message : 'fetch',
    };
  }

  if (res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    return { status: 'ok', body };
  }
  if (res.status === 409) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* ignore */
    }
    return { status: 'conflict', body, error: 'version conflict' };
  }
  if (res.status === 401 || res.status === 403) {
    return { status: 'retry', error: `auth ${res.status}` };
  }
  if (res.status >= 500 || res.status === 0) {
    return { status: 'retry', error: `server ${res.status}` };
  }
  // 4xx other than 401/403/409 -> fatal, won't fix by retrying
  let msg = `http ${res.status}`;
  try {
    const j = await res.json();
    if (typeof j?.message === 'string') msg = j.message;
  } catch {
    /* ignore */
  }
  return { status: 'fatal', error: msg };
};
