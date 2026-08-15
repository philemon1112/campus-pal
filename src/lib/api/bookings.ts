import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { apiRequest$ } from './client';
import { toMinorUnits } from './money';
import type { ApiPage, Booking, BookingListFilter, CreateBookingInput } from './types';

// The live API sends `total` in major units where the guide documents
// `totalMinor` in pesewas -- same mismatch as Tour.price. See money.ts.
type RawBooking = Omit<Booking, 'totalMinor'> & { totalMinor?: number; total?: number };

function normalizeBooking(raw: RawBooking): Booking {
  return { ...raw, totalMinor: toMinorUnits(raw.totalMinor, raw.total) };
}

export function createBooking$(input: CreateBookingInput): Observable<Booking> {
  return apiRequest$<RawBooking>('/bookings', { method: 'POST', body: input }).pipe(
    map(normalizeBooking),
  );
}

// `status` is the UI-tab filter (upcoming/completed/cancelled), NOT a
// BookingStatus -- see the note on BookingListFilter in types.ts.
export function listMyBookings$(
  status?: BookingListFilter,
  page = 1,
  limit = 20,
): Observable<ApiPage<Booking>> {
  return apiRequest$<ApiPage<RawBooking>>('/bookings/me', {
    query: { status, page, limit },
  }).pipe(map((result) => ({ ...result, results: result.results.map(normalizeBooking) })));
}

export function getBooking$(reference: string): Observable<Booking> {
  return apiRequest$<RawBooking>(`/bookings/${reference}`).pipe(map(normalizeBooking));
}

export function cancelBooking$(reference: string): Observable<Booking> {
  return apiRequest$<RawBooking>(`/bookings/${reference}/cancel`, { method: 'POST' }).pipe(
    map(normalizeBooking),
  );
}
