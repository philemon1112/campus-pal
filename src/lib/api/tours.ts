import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { apiRequest$ } from './client';
import { toMinorUnits } from './money';
import type {
  ApiPage,
  CreateDepartureInput,
  CreateTourInput,
  Departure,
  Tour,
  ToursQuery,
  UpdateTourInput,
} from './types';

// The live API sends `price` in major units where the guide documents
// `priceMinor` in pesewas, so every Tour crossing this boundary is
// normalised to the documented shape. See money.ts.
type RawTour = Omit<Tour, 'priceMinor'> & { priceMinor?: number; price?: number };

function normalizeTour(raw: RawTour): Tour {
  return { ...raw, priceMinor: toMinorUnits(raw.priceMinor, raw.price) };
}

// Both public reads below return APPROVED tours only. There is deliberately
// no way to list your own DRAFT/PENDING_REVIEW tours -- the backend has no
// `GET /tours/mine` yet (see docs/API_REQUIREMENTS.md), which is why the
// operator console remembers what it created rather than re-reading it.
export function listTours$(queryParams: ToursQuery = {}): Observable<ApiPage<Tour>> {
  return apiRequest$<ApiPage<RawTour>>('/tours', {
    auth: false,
    query: { ...queryParams },
  }).pipe(map((page) => ({ ...page, results: page.results.map(normalizeTour) })));
}

export function getTourBySlug$(slug: string): Observable<Tour> {
  return apiRequest$<RawTour>(`/tours/${slug}`, { auth: false }).pipe(map(normalizeTour));
}

export function listDepartures$(tourId: string): Observable<Departure[]> {
  return apiRequest$<Departure[]>(`/tours/${tourId}/departures`, { auth: false });
}

// --- Operator-owned writes (OPERATOR role, and owner of the tour) ---

// Created tours start as DRAFT and are invisible to the public listing
// until an ADMIN approves them.
export function createTour$(input: CreateTourInput): Observable<Tour> {
  return apiRequest$<RawTour>('/tours', { method: 'POST', body: input }).pipe(map(normalizeTour));
}

export function updateTour$(tourId: string, input: UpdateTourInput): Observable<Tour> {
  return apiRequest$<RawTour>(`/tours/${tourId}`, { method: 'PATCH', body: input }).pipe(map(normalizeTour));
}

// DRAFT -> PENDING_REVIEW.
export function submitTour$(tourId: string): Observable<Tour> {
  return apiRequest$<RawTour>(`/tours/${tourId}/submit`, { method: 'POST' }).pipe(map(normalizeTour));
}

export function createDeparture$(
  tourId: string,
  input: CreateDepartureInput,
): Observable<Departure> {
  return apiRequest$<Departure>(`/tours/${tourId}/departures`, { method: 'POST', body: input });
}

// --- Admin moderation ---

// PENDING_REVIEW -> APPROVED. Only after this does a tour appear in the
// public listing and become bookable.
export function approveTour$(tourId: string): Observable<Tour> {
  return apiRequest$<RawTour>(`/tours/${tourId}/approve`, { method: 'POST' }).pipe(map(normalizeTour));
}

export function suspendTour$(tourId: string): Observable<Tour> {
  return apiRequest$<RawTour>(`/tours/${tourId}/suspend`, { method: 'POST' }).pipe(map(normalizeTour));
}
