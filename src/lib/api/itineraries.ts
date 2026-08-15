import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { apiRequest$ } from './client';
import { toOptionalMinorUnits } from './money';
import type { ApiPage, GenerateItineraryInput, Itinerary, ItineraryItem } from './types';

// Same money mismatch as tours and bookings (see money.ts): the live API
// sends major units under shorter names -- `budget`, `estimatedTotal`,
// `estimatedCost` -- while this app works in the guide's minor units. Left
// unnormalised, every price on the itinerary screens silently vanished
// (the `*Minor` reads came back undefined, so the UI just omitted them).
type RawItem = Omit<ItineraryItem, 'estimatedCostMinor'> & {
  estimatedCostMinor?: number;
  estimatedCost?: number;
};

interface RawItinerary extends Omit<Itinerary, 'budgetMinor' | 'plan'> {
  budgetMinor?: number;
  budget?: number;
  plan: Omit<Itinerary['plan'], 'estimatedTotalMinor' | 'days'> & {
    estimatedTotalMinor?: number;
    estimatedTotal?: number;
    days: { day: number; title: string; items: RawItem[] }[];
  };
}

function normaliseItinerary(raw: RawItinerary): Itinerary {
  return {
    ...raw,
    budgetMinor: toOptionalMinorUnits(raw.budgetMinor, raw.budget),
    plan: {
      ...raw.plan,
      estimatedTotalMinor: toOptionalMinorUnits(
        raw.plan.estimatedTotalMinor,
        raw.plan.estimatedTotal,
      ),
      days: raw.plan.days.map((day) => ({
        ...day,
        items: day.items.map((item) => ({
          ...item,
          estimatedCostMinor: toOptionalMinorUnits(item.estimatedCostMinor, item.estimatedCost),
        })),
      })),
    },
  };
}

export function generateItinerary$(input: GenerateItineraryInput): Observable<Itinerary> {
  return apiRequest$<RawItinerary>('/itineraries/generate', {
    method: 'POST',
    body: input,
    timeoutMs: 120_000,
  }).pipe(map(normaliseItinerary));
}

export function listItineraries$(page = 1, limit = 20): Observable<ApiPage<Itinerary>> {
  return apiRequest$<ApiPage<RawItinerary>>('/itineraries', { query: { page, limit } }).pipe(
    map((page) => ({ ...page, results: page.results.map(normaliseItinerary) })),
  );
}

// Returns 404 (not 403) for an itinerary belonging to someone else.
export function getItinerary$(id: string): Observable<Itinerary> {
  return apiRequest$<RawItinerary>(`/itineraries/${id}`).pipe(map(normaliseItinerary));
}

export function deleteItinerary$(id: string): Observable<null> {
  return apiRequest$<null>(`/itineraries/${id}`, { method: 'DELETE' });
}
