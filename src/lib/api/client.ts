import { Observable, TimeoutError, of, throwError } from 'rxjs';
import { catchError, finalize, shareReplay, switchMap, timeout } from 'rxjs/operators';
import { fromFetch } from 'rxjs/fetch';
import type { ApiEnvelope, AuthTokens } from './types';
import { clearTokens, getTokens, setTokens } from './tokenStore';

// The live API sends no CORS headers (see docs/DEVELOPMENT_LOG.md, "CORS
// blocker"), so in dev we default to a relative URL and let the Vite proxy
// (vite.config.ts) forward it server-to-server. Production has no such
// proxy, so it needs either VITE_API_BASE_URL set to a same-origin path
// behind a real reverse proxy, or the backend to start sending CORS headers.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? '' : 'https://tms-api-m7yf.onrender.com');

const API_PREFIX = '/api/v1';

export class ApiError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  // A FormData body is passed through untouched (multipart image upload);
  // anything else is JSON-encoded. See rawRequest$.
  body?: unknown;
  auth?: boolean; // attach Authorization header (default true)
  query?: Record<string, string | number | boolean | undefined>;
  // Abort after this many ms, surfaced as ApiError(408). Browser fetch has
  // no default timeout, so without this a hung request (Render cold start)
  // spins forever. Only set it where a call is expected to be slow — the AI
  // planner takes ~66s (see docs/DEVELOPMENT_LOG.md).
  timeoutMs?: number;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  // new URL() requires an absolute base; fall back to the page's own
  // origin so an empty API_BASE_URL resolves to a same-origin request
  // (picked up by the Vite dev proxy) instead of throwing.
  const base = API_BASE_URL || window.location.origin;
  const url = new URL(`${API_PREFIX}${path}`, base);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

// Every HTTP call as a cold Observable: nothing hits the network until
// something subscribes, and unsubscribing (e.g. a component unmounting
// mid-request) aborts the underlying fetch via fromFetch's AbortController
// integration — a real advantage over a Promise, which can't be cancelled
// once started.
function rawRequest$<T>(path: string, options: RequestOptions = {}): Observable<T> {
  const { method = 'GET', body, auth = true, query, timeoutMs } = options;
  // FormData must NOT get an explicit Content-Type -- the browser has to set
  // it itself so it can append the multipart boundary. Setting it by hand
  // produces a body the server can't parse.
  const isMultipart = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (body !== undefined && !isMultipart) headers['Content-Type'] = 'application/json';
  if (auth) {
    const tokens = getTokens();
    if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  const url = buildUrl(path, query);
  const request$ = fromFetch(url, {
    method,
    headers,
    body: isMultipart ? body : body !== undefined ? JSON.stringify(body) : undefined,
  }).pipe(
    switchMap((response) =>
      (response.json() as Promise<ApiEnvelope<T>>).then((envelope) => ({ response, envelope })),
    ),
    switchMap(({ response, envelope }) =>
      response.ok
        ? of(envelope.data)
        : throwError(
            () => new ApiError(envelope.code ?? response.status, envelope.message ?? response.statusText),
          ),
    ),
  );

  if (timeoutMs !== undefined) {
    // timeout() unsubscribes on expiry, which aborts the underlying fetch via
    // fromFetch's AbortController — so this genuinely cancels, it doesn't just
    // stop listening. Re-thrown as an ApiError so callers keep one error type.
    // Not pooled: a request that opted into a timeout keeps its cancellation.
    return request$.pipe(
      timeout(timeoutMs),
      catchError((err: unknown) =>
        throwError(() =>
          err instanceof TimeoutError ? new ApiError(408, 'Request timed out') : err,
        ),
      ),
    );
  }

  // Only GETs are safe to pool — sharing a POST/PATCH/DELETE would silently
  // collapse two distinct intents into one. The Authorization header is part
  // of the key so a token change (or logging out) can't serve a stale
  // identity's in-flight response.
  if (method !== 'GET') return request$;
  return shareInFlight$(`${url}|${headers.Authorization ?? ''}`, request$);
}

// De-duplicates concurrent identical GETs — the same shareReplay(1) trick
// used for token refresh below, generalised. Two components mounting at
// once and asking for the same URL share one HTTP request instead of
// racing two (e.g. TopNav and a page both wanting /users/me).
//
// This also absorbs React StrictMode's dev-only mount/unmount/remount:
// without it, the remount aborted the first request and started a second,
// which showed up in devtools as a cancelled request followed by a real
// one. That was harmless and dev-only, but noisy and easy to misread as a
// failure-and-retry.
//
// Deliberate trade-off: shareReplay keeps the source subscribed, so a GET
// no longer aborts at the network level when its last subscriber leaves.
// The protection that actually matters is unaffected — useApiResource
// still unsubscribes, so a slow stale response can never write state. Only
// GETs are pooled; mutations must never be shared, and requests that opt
// into a timeout keep their own cancellation.
const inFlightGets = new Map<string, Observable<unknown>>();

function shareInFlight$<T>(key: string, source: Observable<T>): Observable<T> {
  const existing = inFlightGets.get(key) as Observable<T> | undefined;
  if (existing) return existing;

  const shared = source.pipe(
    // Evict as soon as the response settles, so this pools concurrent
    // callers only — it is not a response cache. The next caller after
    // completion gets a genuinely fresh request.
    finalize(() => inFlightGets.delete(key)),
    shareReplay(1),
  );
  inFlightGets.set(key, shared);
  return shared;
}

// Coordinates concurrent 401s into a single in-flight refresh call —
// shareReplay(1) multicasts the one HTTP request's result to every
// subscriber that arrives while it's pending, mirroring the old
// Promise-based "refreshInFlight" cache but expressed as a shared stream.
let refresh$: Observable<AuthTokens> | null = null;

function refreshTokens$(): Observable<AuthTokens> {
  const current = getTokens();
  if (!current) return throwError(() => new ApiError(401, 'Not authenticated'));

  if (!refresh$) {
    refresh$ = rawRequest$<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: current.refreshToken },
      auth: false,
    }).pipe(
      switchMap((tokens) => {
        setTokens(tokens);
        return of(tokens);
      }),
      finalize(() => {
        refresh$ = null;
      }),
      shareReplay(1),
    );
  }
  return refresh$;
}

// Wraps rawRequest$ with one-shot access-token refresh-and-retry on a 401.
export function apiRequest$<T>(path: string, options: RequestOptions = {}): Observable<T> {
  return rawRequest$<T>(path, options).pipe(
    catchError((err: unknown) => {
      if (err instanceof ApiError && err.code === 401 && options.auth !== false && getTokens()) {
        return refreshTokens$().pipe(
          catchError(() => {
            clearTokens();
            return throwError(() => err);
          }),
          switchMap(() => rawRequest$<T>(path, options)),
        );
      }
      return throwError(() => err);
    }),
  );
}
