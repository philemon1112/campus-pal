import type { Observable } from 'rxjs';
import { apiRequest$ } from './client';

// Emergency contacts and nearby facilities, for Help & Support (SRS 2.6).
//
// Both endpoints are PUBLIC — a student in trouble must not hit a login wall,
// and FR-4.1 allows using the app without an account.
//
// Two things to know about this data:
//
//  1. `GET /emergency/contacts` returns Ghana's real national numbers (112,
//     191, 193, 192). These are correct and the reason this screen exists.
//  2. `GET /emergency/facilities` is a NATIONAL dataset inherited from the
//     tourism product, not a campus one. Unfiltered from Legon it returns
//     embassies first and reaches Tamale, 424km away. See FACILITY_RADIUS_KM
//     and CAMPUS_RELEVANT_TYPES below — neither is cosmetic.
//
// There is no University of Ghana Hospital, campus clinic or campus security
// post in the dataset, so the page says so rather than implying the nearest
// listed hospital is the one to walk to.

export interface EmergencyContact {
  label: string;
  number: string;
}

export type FacilityType = 'HOSPITAL' | 'CLINIC' | 'PHARMACY' | 'POLICE' | 'FIRE' | 'EMBASSY';

export interface EmergencyFacility {
  id: string;
  name: string;
  type: FacilityType;
  description?: string;
  lat: number;
  lng: number;
  phone?: string;
  open24h: boolean;
  distanceKm?: number; // only when lat/lng were supplied
}

export interface FacilitiesQuery {
  [key: string]: string | number | boolean | undefined;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  type?: FacilityType;
  country?: string;
}

export function listEmergencyContacts$(): Observable<EmergencyContact[]> {
  return apiRequest$<EmergencyContact[]>('/emergency/contacts', { auth: false });
}

export function listEmergencyFacilities$(
  query: FacilitiesQuery = {},
): Observable<EmergencyFacility[]> {
  return apiRequest$<EmergencyFacility[]>('/emergency/facilities', { query, auth: false });
}
