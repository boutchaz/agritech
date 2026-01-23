import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TimeLog, Task } from '@/lib/api';

interface ActiveTimeSession {
  timeLogId: string | null;
  taskId: string | null;
  task: Task | null;
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
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
