import { createContext, useContext, useMemo, useEffect, type ReactNode } from 'react';
import { useColorScheme, PixelRatio } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  type ColorMode,
  semanticColors,
  fontFamily,
  typeScale,
  scalableTokens,
  scaledFont,
  space,
  layoutSpace,
  radii,
  elevation,
  palette,
} from '@/constants/tokens';
import { useThemeStore } from '@/stores/themeStore';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  mode: ColorMode; // Resolved mode (light or dark)
  themeMode: ThemeMode; // User preference (light, dark, or system)
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: typeof semanticColors.light;
  palette: typeof palette;
  type: typeof typeScale;
  font: typeof fontFamily;
  space: typeof space;
  layout: typeof layoutSpace;
  radii: typeof radii;
  elevation: typeof elevation;
  fontScale: number;
  fontsLoaded: boolean;
  sz: (token: keyof typeof typeScale) => number;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const loadTheme = useThemeStore((s) => s.loadTheme);

  // Load saved theme preference on mount
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  // Resolve the actual mode based on user preference
  const mode: ColorMode = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return themeMode;
  }, [themeMode, systemScheme]);

  const isDark = mode === 'dark';

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const rawScale = PixelRatio.getFontScale();
  const fontScale = Math.min(Math.max(rawScale, 0.85), 1.35);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      themeMode,
      setThemeMode,
      isDark,
      colors: semanticColors[mode],
      palette,
      type: typeScale,
      font: fontFamily,
      space,
      layout: layoutSpace,
      radii,
      elevation,
      fontScale,
      fontsLoaded,
      sz: (token: keyof typeof typeScale) =>
        scalableTokens.has(token)
          ? scaledFont(typeScale[token].size, fontScale)
          : typeScale[token].size,
    }),
    [mode, themeMode, isDark, fontScale, fontsLoaded],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
