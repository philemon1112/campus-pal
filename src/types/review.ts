import type { ServiceType } from './common';

// SRS 6.3 — Review entity (Section 3.9, FR-SOC-01 to 07)
export interface Review {
  reviewId: string;
  userId: string;
  serviceType: ServiceType;
  serviceId: string;
  rating: number; // 1-5
  comment: string;
  photos: string[];
  createdAt: string;
}
