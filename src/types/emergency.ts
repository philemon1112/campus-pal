// SRS 6.3 — MedicalFacility entity (Module M6, FR-EMRG-01 to 11)
export interface MedicalFacility {
  facilityId: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  phone: string;
  emergencyCapacity: number;
  specialisations: string[];
}
