import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PersistedFarm {
  id: string;
  name: string;
  location: string | null;
  size: number | null;
  manager_name: string | null;
}

interface FarmState {
  currentFarm: PersistedFarm | null;
  setCurrentFarm: (farm: PersistedFarm | null) => void;
  clearFarm: () => void;
}

// Drops invalid persisted entries (missing/blank id) on hydration so legacy
// `{ id: undefined }` rows from earlier code can't resurrect a phantom row in
// the farm switcher. Validation lives here, not in consumers.
const isValidFarm = (farm: PersistedFarm | null | undefined): farm is PersistedFarm =>
  Boolean(farm && typeof farm.id === 'string' && farm.id.trim());

export const useFarmStore = create<FarmState>()(
  persist(
    (set) => ({
      currentFarm: null,
      setCurrentFarm: (farm) => set({ currentFarm: isValidFarm(farm) ? farm : null }),
      clearFarm: () => set({ currentFarm: null }),
    }),
    {
      name: 'farm-storage',
      partialize: (state) => ({
        currentFarm: isValidFarm(state.currentFarm) ? state.currentFarm : null,
      }),
    },
  ),
);
