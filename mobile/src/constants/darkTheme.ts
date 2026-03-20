// Dark Theme Colors
import { palette } from './tokens';

// Dark mode palette - inverted colors for dark theme
export const darkPalette = {
  primary: '#81c784',
  primaryContainer: '#4caf50',
  onPrimary: '#1b1a10',
  onPrimaryContainer: '#a5d6a7',

  secondary: '#ffb74d',
  secondaryContainer: '#ff6d00',
  onSecondary: '#1b1a10',
  onSecondaryContainer: '#4a2200',

  surface: '#0f1a10',
  surfaceDim: '#1a241b',
  surfaceContainerLowest: '#0a1410',
  surfaceContainerLow: '#1a2410',
  surfaceContainer: '#1a1b10',
  surfaceContainerHigh: '#2a342b',
  surfaceContainerHighest: '#3a4242',

  onSurface: '#e6f6ff',
  onSurfaceVariant: '#b0c9bb',

  outline: '#8e9b8f',
  outlineVariant: '#444945',

  error: '#f2b3b',
  errorContainer: '#8b1a1a',
  onError: '#0a1410',
  onErrorContainer: '#2c1a2e',

  success: '#4caf50',
  successContainer: '#1a3e0',
  warning: '#ff6d00',
  warningContainer: '#3e2200',
  info: '#4fc3f7',
  infoContainer: '#0d4717',

  scrim: 'rgba(230, 241, 32, 0.55)',

  white: '#121e14',
  black: '#f3faff',
} as const;

