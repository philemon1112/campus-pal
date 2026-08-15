import { createContext, useContext } from 'react';
import type { UserProfile } from '@/lib/api';

// Context and hook live here, separate from the <AuthProvider> component in
// src/lib/auth.tsx, so that file exports only a component — otherwise Vite's
// Fast Refresh can't hot-reload it.

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  // Refetch the profile — call after anything that changes identity
  // (login, register) or mutates the profile (PATCH /users/me).
  refresh: () => void;
  // Revoke the session server-side, clear tokens, and drop the cached user.
  signOut: () => void;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
