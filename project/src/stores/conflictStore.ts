import { create } from 'zustand';

export type ConflictResolution = 'keep-mine' | 'use-server' | 'edit';

export interface ConflictPayload {
  id: string;
  resourceLabel: string;
  mine: Record<string, unknown>;
  server: Record<string, unknown>;
  /** Called when user resolves the conflict. */
  onResolve?: (decision: ConflictResolution) => void;
}

interface ConflictState {
  current: ConflictPayload | null;
  push: (p: ConflictPayload) => void;
  close: (decision?: ConflictResolution) => void;
}

export const useConflictStore = create<ConflictState>((set, get) => ({
  current: null,
  push: (p) => set({ current: p }),
  close: (decision) => {
    const cur = get().current;
    if (cur?.onResolve && decision) {
      try {
        cur.onResolve(decision);
      } catch {
        /* ignore */
      }
    }
    set({ current: null });
  },
}));
