import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Subscription } from 'rxjs';
import { authApi, clearTokens, getTokens, usersApi, type UserProfile } from '@/lib/api';
import { AuthContext } from '@/hooks/useAuth';

// Single source of truth for "who is signed in". The context and the
// useAuth hook live in src/hooks/useAuth.ts; this file holds only the
// provider component.
//
// Replaces the old useCurrentUser hook, which fetched GET /users/me
// independently on every mount — so TopNav plus any page that also wanted
// the user issued two concurrent requests for the same thing on every
// screen. That was real duplication in production, not just a dev artifact.
//
// It also closes the gap noted in docs/HANDOFF.md: because the profile now
// lives in one place, logging in or out updates the nav immediately instead
// of needing a full page reload.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  // Start in a loading state only when there's a token worth resolving;
  // a signed-out visitor should render immediately, not flash a spinner.
  const [loading, setLoading] = useState(() => getTokens() !== null);
  const subscription = useRef<Subscription | null>(null);

  const refresh = useCallback(() => {
    subscription.current?.unsubscribe();

    if (!getTokens()) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    subscription.current = usersApi.getMe$().subscribe({
      next: (profile) => {
        setUser(profile);
        setLoading(false);
      },
      // A failed profile fetch means "not usable as a signed-in user" —
      // the token may have been revoked. Render as signed out rather than
      // half-authenticated.
      error: () => {
        setUser(null);
        setLoading(false);
      },
    });
  }, []);

  const signOut = useCallback(() => {
    // logout$ clears tokens itself and is best-effort about the network
    // call, so local state can drop immediately either way.
    authApi.logout$().subscribe();
    clearTokens();
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    return () => subscription.current?.unsubscribe();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, refresh, signOut }),
    [user, loading, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
