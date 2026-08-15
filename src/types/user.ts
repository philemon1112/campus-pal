import type { UserRole } from './common';

// SRS 6.3 — User entity (FR-AUTH-01 to 08)
export interface User {
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  passportInfo?: string; // encrypted at rest, AES-256 (NFR-SEC-04)
  loyaltyPoints: number;
  createdAt: string;
}

// SRS 6.3 — EmergencyContact entity (FR-EMRG-04)
export interface EmergencyContact {
  contactId: string;
  userId: string;
  name: string;
  phone: string;
  relationship: string;
}
