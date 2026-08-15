import type { Observable } from 'rxjs';
import { apiRequest$ } from './client';
import type { ReferenceEntry } from './types';

// Server-owned option lists (public). Using these instead of hardcoding
// means a set the backend extends — a new cuisine, a new location category —
// shows up without a frontend release.
//
// Note the entry shape is `{ code, label }`, not `{ value, label }`.
//
// The sets CampusPal uses are below; `GET /reference` also serves the
// tourism app's (cabins, airports, ride-statuses…), which are ignored here.
export type ReferenceSet = 'location-categories' | 'food-categories' | 'dietary' | 'cuisines';

export function getReferenceSet$(set: ReferenceSet): Observable<ReferenceEntry[]> {
  return apiRequest$<ReferenceEntry[]>(`/reference/${set}`, { auth: false });
}
