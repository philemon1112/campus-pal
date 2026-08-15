import type { Observable } from 'rxjs';
import { apiRequest$ } from './client';
import type {
  ApiPage,
  CampusLocation,
  CreateLocationInput,
  LocationsQuery,
  UpdateLocationInput,
} from './types';

// Campus Explorer (SRS 3.1, FR-1.1 to FR-1.8).
//
// A separate resource from the tourism API's /destinations, which is
// region-shaped, has no category (so FR-1.1 and FR-1.6 would be impossible)
// and carries a single heroImageUrl rather than photos[]. Don't conflate
// them.
//
// Sending lat/lng populates `distanceKm` and sorts nearest-first, which is
// what makes "Near me" a server-side sort. `radiusKm` filters BEFORE paging,
// so `total` is the count within the radius, not the whole table.

// Reads are public — FR-4.1 lets anyone browse without an account.
export function listLocations$(query: LocationsQuery = {}): Observable<ApiPage<CampusLocation>> {
  return apiRequest$<ApiPage<CampusLocation>>('/locations', { query, auth: false });
}

export function getLocation$(slug: string): Observable<CampusLocation> {
  return apiRequest$<CampusLocation>(`/locations/${slug}`, { auth: false });
}

// --- Admin writes (FR-1.8) ---
// Detail reads go by slug, writes by id — the same split the rest of this
// API uses (/restaurants/:slug vs /restaurants/:id/menu).
//
// Unlike restaurants, the caller supplies the slug on create; a duplicate is
// a 409.

export function createLocation$(input: CreateLocationInput): Observable<CampusLocation> {
  return apiRequest$<CampusLocation>('/locations', { method: 'POST', body: input });
}

export function updateLocation$(
  id: string,
  input: UpdateLocationInput,
): Observable<CampusLocation> {
  return apiRequest$<CampusLocation>(`/locations/${id}`, { method: 'PATCH', body: input });
}

export function deleteLocation$(id: string): Observable<null> {
  return apiRequest$<null>(`/locations/${id}`, { method: 'DELETE' });
}
