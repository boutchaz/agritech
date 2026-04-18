import { PixelRatio, Platform } from 'react-native';

const pixel = (value: number): number => PixelRatio.roundToNearestPixel(value);

export function scaledFont(base: number, fontScale: number): number {
  const clamped = Math.min(Math.max(fontScale, 0.85), 1.35);
  return pixel(base * clamped);
}

// ---------------------------------------------------------------------------
// PALETTE — High-Contrast Utility
// ---------------------------------------------------------------------------

export const palette = {
  primary: '#00450d',
  primaryContainer: '#1b5e20',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#c8e6c9',

  secondary: '#8f4e00',
  secondaryContainer: '#ff8f00',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#3e2200',

  surface: '#f3faff',
  surfaceDim: '#d3dce2',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#e6f6ff',
  surfaceContainer: '#dbf1fe',
  surfaceContainerHigh: '#cfe6f2',
  surfaceContainerHighest: '#c0dae8',

  onSurface: '#0f1a10',
  onSurfaceVariant: '#3e4a3f',

  outline: '#6e7b6f',
  outlineVariant: '#c0c9bb',

  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#410002',

  success: '#1b5e20',
  successContainer: '#c8e6c9',
  warning: '#ff8f00',
  warningContainer: '#fff3e0',
  info: '#0277bd',
  infoContainer: '#e1f5fe',

  scrim: 'rgba(15, 26, 16, 0.55)',

  white: '#ffffff',
  black: '#0f1a10',
} as const;

// ---------------------------------------------------------------------------
// SURFACES — Tonal Layering (no shadows, no borders)
// ---------------------------------------------------------------------------

export type ColorMode = 'light' | 'dark';

export type SemanticColors = {
  background: string;
  surface: string;
  surfaceLow: string;
  surfaceContainer: string;
  surfaceHigh: string;
  surfaceHighest: string;
  surfaceLowest: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  iconDefault: string;
  iconSubtle: string;

  brandPrimary: string;
  brandContainer: string;
  brandText: string;
  onBrand: string;

  accent: string;
  accentContainer: string;
  accentText: string;
  onAccent: string;

  success: string;
  successContainer: string;
  warning: string;
  warningContainer: string;
  error: string;
  errorContainer: string;
  info: string;
  infoContainer: string;

  outline: string;
  outlineVariant: string;
  overlay: string;

  gradientFrom: string;
  gradientTo: string;
};

export const semanticColors: Record<ColorMode, SemanticColors> = {
  light: {
    background: palette.surface,
    surface: palette.surface,
    surfaceLow: palette.surfaceContainerLow,
    surfaceContainer: palette.surfaceContainer,
    surfaceHigh: palette.surfaceContainerHigh,
    surfaceHighest: palette.surfaceContainerHighest,
    surfaceLowest: palette.surfaceContainerLowest,

    textPrimary: palette.onSurface,
    textSecondary: palette.onSurfaceVariant,
    textTertiary: palette.outline,
    textInverse: palette.white,

    iconDefault: palette.onSurfaceVariant,
    iconSubtle: palette.outline,

    brandPrimary: palette.primary,
    brandContainer: palette.primaryContainer,
    brandText: palette.onPrimaryContainer,
    onBrand: palette.onPrimary,

    accent: palette.secondaryContainer,
    accentContainer: palette.warningContainer,
    accentText: palette.onSecondaryContainer,
    onAccent: palette.onSecondaryContainer,

    success: palette.success,
    successContainer: palette.successContainer,
    warning: palette.warning,
    warningContainer: palette.warningContainer,
    error: palette.error,
    errorContainer: palette.errorContainer,
    info: palette.info,
    infoContainer: palette.infoContainer,

    outline: palette.outline,
    outlineVariant: palette.outlineVariant,
    overlay: palette.scrim,

    gradientFrom: palette.primary,
    gradientTo: palette.primaryContainer,
  },
  dark: {
    background: '#0a1a0c',
    surface: '#121e14',
    surfaceLow: '#1a2c1d',
    surfaceContainer: '#223426',
    surfaceHigh: '#2a3e2e',
    surfaceHighest: '#334837',
    surfaceLowest: '#0a1a0c',

    textPrimary: '#e0f0e2',
    textSecondary: '#a8b8aa',
    textTertiary: '#6e7b6f',
    textInverse: palette.onSurface,

    iconDefault: '#a8b8aa',
    iconSubtle: '#6e7b6f',

    brandPrimary: '#66bb6a',
    brandContainer: '#1b5e20',
    brandText: '#c8e6c9',
    onBrand: '#0f1a10',

    accent: '#ffb74d',
    accentContainer: '#3e2200',
    accentText: '#ffe0b2',
    onAccent: '#3e2200',

    success: '#66bb6a',
    successContainer: '#1b3e1e',
    warning: '#ffb74d',
    warningContainer: '#3e2a00',
    error: '#ef9a9a',
    errorContainer: '#5c1010',
    info: '#4fc3f7',
    infoContainer: '#0a3350',

    outline: '#4a5a4c',
    outlineVariant: '#334837',
    overlay: 'rgba(10, 26, 12, 0.7)',

    gradientFrom: '#1b5e20',
    gradientTo: '#2e7d32',
  },
};

// ---------------------------------------------------------------------------
// TYPOGRAPHY — Inter, editorial authority
// ---------------------------------------------------------------------------

export const fontFamily = {
  regular: Platform.select({ ios: 'Inter-Regular', android: 'Inter_400Regular' }) as string,
  medium: Platform.select({ ios: 'Inter-Medium', android: 'Inter_500Medium' }) as string,
  semibold: Platform.select({ ios: 'Inter-SemiBold', android: 'Inter_600SemiBold' }) as string,
  bold: Platform.select({ ios: 'Inter-Bold', android: 'Inter_700Bold' }) as string,
  system: Platform.select({ ios: 'System', android: 'sans-serif' }) as string,
} as const;

export const typeScale = {
  displayLg: { size: 56, lineHeight: 64, tracking: -1.5, weight: 'bold' as const },
  displayMd: { size: 45, lineHeight: 52, tracking: -1, weight: 'bold' as const },
  displaySm: { size: 36, lineHeight: 44, tracking: -0.5, weight: 'bold' as const },
  headlineLg: { size: 32, lineHeight: 40, tracking: 0, weight: 'bold' as const },
  headlineMd: { size: 28, lineHeight: 36, tracking: 0, weight: 'bold' as const },
  headlineSm: { size: 24, lineHeight: 32, tracking: 0, weight: 'semibold' as const },
  titleLg: { size: 22, lineHeight: 28, tracking: 0, weight: 'semibold' as const },
  titleMd: { size: 16, lineHeight: 24, tracking: 0.15, weight: 'semibold' as const },
  titleSm: { size: 14, lineHeight: 20, tracking: 0.1, weight: 'semibold' as const },
  bodyLg: { size: 16, lineHeight: 24, tracking: 0.5, weight: 'regular' as const },
  bodyMd: { size: 14, lineHeight: 20, tracking: 0.25, weight: 'regular' as const },
  bodySm: { size: 12, lineHeight: 16, tracking: 0.4, weight: 'regular' as const },
  labelLg: { size: 14, lineHeight: 20, tracking: 0.1, weight: 'medium' as const },
  labelMd: { size: 12, lineHeight: 16, tracking: 0.5, weight: 'medium' as const },
  labelSm: { size: 11, lineHeight: 16, tracking: 0.5, weight: 'medium' as const },

  display: { size: 36, lineHeight: 44, tracking: -0.5 },
  h1: { size: 32, lineHeight: 40, tracking: 0 },
  h2: { size: 28, lineHeight: 36, tracking: 0 },
  h3: { size: 22, lineHeight: 28, tracking: 0 },
  body: { size: 16, lineHeight: 24, tracking: 0.5 },
  bodySmall: { size: 14, lineHeight: 20, tracking: 0.25 },
  caption: { size: 12, lineHeight: 16, tracking: 0.4 },
  label: { size: 12, lineHeight: 16, tracking: 0.5 },
  overline: { size: 11, lineHeight: 16, tracking: 1.5 },
} as const;

export const scalableTokens = new Set<keyof typeof typeScale>([
  'body', 'bodySmall', 'bodyLg', 'bodyMd', 'bodySm',
  'h1', 'h2', 'h3',
  'headlineLg', 'headlineMd', 'headlineSm',
  'titleLg', 'titleMd', 'titleSm',
]);

// ---------------------------------------------------------------------------
// SPACING — generous, editorial
// ---------------------------------------------------------------------------

export const space = {
  none: 0,
  xs: pixel(4),
  sm: pixel(8),
  md: pixel(12),
  lg: pixel(16),
  xl: pixel(24),
  '2xl': pixel(32),
  '3xl': pixel(40),
  '4xl': pixel(48),
  '5xl': pixel(64),
  '6xl': pixel(80),
} as const;

export const layoutSpace = {
  pageInset: space.lg,
  cardInset: space.lg,
  stack: space.lg,
  inline: space.sm,
  listGap: space.xl,
  sectionGap: space['3xl'],
  buttonPaddingH: space.xl,
  buttonPaddingV: space.md,
} as const;

// ---------------------------------------------------------------------------
// RADII — ruggedized, 8px standard
// ---------------------------------------------------------------------------

export const radii = {
  none: 0,
  sm: pixel(4),
  md: pixel(8),
  lg: pixel(12),
  xl: pixel(16),
  '2xl': pixel(24),
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// ELEVATION — tonal, not shadow-based
// ---------------------------------------------------------------------------

export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  lg: {
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

// ---------------------------------------------------------------------------
// PLATFORM
// ---------------------------------------------------------------------------

export const platformConstants = {
  ios: { tabBarHeight: 83, statusBarHeight: 47 },
  android: { tabBarHeight: 64, statusBarHeight: 24 },
} as const;
