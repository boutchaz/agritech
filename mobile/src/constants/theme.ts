import { palette, space, radii, elevation, typeScale } from './tokens';

export const colors = {
  primary: {
    50: '#e8f5e9',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: palette.primaryContainer,
    600: palette.primary,
    700: '#00350a',
    800: '#002507',
    900: '#001503',
  },
  gray: {
    50: palette.surface,
    100: palette.surfaceContainerLow,
    200: palette.surfaceContainer,
    300: palette.surfaceContainerHigh,
    400: palette.outline,
    500: palette.onSurfaceVariant,
    600: '#3e4a3f',
    700: '#2a342b',
    800: '#1a241b',
    900: palette.onSurface,
  },
  red: {
    50: '#ffdad6',
    100: palette.errorContainer,
    500: palette.error,
    600: '#a00f0f',
    700: '#7a0b0b',
  },
  yellow: {
    50: palette.warningContainer,
    100: '#ffe0b2',
    500: palette.warning,
    600: palette.secondary,
  },
  blue: {
    50: palette.infoContainer,
    100: '#b3e5fc',
    500: palette.info,
    600: '#01579b',
  },
  white: palette.white,
  black: palette.black,
  transparent: 'transparent',
};

// Dark mode colors
export const darkColors = {
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

export const spacing = {
  xs: space.xs,
  sm: space.sm,
  md: space.md,
  lg: space.lg,
  xl: space.xl,
  '2xl': space['2xl'],
  '3xl': space['3xl'],
};

export const borderRadius = {
  none: radii.none,
  sm: radii.sm,
  md: radii.md,
  lg: radii.lg,
  xl: radii.xl,
  '2xl': radii['2xl'],
  full: radii.full,
};

export const fontSize = {
  xs: typeScale.caption.size,
  sm: typeScale.bodySmall.size,
  base: typeScale.body.size,
  lg: typeScale.h3.size,
  xl: typeScale.h2.size,
  '2xl': typeScale.h1.size,
  '3xl': typeScale.display.size,
  '4xl': typeScale.displayLg.size,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadows = {
  sm: elevation.sm,
  md: elevation.md,
  lg: elevation.lg,
};

export const theme = { colors, spacing, borderRadius, fontSize, fontWeight, shadows };
export type Theme = typeof theme;
