import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { apiRequest$ } from './client';
import type { ApiPage, Favorite, FavoriteType } from './types';

// Saved locations and food joints (SRS FR-1.7).
//
// The wire enum is shared with the tourism app
// (TOUR|STAY|RESTAURANT|DESTINATION|LOCATION). CampusPal uses two members:
// LOCATION as-is, and RESTAURANT under the app's own name, FOOD_JOINT. That
// rename is the only reason this mapping exists — both types work.
//
// `item` is snapshotted server-side at save time, so /saved renders in one
// call with no per-item lookups.

const WIRE_TYPE: Record<FavoriteType, string> = {
  FOOD_JOINT: 'RESTAURANT',
  LOCATION: 'LOCATION',
};

type WireFavorite = Omit<Favorite, 'type'> & { type: string };

function fromWire(raw: WireFavorite): Favorite {
  return { ...raw, type: raw.type === 'RESTAURANT' ? 'FOOD_JOINT' : 'LOCATION' };
}

export function listFavorites$(type?: FavoriteType): Observable<ApiPage<Favorite>> {
  return apiRequest$<ApiPage<WireFavorite>>('/favorites', {
    query: { limit: 100, type: type ? WIRE_TYPE[type] : undefined },
  }).pipe(map((page) => ({ ...page, results: page.results.map(fromWire) })));
}

// A duplicate save is a 409; callers treat that as "already saved" rather
// than as a failure.
export function addFavorite$(type: FavoriteType, itemId: string): Observable<Favorite> {
  return apiRequest$<WireFavorite>('/favorites', {
    method: 'POST',
    body: { type: WIRE_TYPE[type], itemId },
  }).pipe(map(fromWire));
}

export function removeFavorite$(id: string): Observable<null> {
  return apiRequest$<null>(`/favorites/${id}`, { method: 'DELETE' });
}
