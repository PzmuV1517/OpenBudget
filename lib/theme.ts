/**
 * Design tokens. Spacing/radius/type are theme-independent; colors come in two
 * palettes (light + a black/red dark) selected at runtime. Components never read
 * a static `colors` object anymore — they pull the active palette via
 * `useTheme()` so a mode switch re-renders the whole tree.
 */

export interface AppColors {
  // Surfaces
  background: string;
  card: string;
  cardAlt: string;
  // Text
  text: string;
  textMuted: string;
  textFaint: string;
  // Accent + status
  accent: string;
  accentSoft: string;
  positive: string;
  negative: string;
  warning: string;
  // Lines
  border: string;
  shadow: string;
}

export const lightColors: AppColors = {
  background: '#F5F6F8',
  card: '#FFFFFF',
  cardAlt: '#F0F2F5',
  text: '#15181E',
  textMuted: '#6B7280',
  textFaint: '#9CA3AF',
  accent: '#3B82F6',
  accentSoft: '#E6F0FE',
  positive: '#16A34A',
  negative: '#DC2626',
  warning: '#D97706',
  border: '#E5E7EB',
  shadow: '#000000',
};

/** Black & red dark theme. Pure-black surfaces, red accent, kept readable. */
export const darkColors: AppColors = {
  background: '#000000',
  card: '#141414',
  cardAlt: '#1F1F1F',
  text: '#F5F5F5',
  textMuted: '#A1A1AA',
  textFaint: '#6B7280',
  accent: '#FF3B30',
  accentSoft: '#2A1010',
  positive: '#34D399',
  negative: '#FF6B6B',
  warning: '#FBBF24',
  border: '#2A2A2A',
  shadow: '#000000',
};

export type ColorScheme = 'light' | 'dark';

/** Returns the stable palette object for a scheme (identity-stable for memo). */
export function getColors(scheme: ColorScheme): AppColors {
  return scheme === 'dark' ? darkColors : lightColors;
}

/** Default palette for new envelopes — independent of light/dark. */
export const envelopePalette = [
  '#3B82F6', // blue
  '#16A34A', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#14B8A6', // teal
  '#6366F1', // indigo
] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  fab: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;
