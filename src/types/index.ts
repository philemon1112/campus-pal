// SRS-aligned domain model (full 6-module vision, section 6.3 ER Diagram).
// The live backend only implements a subset of this (Destinations, Tours,
// Bookings, Payments, Reviews, Auth/Loyalty) — see src/lib/api/types.ts for
// types matching what's actually callable, used by API-backed modules.
// Names here intentionally mirror the SRS wording and may collide with
// src/lib/api/types.ts equivalents (e.g. UserRole, BookingStatus) — import
// from the module that matches what you're building against.
export * from './common';
export * from './user';
export * from './poi';
export * from './flight';
export * from './accommodation';
export * from './food';
export * from './transport';
export * from './emergency';
export * from './booking';
export * from './review';
export * from './itinerary';
