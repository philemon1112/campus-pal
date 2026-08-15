// SRS 6.3 — POI entity (Module M1, FR-POI-01 to 12)
export interface Poi {
  poiId: string;
  name: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  openingHours: string;
  entryFee: number;
  rating: number;
}
