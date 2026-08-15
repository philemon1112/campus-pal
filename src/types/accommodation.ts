// SRS 6.3 — Accommodation & Room entities (Module M3, FR-ACC-01 to 12)
export interface Accommodation {
  accomId: string;
  providerId: string;
  name: string;
  type: string;
  starRating: number;
  latitude: number;
  longitude: number;
  description: string;
}

export interface Room {
  roomId: string;
  accomId: string;
  roomType: string;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
  availabilityCalendar: Record<string, boolean>; // date (ISO) -> available
}
