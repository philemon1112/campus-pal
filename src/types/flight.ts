// SRS 6.3 — Flight entity (Module M2, FR-FLT-01 to 12)
export interface Flight {
  flightId: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  seatsAvailable: number;
  cabinClass: 'Economy' | 'Business' | 'First';
}
