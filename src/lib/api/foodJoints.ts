import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { apiRequest$ } from './client';
import { toMinorUnits } from './money';
import type { ApiPage, CreateReviewInput, Review } from './types';

// Food joints (SRS 3.2, FR-2.1 to FR-2.8).
//
// This is the one vertical with a real, working backend: listing, detail and
// menu are all live and public, with server-side filtering. What it is
// MISSING for CampusPal:
//
//   - contact fields. `phone`/`whatsapp` are typed optional below and the
//     live payload never sends them, so FR-2.4 — the SRS's headline food
//     feature, call/WhatsApp a joint — renders as a disabled control today.
//   - `campusArea`. FR-2.2 wants search by location and FR-2.3 wants
//     "location on campus"; lat/lng alone cannot render "near Legon Hall".
//   - reviews (FR-2.8) and vendor writes (FR-2.7) — no endpoints at all.
//
// All of it is specced in docs/API_REQUIREMENTS.md §B. The optional fields
// are TYPED rather than faked: when the backend starts sending them the UI
// lights up with no client change, and until then the controls are honestly
// inert.
//
// Note also that the seeded rows are Accra city restaurants, not campus
// joints — the data needs replacing as much as the schema does.

export type DietaryTag = 'VEGETARIAN' | 'VEGAN' | 'HALAL' | 'GLUTEN_FREE';

export interface OpeningHours {
  day: number; // 0 = Sunday
  opens: string; // "11:00"
  closes: string; // "22:00"
}

export interface FoodJoint {
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  priceTier: number; // 1-4, rendered as ₵-₵₵₵₵
  lat: number;
  lng: number;
  distanceKm?: number; // only when lat/lng were supplied
  ratingAvg: number;
  ratingCount: number;
  dietary: DietaryTag[];
  isOpenNow: boolean;
  heroImageUrl?: string;
  images?: string[];
  description?: string;
  openingHours?: OpeningHours[];

  // --- Not sent by the backend yet (API_REQUIREMENTS.md §B) ---
  phone?: string;
  whatsapp?: string; // digits only, e.g. "233201234567"
  email?: string;
  campusArea?: string; // "Near Commonwealth Hall"
}

// Menu prices come back in major units like everything else on this API
// (see money.ts), so they're normalised to minor units at the edge to match
// the rest of the app.
export interface MenuItem {
  name: string;
  description?: string;
  priceMinor: number;
}

export interface MenuSection {
  category: string;
  items: MenuItem[];
}

export interface FoodJointsQuery {
  [key: string]: string | number | boolean | undefined;
  page?: number;
  limit?: number;
  q?: string;
  cuisine?: string;
  priceTier?: number;
  dietary?: DietaryTag;
  lat?: number;
  lng?: number;
  openNow?: boolean;
}

export function listFoodJoints$(query: FoodJointsQuery = {}): Observable<ApiPage<FoodJoint>> {
  return apiRequest$<ApiPage<FoodJoint>>('/restaurants', { query, auth: false });
}

export function getFoodJoint$(slug: string): Observable<FoodJoint> {
  return apiRequest$<FoodJoint>(`/restaurants/${slug}`, { auth: false });
}

type RawMenuItem = { name: string; description?: string; price?: number; priceMinor?: number };

export function getMenu$(foodJointId: string): Observable<MenuSection[]> {
  return apiRequest$<{ sections: { category: string; items: RawMenuItem[] }[] }>(
    `/restaurants/${foodJointId}/menu`,
    { auth: false },
  ).pipe(
    map((result) =>
      result.sections.map((section) => ({
        category: section.category,
        items: section.items.map((item) => ({
          name: item.name,
          description: item.description,
          priceMinor: toMinorUnits(item.priceMinor, item.price),
        })),
      })),
    ),
  );
}

// --- Reviews (FR-2.8) — endpoints do not exist yet ---

export function listReviews$(foodJointId: string): Observable<ApiPage<Review>> {
  return apiRequest$<ApiPage<Review>>(`/restaurants/${foodJointId}/reviews`, { auth: false });
}

export function createReview$(foodJointId: string, input: CreateReviewInput): Observable<Review> {
  return apiRequest$<Review>(`/restaurants/${foodJointId}/reviews`, {
    method: 'POST',
    body: input,
  });
}

// --- Vendor writes (FR-2.7) — endpoints do not exist yet ---

export interface FoodJointInput {
  name: string;
  cuisine: string;
  priceTier: number;
  lat: number;
  lng: number;
  description?: string;
  campusArea?: string;
  phone?: string;
  whatsapp?: string;
  heroImageUrl?: string;
  // SRS §7: contact details are published only with the vendor's consent.
  contactConsent?: boolean;
}

export function createFoodJoint$(input: FoodJointInput): Observable<FoodJoint> {
  return apiRequest$<FoodJoint>('/restaurants', { method: 'POST', body: input });
}

export function updateFoodJoint$(id: string, input: Partial<FoodJointInput>): Observable<FoodJoint> {
  return apiRequest$<FoodJoint>(`/restaurants/${id}`, { method: 'PATCH', body: input });
}
