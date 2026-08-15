import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { apiRequest$ } from './client';
import { toMinorUnits } from './money';
import type { Reservation } from './restaurants';

// Module M2 — Flights. Search returns time-limited priced offers rather
// than a plain list: fares are volatile, so an offer carries `expiresAt`
// and GET /flights/offers/:id returns 400 once it has lapsed.
export type Cabin = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
export type TripType = 'ONE_WAY' | 'RETURN' | 'MULTI_CITY';

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export interface FlightSegment {
  origin: string;
  destination: string;
  departsAt: string;
  arrivesAt: string;
  flightNumber: string;
  durationMinutes: number;
}

export interface FlightOffer {
  offerId: string;
  airline: { code: string; name: string; logoUrl?: string | null };
  segments: FlightSegment[];
  stops: number;
  cabin: Cabin;
  totalMinor: number; // normalised from the API's major-unit `total`
  currency: string;
  baggageKg?: number;
  refundable: boolean;
  amenities: string[];
  expiresAt: string;
}

export interface FlightSearchResult {
  searchId: string;
  expiresAt: string;
  offers: FlightOffer[];
}

export interface FlightSearchInput {
  tripType: TripType;
  origin: string;
  destination: string;
  date: string; // ISO
  passengers: { adults: number; children?: number; infants?: number };
  cabin: Cabin;
  sort?: 'price' | '-price' | 'departsAt';
}

type RawOffer = Omit<FlightOffer, 'totalMinor'> & { totalMinor?: number; total?: number };

const normaliseOffer = (raw: RawOffer): FlightOffer => ({
  ...raw,
  totalMinor: toMinorUnits(raw.totalMinor, raw.total),
});

export function searchAirports$(q: string): Observable<Airport[]> {
  return apiRequest$<Airport[]>('/flights/airports', { query: { q }, auth: false });
}

// An empty `offers` array is a legitimate result, not an error — the
// schedule genuinely has no flights on some dates.
export function searchFlights$(input: FlightSearchInput): Observable<FlightSearchResult> {
  return apiRequest$<{ searchId: string; expiresAt: string; offers: RawOffer[] }>(
    '/flights/search',
    { method: 'POST', body: input, auth: false },
  ).pipe(map((result) => ({ ...result, offers: result.offers.map(normaliseOffer) })));
}

// 400 once the offer has expired — callers should re-run the search.
export function getOffer$(offerId: string): Observable<FlightOffer> {
  return apiRequest$<RawOffer>(`/flights/offers/${offerId}`, { auth: false }).pipe(
    map(normaliseOffer),
  );
}

type RawReservation = Omit<Reservation, 'totalMinor'> & { totalMinor?: number; total?: number };

export function bookOffer$(offerId: string): Observable<Reservation> {
  return apiRequest$<RawReservation>(`/flights/offers/${offerId}/book`, { method: 'POST' }).pipe(
    map((raw) => ({ ...raw, totalMinor: toMinorUnits(raw.totalMinor, raw.total) })),
  );
}
