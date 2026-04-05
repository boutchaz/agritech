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
