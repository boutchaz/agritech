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
