const CHANNEL_NAME = 'agrogina-offline-leader';
const HEARTBEAT_MS = 1500;
const STALE_MS = 4000;

type Msg =
  | { t: 'heartbeat'; id: string; ts: number }
  | { t: 'claim'; id: string; ts: number }
  | { t: 'flush'; reason?: string }
  | { t: 'enqueue-relay'; resource: string };

export interface LeaderHandle {
  isLeader: () => boolean;
  onLeadership: (cb: (isLeader: boolean) => void) => () => void;
  broadcastFlush: (reason?: string) => void;
  onFlushRequest: (cb: (reason?: string) => void) => () => void;
  destroy: () => void;
}

function newId(): string {
  return `tab-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

let handle: LeaderHandle | null = null;

export function startLeader(): LeaderHandle {
  if (handle) return handle;
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    handle = makeFallback();
    return handle;
  }
  const id = newId();
  const ch = new BroadcastChannel(CHANNEL_NAME);
  let leader = false;
  let lastSeenLeader = 0;
  let leaderId: string | null = null;
  const leadershipListeners = new Set<(b: boolean) => void>();
  const flushListeners = new Set<(reason?: string) => void>();

  function setLeader(v: boolean) {
    if (leader !== v) {
      leader = v;
      leadershipListeners.forEach((cb) => {
        try {
          cb(v);
        } catch {
          /* ignore */
        }
      });
    }
  }

  ch.onmessage = (e: MessageEvent<Msg>) => {
    const msg = e.data;
    if (msg.t === 'heartbeat' || msg.t === 'claim') {
      // Lower id wins to break ties.
      if (!leaderId || msg.id < leaderId || msg.t === 'claim') {
        leaderId = msg.id;
      }
      lastSeenLeader = Date.now();
      if (msg.id !== id && leader) {
        // Another tab claimed; defer if its id is lower
        if (msg.id < id) setLeader(false);
      }
    } else if (msg.t === 'flush') {
      flushListeners.forEach((cb) => {
        try {
          cb(msg.reason);
        } catch {
          /* ignore */
        }
      });
    }
  };

  function tick() {
    const now = Date.now();
    if (leader) {
      ch.postMessage({ t: 'heartbeat', id, ts: now });
      return;
    }
    if (now - lastSeenLeader > STALE_MS) {
      ch.postMessage({ t: 'claim', id, ts: now });
      // Brief settle window
      setTimeout(() => {
        if (Date.now() - lastSeenLeader > STALE_MS - 500 || leaderId === id) {
          setLeader(true);
          leaderId = id;
        }
      }, 250);
    }
  }

  // Initial claim
  setTimeout(tick, 50);
  const interval = window.setInterval(tick, HEARTBEAT_MS);

  function cleanup() {
    window.clearInterval(interval);
    try {
      ch.close();
    } catch {
      /* ignore */
    }
  }
  window.addEventListener('beforeunload', cleanup);

  handle = {
    isLeader: () => leader,
    onLeadership: (cb) => {
      leadershipListeners.add(cb);
      try {
        cb(leader);
      } catch {
        /* ignore */
      }
      return () => leadershipListeners.delete(cb);
    },
    broadcastFlush: (reason) => {
      try {
        ch.postMessage({ t: 'flush', reason });
      } catch {
        /* ignore */
      }
    },
    onFlushRequest: (cb) => {
      flushListeners.add(cb);
      return () => flushListeners.delete(cb);
    },
    destroy: cleanup,
  };
  return handle;
}

function makeFallback(): LeaderHandle {
  return {
    isLeader: () => true,
    onLeadership: (cb) => {
      try {
        cb(true);
      } catch {
        /* ignore */
      }
      return () => {};
    },
    broadcastFlush: () => {},
    onFlushRequest: () => () => {},
    destroy: () => {},
  };
}
