import type { Observable } from 'rxjs';
import { apiRequest$ } from './client';
import type {
  ApiPage,
  CreateDestinationInput,
  Destination,
  UpdateDestinationInput,
} from './types';

export function listDestinations$(page = 1, limit = 20): Observable<ApiPage<Destination>> {
  return apiRequest$<ApiPage<Destination>>('/destinations', {
    auth: false,
    query: { page, limit },
  });
}

export function getDestination$(id: string): Observable<Destination> {
  return apiRequest$<Destination>(`/destinations/${id}`, { auth: false });
}

// --- Admin writes ---
// Unlike tours, the read endpoints above are unfiltered, so an admin can
// genuinely list, edit and delete the full catalogue.

export function createDestination$(input: CreateDestinationInput): Observable<Destination> {
  return apiRequest$<Destination>('/destinations', { method: 'POST', body: input });
}

export function updateDestination$(
  id: string,
  input: UpdateDestinationInput,
): Observable<Destination> {
  return apiRequest$<Destination>(`/destinations/${id}`, { method: 'PATCH', body: input });
}

export function deleteDestination$(id: string): Observable<null> {
  return apiRequest$<null>(`/destinations/${id}`, { method: 'DELETE' });
}
