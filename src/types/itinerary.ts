// SRS 6.3 — Itinerary entity (FR-POI-08, FR-SOC-05, FR-SOC-06)
export interface ItineraryDay {
  day: number;
  date?: string;
  items: {
    serviceType: string;
    serviceId: string;
    notes?: string;
  }[];
}

export interface Itinerary {
  itineraryId: string;
  userId: string;
  title: string;
  days: ItineraryDay[];
  sharedLink?: string;
  isPublic: boolean;
}
