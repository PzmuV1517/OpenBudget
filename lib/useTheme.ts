/**
 * Resolves the active color palette from the persisted theme mode plus the OS
 * setting (for 'system'). Components call useTheme() for colors and
 * useThemedStyles() to memoize palette-dependent StyleSheets per scheme.
 */
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useBudget } from './store';
import { type AppColors, type ColorScheme, getColors } from './theme';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ActiveTheme {
  mode: ThemeMode;
  scheme: ColorScheme;
  colors: AppColors;
}

export function useTheme(): ActiveTheme {
  const mode = useBudget((s) => s.themeMode);
  const system = useColorScheme();
  // App default is dark: under 'system' we honor an explicit OS light setting
  // and fall back to dark for dark/unknown/unspecified.
  const scheme: ColorScheme =
    mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;
  const colors = getColors(scheme);
  return { mode, scheme, colors };
}

/** Memoized themed styles. `factory` receives the active palette. */
export function useThemedStyles<T>(factory: (colors: AppColors) => T): T {
  const { colors } = useTheme();
  // getColors() returns identity-stable palette objects, so this only
  // recomputes when the scheme actually changes.
  return useMemo(() => factory(colors), [colors, factory]);
}
