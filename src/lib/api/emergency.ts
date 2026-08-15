import type { Observable } from 'rxjs';
import { apiRequest$ } from './client';

// Emergency module. Facilities and contacts are **public** (no token) by
// design — someone in trouble may have an expired session, and this is the
// one part of the app that must never fail closed. Only SOS requires auth.

export type FacilityType =
  | 'HOSPITAL'
  | 'CLINIC'
  | 'PHARMACY'
  | 'POLICE'
  | 'FIRE'
  | 'EMBASSY';

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  description: string;
  lat: number;
  lng: number;
  phone: string;
  open24h: boolean;
  distanceKm?: number; // present only when lat/lng were supplied
}

export interface EmergencyContact {
  label: string;
  number: string;
}

export type SosKind = 'MEDICAL' | 'SECURITY' | 'FIRE' | 'OTHER';

export interface SosAlert {
  alertId: string;
  status: string;
  createdAt: string;
}

// Index signature so it satisfies the client's `query` param type.
export interface FacilitiesQuery {
  [key: string]: string | number | boolean | undefined;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  type?: FacilityType;
  country?: string;
}

export function listFacilities$(query: FacilitiesQuery = {}): Observable<Facility[]> {
  return apiRequest$<Facility[]>('/emergency/facilities', { query, auth: false });
}

export function listEmergencyContacts$(): Observable<EmergencyContact[]> {
  return apiRequest$<EmergencyContact[]>('/emergency/contacts', { auth: false });
}

// `alertId` is a client-generated UUID and the server dedupes on it, so a
// panicking user hammering the button raises one alert, not twenty. Generate
// it once per attempt and reuse it on retry.
export function triggerSos$(input: {
  alertId: string;
  lat: number;
  lng: number;
  kind: SosKind;
  note?: string;
}): Observable<SosAlert> {
  return apiRequest$<SosAlert>('/emergency/sos', { method: 'POST', body: input });
}

export function cancelSos$(alertId: string): Observable<SosAlert> {
  return apiRequest$<SosAlert>(`/emergency/sos/${alertId}/cancel`, { method: 'POST' });
}

// Personal emergency contacts (Profile → Emergency Contacts). PUT replaces
// the whole list — there is no per-contact endpoint, so the UI edits a local
// copy and saves it in one call.
//
// `email` matters: the API notes a contact with an email is the one actually
// notified on SOS (SMS isn't wired yet), so the form surfaces that.
export interface PersonalEmergencyContact {
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
}

export function getMyEmergencyContacts$(): Observable<PersonalEmergencyContact[]> {
  return apiRequest$<PersonalEmergencyContact[]>('/users/me/emergency-contacts');
}

export function replaceMyEmergencyContacts$(
  contacts: PersonalEmergencyContact[],
): Observable<PersonalEmergencyContact[]> {
  return apiRequest$<PersonalEmergencyContact[]>('/users/me/emergency-contacts', {
    method: 'PUT',
    body: { contacts },
  });
}

// Track an SOS alert that was already raised.
export function getSos$(alertId: string): Observable<SosAlert> {
  return apiRequest$<SosAlert>(`/emergency/sos/${alertId}`);
}
