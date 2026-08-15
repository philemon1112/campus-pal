import { createContext, useContext } from 'react';

// Context + hook live here, apart from the <ThemeProvider> component in
// src/lib/theme.tsx, so that file exports only a component (Fast Refresh
// requires it). Same split as the auth context.

export type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeState {
  /** What the user chose. 'system' follows the OS. */
  preference: ThemePreference;
  /** What's actually on screen right now — 'system' already resolved. */
  resolved: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
  /** Flip between light and dark, leaving 'system' behind. */
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeState | null>(null);

export function useTheme(): ThemeState {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
