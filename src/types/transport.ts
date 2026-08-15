// SRS 6.3 — Transport entity (Module M5, FR-TRANS-01 to 12)
export interface Transport {
  transportId: string;
  operatorId: string;
  vehicleType: string;
  route: string;
  farePerKm: number;
  capacity: number;
  availabilityStatus: 'Available' | 'Busy' | 'Offline';
}
