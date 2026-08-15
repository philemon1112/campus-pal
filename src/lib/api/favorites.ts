import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { apiRequest$ } from './client';
import type { ApiPage, Favorite, FavoriteType } from './types';

// Saved locations and food joints (SRS FR-1.7).
//
// The endpoints themselves are live. The gap is the `type` enum: the backend
// still uses the tourism app's `TOUR | STAY | RESTAURANT | DESTINATION`.
// So:
//   - FOOD_JOINT works today, sent over the wire as RESTAURANT;
//   - LOCATION has no server-side member, so saving a campus location will
//     400 until the backend adds it (docs/API_REQUIREMENTS.md §D).
//
// `isSupported()` lets a screen render the Save control and disable it
// honestly, rather than either hiding the feature or firing a call that can
// only fail.

const WIRE_TYPE: Record<FavoriteType, string> = {
  FOOD_JOINT: 'RESTAURANT',
  LOCATION: 'LOCATION',
};

export function isSupported(type: FavoriteType): boolean {
  return type === 'FOOD_JOINT';
}

type WireFavorite = Omit<Favorite, 'type'> & { type: string };

function fromWire(raw: WireFavorite): Favorite {
  return { ...raw, type: raw.type === 'RESTAURANT' ? 'FOOD_JOINT' : 'LOCATION' };
}

export function listFavorites$(type?: FavoriteType): Observable<ApiPage<Favorite>> {
  return apiRequest$<ApiPage<WireFavorite>>('/favorites', {
    query: { limit: 100, type: type ? WIRE_TYPE[type] : undefined },
  }).pipe(map((page) => ({ ...page, results: page.results.map(fromWire) })));
}

export function addFavorite$(type: FavoriteType, itemId: string): Observable<Favorite> {
  return apiRequest$<WireFavorite>('/favorites', {
    method: 'POST',
    body: { type: WIRE_TYPE[type], itemId },
  }).pipe(map(fromWire));
}

export function removeFavorite$(id: string): Observable<null> {
  return apiRequest$<null>(`/favorites/${id}`, { method: 'DELETE' });
}
