import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { apiRequest$ } from './client';
import { toMinorUnits } from './money';
import type { ApiPage, CreateReviewInput, Review } from './types';

// Food joints (SRS 3.2, FR-2.1 to FR-2.8).
//
// Fully backed now: listing, detail, menu, reviews and vendor writes.
//
// Two properties of this resource are load-bearing and easy to get wrong:
//
//   1. CONTACT DETAILS ARE CONSENT-GATED (SRS §7). `phone`, `whatsapp` and
//      `email` are omitted from the payload entirely — not null, not "" —
//      unless `contactConsent` is true. Gate the Contact bar on
//      `contactConsent`, then null-check each channel, because a vendor may
//      consent while publishing only one of the two numbers.
//   2. CAMPUS AREA IS A JOIN, not a string. `nearestLocation` points at a
//      real campus location (see locations.ts), which is what makes "near
//      Commonwealth Hall" renderable and `?nearestLocationSlug=` filterable.

export type DietaryTag = 'VEGETARIAN' | 'VEGAN' | 'HALAL' | 'GLUTEN_FREE';

export interface OpeningHours {
  day: number; // 0 = Sunday
  opens: string; // "11:00"
  closes: string; // "22:00"
}

// The campus landmark a joint sits by (FR-2.2, FR-2.3). A summary, not the
// full CampusLocation — enough to label and link it.
export interface NearestLocation {
  id: string;
  slug: string;
  name: string;
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
  nearestLocation?: NearestLocation;

  // SRS §7 — the gate itself, always present.
  contactConsent: boolean;
  // Present ONLY when contactConsent is true.
  phone?: string;
  whatsapp?: string; // digits only, e.g. "233201110006"
  email?: string;
}

// Menu prices are decimal cedis on the wire (`price: 25` = GHS 25.00), so
// they're normalised to minor units at the edge to match how the rest of the
// app handles money. See money.ts.
export interface MenuItem {
  name: string;
  description?: string;
  priceMinor: number;
  photoUrl?: string;
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
  // FR-2.2 — search food joints by campus location.
  nearestLocationId?: string;
  nearestLocationSlug?: string;
}

export function listFoodJoints$(query: FoodJointsQuery = {}): Observable<ApiPage<FoodJoint>> {
  return apiRequest$<ApiPage<FoodJoint>>('/restaurants', { query, auth: false });
}

export function getFoodJoint$(slug: string): Observable<FoodJoint> {
  return apiRequest$<FoodJoint>(`/restaurants/${slug}`, { auth: false });
}

// --- Menu ---

type RawMenuItem = {
  name: string;
  description?: string;
  price?: number;
  priceMinor?: number;
  photoUrl?: string;
};

type RawMenu = { sections: { category: string; items: RawMenuItem[] }[] };

function fromRawMenu(result: RawMenu): MenuSection[] {
  return result.sections.map((section) => ({
    category: section.category,
    items: section.items.map((item) => ({
      name: item.name,
      description: item.description,
      priceMinor: toMinorUnits(item.priceMinor, item.price),
      photoUrl: item.photoUrl,
    })),
  }));
}

export function getMenu$(foodJointId: string): Observable<MenuSection[]> {
  return apiRequest$<RawMenu>(`/restaurants/${foodJointId}/menu`, { auth: false }).pipe(
    map(fromRawMenu),
  );
}

// --- Reviews (FR-2.8) ---

export function listReviews$(foodJointId: string): Observable<ApiPage<Review>> {
  return apiRequest$<ApiPage<Review>>(`/restaurants/${foodJointId}/reviews`, { auth: false });
}

// One review per diner per joint — a second attempt is a 409, which the
// caller surfaces as "you've already reviewed this" rather than a failure.
export function createReview$(foodJointId: string, input: CreateReviewInput): Observable<Review> {
  return apiRequest$<Review>(`/restaurants/${foodJointId}/reviews`, {
    method: 'POST',
    body: input,
  });
}

// SRS §7 moderation — an administrator removes inappropriate feedback. The
// rating aggregate is recomputed server-side from the rows that remain.
export function deleteReview$(foodJointId: string, reviewId: string): Observable<null> {
  return apiRequest$<null>(`/restaurants/${foodJointId}/reviews/${reviewId}`, {
    method: 'DELETE',
  });
}

// --- Vendor writes (FR-2.7) ---

export interface FoodJointInput {
  name: string;
  cuisine: string;
  priceTier: number;
  description: string;
  lat: number;
  lng: number;
  heroImageUrl?: string;
  images?: string[];
  dietary?: DietaryTag[];
  openingHours?: OpeningHours[];
  // The campus location this joint sits by — an id, not free text.
  nearestLocationId?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  // SRS §7: contact details are published only with the vendor's consent.
  contactConsent: boolean;
}

// The slug is generated server-side from the name, so it is not sent.
//
// NOTE: the API whitelists DTO fields and rejects unknown ones with a 400 —
// don't spread extra client-side state into these payloads.
export function createFoodJoint$(input: FoodJointInput): Observable<FoodJoint> {
  return apiRequest$<FoodJoint>('/restaurants', { method: 'POST', body: input });
}

export function updateFoodJoint$(id: string, input: Partial<FoodJointInput>): Observable<FoodJoint> {
  return apiRequest$<FoodJoint>(`/restaurants/${id}`, { method: 'PATCH', body: input });
}

// The vendor console's read-back (FR-2.7): without this a vendor could only
// ever create a listing, never edit one.
export function listMyFoodJoints$(): Observable<ApiPage<FoodJoint>> {
  return apiRequest$<ApiPage<FoodJoint>>('/restaurants/mine', { query: { limit: 20 } });
}

// Whole-menu replace — every section must be sent each time. Prices go out
// as decimal cedis, matching what the API returns.
export function replaceMenu$(id: string, sections: MenuSection[]): Observable<MenuSection[]> {
  return apiRequest$<RawMenu>(`/restaurants/${id}/menu`, {
    method: 'PUT',
    body: {
      sections: sections.map((section) => ({
        category: section.category,
        items: section.items.map((item) => ({
          name: item.name,
          description: item.description || undefined,
          price: item.priceMinor / 100,
          photoUrl: item.photoUrl || undefined,
        })),
      })),
    },
  }).pipe(map(fromRawMenu));
}
