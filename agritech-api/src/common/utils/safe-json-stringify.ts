import { inspect } from 'node:util';

import type { AxiosError } from 'axios';

/**
 * Serialize values for error messages / logs without throwing on circular references
 * (e.g. axios payloads that accidentally reference req/res/socket).
 */
export function safeJsonStringifyForError(value: unknown, maxLen = 2000): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.length > maxLen ? `${value.slice(0, maxLen)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    const s = value.toString('utf8');
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  }
  try {
    const s = JSON.stringify(value);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return 'Unserializable error payload';
  }
}

/** Prefer .message on Error-like objects before JSON.stringify */
export function streamApiErrorMessage(parsedError: unknown): string {
  if (typeof parsedError === 'string') {
    return parsedError;
  }
  if (parsedError && typeof parsedError === 'object' && !Array.isArray(parsedError)) {
    const msg = (parsedError as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.length > 0) {
      return msg;
    }
  }
  return safeJsonStringifyForError(parsedError) || 'Unknown stream error';
}

function isReadableStreamLike(x: unknown): boolean {
  if (!x || typeof x !== 'object') return false;
  return typeof (x as { pipe?: unknown }).pipe === 'function';
}

/**
 * Human-readable axios failure for logs and thrown Error messages.
 * With responseType: 'stream', failed responses may attach a Readable as `data` (not JSON.stringify-able).
 */
export function formatAxiosErrorForLog(error: AxiosError, bodyMaxLen = 1500): string {
  const code = error.code ? ` [${error.code}]` : '';
  const baseMsg = error.message || 'Request failed';

  const res = error.response;
  if (!res) {
    return `${baseMsg}${code}`;
  }

  const statusPart = `HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''}`;

  const data = res.data as unknown;
  if (data == null || data === '') {
    return `${statusPart}${code} — ${baseMsg}`;
  }

  if (typeof data === 'string') {
    const t = data.trim();
    const s = t.length > bodyMaxLen ? `${t.slice(0, bodyMaxLen)}…` : t;
    return `${statusPart}: ${s}`;
  }

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
    const t = data.toString('utf8').trim();
    const s = t.length > bodyMaxLen ? `${t.slice(0, bodyMaxLen)}…` : t;
    return `${statusPart}: ${s || '[empty body]'}`;
  }

  if (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer) {
    const t = Buffer.from(data).toString('utf8').trim();
    const s = t.length > bodyMaxLen ? `${t.slice(0, bodyMaxLen)}…` : t;
    return `${statusPart}: ${s || '[binary body]'}`;
  }

  if (isReadableStreamLike(data)) {
    return (
      `${statusPart}: stream response body (request rejected before readable data) — ` +
      `check Z.ai API key/token, model id, and quotas. ${baseMsg}${code}`
    );
  }

  try {
    const s = JSON.stringify(data);
    const out = s.length > bodyMaxLen ? `${s.slice(0, bodyMaxLen)}…` : s;
    return `${statusPart}: ${out}`;
  } catch {
    try {
      const inspected = inspect(data, { depth: 4, maxStringLength: 400, breakLength: 100 });
      const out = inspected.length > bodyMaxLen ? `${inspected.slice(0, bodyMaxLen)}…` : inspected;
      return `${statusPart}: ${out}`;
    } catch {
      return `${statusPart}: [could not read error body] — ${baseMsg}${code}`;
    }
  }
}
