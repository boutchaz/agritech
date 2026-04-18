// Theme Context for Dark Mode Support
import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useThemeStore, useResolvedTheme } from '@/stores/themeStore';
import { semanticColors, type ColorMode, type SemanticColors } from '@/constants/tokens';
import {
  colors as baseColors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows as baseShadows,
} from '@/constants/theme';

// Extended colors type for dark mode
type ColorShade = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

type ThemeColors = {
  primary: ColorShade;
  gray: ColorShade;
  red: {
    50: string;
    100: string;
    500: string;
    600: string;
    700: string;
  };
  yellow: {
    50: string;
    100: string;
    500: string;
    600: string;
  };
  blue: {
    50: string;
    100: string;
    500: string;
    600: string;
  };
  white: string;
  black: string;
  transparent: string;
};

type ThemeShadows = {
  sm: object;
  md: object;
  lg: object;
};

export interface Theme {
  mode: ColorMode;
  semantic: SemanticColors;
  colors: ThemeColors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  shadows: ThemeShadows;
}

// Dark mode colors
const darkColors: ThemeColors = {
  primary: {
    50: '#1a3d1e',
    100: '#1b5e20',
    200: '#2e7d32',
    300: '#43a047',
    400: '#66bb6a',
    500: '#66bb6a',
    600: '#81c784',
    700: '#a5d6a7',
    800: '#c8e6c9',
    900: '#e8f5e9',
  },
  gray: {
    50: '#121e14',
    100: '#1a2c1d',
    200: '#223426',
    300: '#2a3e2e',
    400: '#4a5a4c',
    500: '#6e7b6f',
    600: '#a8b8aa',
    700: '#c8d8ca',
    800: '#e0f0e2',
    900: '#e8f5e9',
  },
  red: {
    50: '#3d1a1a',
    100: '#5c1010',
    500: '#ef9a9a',
    600: '#e57373',
    700: '#ef5350',
  },
  yellow: {
    50: '#3e2a00',
    100: '#5c4000',
    500: '#ffb74d',
    600: '#ffa726',
  },
  blue: {
    50: '#0a3350',
    100: '#0d4a6b',
    500: '#4fc3f7',
    600: '#29b6f6',
  },
  white: '#121e14',
  black: '#e8f5e9',
  transparent: 'transparent',
};

const darkShadows: ThemeShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
};

// Light mode colors (from base)
const lightColors: ThemeColors = {
  primary: baseColors.primary,
  gray: baseColors.gray,
  red: baseColors.red,
  yellow: baseColors.yellow,
  blue: baseColors.blue,
  white: baseColors.white,
  black: baseColors.black,
  transparent: baseColors.transparent,
};

const lightShadows: ThemeShadows = {
  sm: baseShadows.sm,
  md: baseShadows.md,
  lg: baseShadows.lg,
};

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  mode: 'light' | 'dark' | 'system';
  setMode: (mode: 'light' | 'dark' | 'system') => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const loadTheme = useThemeStore((s) => s.loadTheme);
  const resolvedMode = useResolvedTheme();
  const isDark = resolvedMode === 'dark';

  // Load theme on mount
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const theme = useMemo<Theme>(() => {
    return {
      mode: resolvedMode,
      semantic: semanticColors[resolvedMode],
      colors: isDark ? darkColors : lightColors,
      spacing,
      borderRadius,
      fontSize,
      fontWeight,
      shadows: isDark ? darkShadows : lightShadows,
    };
  }, [resolvedMode, isDark]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
