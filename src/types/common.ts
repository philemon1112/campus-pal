// Shared enums referenced by SRS section 6.3 (ER Diagram) and section 3.1 (RBAC)

export type UserRole = 'Tourist' | 'ServiceProvider' | 'Administrator' | 'EmergencyResponder';

export type ServiceType =
  | 'POI'
  | 'Flight'
  | 'Accommodation'
  | 'Restaurant'
  | 'Transport';

export type BookingStatus =
  | 'Pending'
  | 'Confirmed'
  | 'CheckedIn'
  | 'Completed'
  | 'Cancelled'
  | 'Refunded';

export type PaymentStatus = 'Pending' | 'Authorized' | 'Paid' | 'Failed' | 'Refunded';

export type PaymentMethod =
  | 'Card'
  | 'PayPal'
  | 'BankTransfer'
  | 'MTNMoMo'
  | 'TelecelCash'
  | 'AirtelTigoMoney';

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}
