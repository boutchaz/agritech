// Theme Store for Dark Mode Support
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from 'react-native';

const THEME_KEY = 'agritech_theme';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isLoaded: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  isLoaded: false,

  setMode: async (mode: ThemeMode) => {
    await SecureStore.setItemAsync(THEME_KEY, mode);
    set({ mode });
  },

  loadTheme: async () => {
    try {
      const storedMode = await SecureStore.getItemAsync(THEME_KEY);
      if (storedMode && ['light', 'dark', 'system'].includes(storedMode)) {
        set({ mode: storedMode as ThemeMode, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },
}));

// Hook to get the actual resolved theme (light or dark)
export function useResolvedTheme(): 'light' | 'dark' {
  const mode = useThemeStore((s) => s.mode);
  const systemColorScheme = useColorScheme();

  if (mode === 'system') {
    return systemColorScheme === 'dark' ? 'dark' : 'light';
  }
  return mode;
}

// Hook to check if dark mode is active
export function useIsDarkMode(): boolean {
  return useResolvedTheme() === 'dark';
}
