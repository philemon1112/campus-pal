// Central route path registry — keep in sync with src/App.tsx route definitions
// and the bottom tab bar (src/components/layout/BottomNav.tsx). Naming follows
// the Figma prototype's own labels (Explore, Hotels, My Trips, ...).
export const ROUTES = {
  home: '/',
  explore: '/explore',
  flights: '/flights',
  flightResults: '/flights/results',
  hotels: '/hotels',
  food: '/food',
  transport: '/transport',
  transportActiveRide: '/transport/active-ride',
  emergency: '/emergency',
  trips: '/trips',
  // The bookings *list* lives at /trips -- `bookings` is kept because the
  // booking detail screen is /bookings/:reference, and /bookings itself
  // redirects to /trips (see App.tsx).
  bookings: '/bookings',
  itineraries: '/itineraries',
  profile: '/profile',
  profilePersonalInfo: '/profile/personal-info',
  profileEmergencyContacts: '/profile/emergency-contacts',
  // Role-gated consoles (RoleGate); hidden from the nav for other roles.
  operator: '/operator',
  admin: '/admin',
  adminDestinations: '/admin/destinations',
  auth: {
    login: '/login',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
    register: '/register',
  },
  paymentCallback: '/payments/callback',
} as const;
