import type { BookingStatus, PaymentMethod, PaymentStatus, ServiceType } from './common';

// SRS 6.3 — Booking entity (FR-PAY-01 to 09, all module booking flows)
export interface Booking {
  bookingId: string;
  userId: string;
  serviceType: ServiceType;
  serviceId: string;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  totalPrice: number;
  bookingRef: string;
}

// SRS 6.3 — Payment entity (Section 3.8)
export interface Payment {
  paymentId: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  gatewayRef: string;
  status: PaymentStatus;
  paidAt?: string;
}
