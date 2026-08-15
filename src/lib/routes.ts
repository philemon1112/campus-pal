// Central route path registry — keep in sync with src/App.tsx route
// definitions and the tab bar (src/components/layout/navTabs.ts).
//
// SRS §4.1 asks for two main tabs (Explore, Food Joints) plus a persistent
// AI icon. The assistant deliberately has NO route of its own: it is a panel
// that opens over whatever page you are on, so it can act on that context.
// `assistantHistory` is the separate "past conversations" screen (FR-3.8).
export const ROUTES = {
  home: '/',
  explore: '/explore',
  food: '/food',
  saved: '/saved',
  assistantHistory: '/assistant/history',
  profile: '/profile',
  profilePersonalInfo: '/profile/personal-info',
  profileHelp: '/profile/help',
  // Role-gated consoles (RoleGate); hidden from the nav for other roles.
  vendor: '/vendor',
  adminLocations: '/admin/locations',
  auth: {
    login: '/login',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
    register: '/register',
  },
} as const;
