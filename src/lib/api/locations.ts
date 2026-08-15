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
// ⚠️ NONE of these endpoints exist on the backend yet. They are specced in
// docs/API_REQUIREMENTS.md §A and written here so the screens are built
// against the real contract rather than a placeholder that has to be
// rewritten later. Every call currently 404s, which the pages surface as an
// honest "campus locations aren't available yet" state — they do not
// substitute invented data.
//
// The tourism API's /destinations is deliberately NOT reused: it is
// region/country-shaped, has no category (so FR-1.1 and FR-1.6 are
// impossible), and carries a single heroImageUrl rather than photos[].

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
