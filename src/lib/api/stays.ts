import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { apiRequest$ } from './client';
import { toMinorUnits } from './money';
import type { ApiPage } from './types';
import type { Reservation } from './restaurants';

// Module M3 — Stays / Accommodation. Search, detail and rooms are public;
// booking requires auth and creates a PENDING reservation.
export type StayCategory = 'HOTEL' | 'VILLA' | 'HOSTEL' | 'APARTMENT';

export interface Stay {
  id: string;
  slug: string;
  name: string;
  category: StayCategory;
  location: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  stars: number;
  ratingAvg: number;
  ratingCount: number;
  fromPriceMinor: number; // normalised from the API's major-unit `fromPrice`
  currency: string;
  amenities: string[];
  images?: string[];
  heroImageUrl?: string;
  description?: string;
}

export interface Room {
  id: string;
  name: string;
  maxGuests: number;
  bed: string;
  pricePerNightMinor: number;
  available: boolean;
}

export interface StaysQuery {
  [key: string]: string | number | boolean | undefined;
  page?: number;
  limit?: number;
  q?: string;
  category?: StayCategory;
  minPrice?: number; // GHS (major) — the API's own unit for these filters
  maxPrice?: number;
  lat?: number;
  lng?: number;
  guests?: number;
}

// Money arrives in major units under shorter names (see money.ts).
type RawStay = Omit<Stay, 'fromPriceMinor'> & { fromPriceMinor?: number; fromPrice?: number };
type RawRoom = Omit<Room, 'pricePerNightMinor'> & {
  pricePerNightMinor?: number;
  pricePerNight?: number;
};

const normaliseStay = (raw: RawStay): Stay => ({
  ...raw,
  fromPriceMinor: toMinorUnits(raw.fromPriceMinor, raw.fromPrice),
});

const normaliseRoom = (raw: RawRoom): Room => ({
  ...raw,
  pricePerNightMinor: toMinorUnits(raw.pricePerNightMinor, raw.pricePerNight),
});

export function listStays$(query: StaysQuery = {}): Observable<ApiPage<Stay>> {
  return apiRequest$<ApiPage<RawStay>>('/stays', { query, auth: false }).pipe(
    map((page) => ({ ...page, results: page.results.map(normaliseStay) })),
  );
}

export function getStay$(slug: string): Observable<Stay> {
  return apiRequest$<RawStay>(`/stays/${slug}`, { auth: false }).pipe(map(normaliseStay));
}

// Rates depend on the stay dates, so rooms are fetched per check-in/out.
export function listRooms$(
  stayId: string,
  params: { checkIn?: string; checkOut?: string; guests?: number } = {},
): Observable<Room[]> {
  return apiRequest$<RawRoom[]>(`/stays/${stayId}/rooms`, { query: params, auth: false }).pipe(
    map((rooms) => rooms.map(normaliseRoom)),
  );
}

type RawReservation = Omit<Reservation, 'totalMinor'> & { totalMinor?: number; total?: number };

export function bookStay$(
  stayId: string,
  input: { roomId: string; checkIn: string; checkOut: string; guests: number },
): Observable<Reservation> {
  return apiRequest$<RawReservation>(`/stays/${stayId}/book`, {
    method: 'POST',
    body: input,
  }).pipe(map((raw) => ({ ...raw, totalMinor: toMinorUnits(raw.totalMinor, raw.total) })));
}
