import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from '@/lib/storage';

interface ActiveTimeSession {
  timeLogId: string | null;
  taskId: string | null;
  task: {
    id: string;
    title: string;
    status: string;
    farm?: { id: string; name: string };
    parcel?: { id: string; name: string };
  } | null;
  clockInTime: string | null;
  location: { lat: number; lng: number } | null;
}

interface TimeTrackingState {
  activeSession: ActiveTimeSession | null;
  isLoading: boolean;
}

interface TimeTrackingActions {
  setActiveSession: (session: ActiveTimeSession | null) => void;
  clearActiveSession: () => void;
  setLoading: (loading: boolean) => void;
}

export const useTimeTrackingStore = create<TimeTrackingState & TimeTrackingActions>()(
  persist(
    (set) => ({
      activeSession: null,
      isLoading: false,
      setActiveSession: (session) => set({ activeSession: session }),
      clearActiveSession: () => set({ activeSession: null }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'agritech-time-tracking',
      storage: zustandStorage,
    }
  )
);
