import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeContext, type ThemePreference } from '@/hooks/useTheme';

// Owns the `.dark` class on <html>, which is what Tailwind's dark variant
// keys off (see the @custom-variant in index.css). Without that class
// strategy, `dark:` would follow the OS only and a manual switch would be
// impossible.
//
// Three-state on purpose: 'system' is the default and keeps following the OS
// as it changes; picking light/dark opts out and persists.
const STORAGE_KEY = 'tms.theme';

function readPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Keep following the OS while the preference is 'system'.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolved: 'light' | 'dark' =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    // Keeps native form controls, scrollbars and the like in step with the
    // chosen theme rather than the OS one.
    root.style.colorScheme = resolved;
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    if (next === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  }, []);

  // Toggle acts on what's currently visible, so one tap always flips the
  // screen — even from 'system'.
  const toggle = useCallback(() => {
    setPreference(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setPreference]);

  const value = useMemo(
    () => ({ preference, resolved, setPreference, toggle }),
    [preference, resolved, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
