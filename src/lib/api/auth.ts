import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { apiRequest$ } from './client';
import { clearTokens, getTokens, setTokens } from './tokenStore';
import type { AuthTokens, LoginInput, RegisterInput } from './types';

export function register$(input: RegisterInput): Observable<AuthTokens> {
  return apiRequest$<AuthTokens>('/auth/register', { method: 'POST', body: input, auth: false }).pipe(
    tap(setTokens),
  );
}

export function login$(input: LoginInput): Observable<AuthTokens> {
  return apiRequest$<AuthTokens>('/auth/login', { method: 'POST', body: input, auth: false }).pipe(
    tap(setTokens),
  );
}

export function forgotPassword$(email: string): Observable<null> {
  return apiRequest$<null>('/auth/forgot-password', { method: 'POST', body: { email }, auth: false });
}

export function resetPassword$(token: string, password: string): Observable<null> {
  return apiRequest$<null>('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
    auth: false,
  });
}

// Best-effort server-side revocation; local tokens are cleared immediately
// regardless of whether the network call succeeds.
export function logout$(): Observable<void> {
  const tokens = getTokens();
  clearTokens();
  if (!tokens) return of(undefined);

  return apiRequest$<null>('/auth/logout', {
    method: 'POST',
    body: { refreshToken: tokens.refreshToken },
    auth: false,
  }).pipe(
    map(() => undefined),
    catchError(() => of(undefined)),
  );
}
