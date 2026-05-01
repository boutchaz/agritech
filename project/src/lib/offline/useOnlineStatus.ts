import { useEffect, useState } from 'react';

export type OnlineStatus = 'online' | 'offline' | 'limited';

const PING_PATH = '/api/v1/auth/ping';
const PING_INTERVAL_MS = 30_000;
const PING_TIMEOUT_MS = 5_000;

let lastReachable: number | null = null;
const listeners = new Set<(s: OnlineStatus) => void>();

async function pingServer(signal?: AbortSignal): Promise<boolean> {
  const url = `${import.meta.env.VITE_API_URL ?? ''}${PING_PATH}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
    const sig = signal ?? ctrl.signal;
    const res = await fetch(url, { method: 'GET', credentials: 'include', signal: sig });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

function deriveStatus(): OnlineStatus {
  if (typeof navigator === 'undefined') return 'online';
  if (!navigator.onLine) return 'offline';
  if (lastReachable === null) return 'online';
  const stale = Date.now() - lastReachable > PING_INTERVAL_MS * 2;
  return stale ? 'limited' : 'online';
}

function emit() {
  const s = deriveStatus();
  listeners.forEach((l) => {
    try {
      l(s);
    } catch {
      /* ignore */
    }
  });
}

let started = false;
let interval: number | null = null;

export function startOnlineMonitor(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  const tick = async () => {
    if (!navigator.onLine) {
      emit();
      return;
    }
    const ok = await pingServer();
    if (ok) lastReachable = Date.now();
    emit();
  };
  window.addEventListener('online', () => void tick());
  window.addEventListener('offline', emit);
  void tick();
  interval = window.setInterval(() => void tick(), PING_INTERVAL_MS);
}

export function stopOnlineMonitor(): void {
  started = false;
  if (interval !== null) {
    window.clearInterval(interval);
    interval = null;
  }
}

export function useOnlineStatus(): OnlineStatus {
  const [status, setStatus] = useState<OnlineStatus>(deriveStatus());
  useEffect(() => {
    startOnlineMonitor();
    listeners.add(setStatus);
    return () => {
      listeners.delete(setStatus);
    };
  }, []);
  return status;
}

export function isLikelyOnline(): boolean {
  return deriveStatus() !== 'offline';
}
