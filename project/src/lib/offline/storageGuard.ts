import { telemetry } from './telemetry';

export interface StorageStatus {
  persisted: boolean;
  usage: number;
  quota: number;
  ratio: number;
}

let cached: StorageStatus | null = null;
let lastCheck = 0;
const CHECK_INTERVAL_MS = 60_000;

export async function ensurePersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  try {
    const already = await navigator.storage.persisted?.();
    if (already) return true;
    const granted = await navigator.storage.persist();
    telemetry.track('offline_persist_request', { granted });
    return granted;
  } catch (err) {
    console.warn('[storageGuard] persist() failed', err);
    return false;
  }
}

export async function getStorageStatus(force = false): Promise<StorageStatus | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  const now = Date.now();
  if (!force && cached && now - lastCheck < CHECK_INTERVAL_MS) return cached;
  try {
    const estimate = await navigator.storage.estimate();
    const persisted = (await navigator.storage.persisted?.()) ?? false;
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    const ratio = quota > 0 ? usage / quota : 0;
    cached = { persisted, usage, quota, ratio };
    lastCheck = now;
    return cached;
  } catch {
    return null;
  }
}

export const QUOTA_WARN_RATIO = 0.8;
export const QUOTA_BLOCK_RATIO = 0.95;

export async function canAcceptNewPhoto(): Promise<boolean> {
  const s = await getStorageStatus();
  if (!s) return true;
  return s.ratio < QUOTA_BLOCK_RATIO;
}
