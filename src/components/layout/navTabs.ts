import {
  Briefcase,
  Compass,
  Home as HomeIcon,
  ShieldCheck,
  Store,
  User,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import type { UserRole } from '@/lib/api';

export interface NavTab {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

// Shared between BottomNav (mobile) and TopNav (tablet/desktop). "Bookings"
// (Calendar icon) was dropped — it was a dead placeholder duplicating
// My Trips (see DEVELOPMENT_LOG.md); BottomNav puts the SOS button in its
// old slot instead. /bookings redirects to /trips (see App.tsx).
const touristTabs: NavTab[] = [
  { to: ROUTES.home, label: 'Home', icon: HomeIcon, end: true },
  { to: ROUTES.explore, label: 'Explore', icon: Compass },
  { to: ROUTES.trips, label: 'My Trips', icon: Briefcase },
  { to: ROUTES.profile, label: 'Profile', icon: User },
];

// Operator and admin consoles are additive: a TOURIST (and a signed-out
// visitor) sees exactly the four tabs above. This is presentation only --
// the routes themselves are guarded by RoleGate, and the API enforces the
// role server-side regardless.
export function navTabsFor(role?: UserRole): NavTab[] {
  if (role === 'OPERATOR') {
    return [...touristTabs, { to: ROUTES.operator, label: 'Operator', icon: Store }];
  }
  if (role === 'ADMIN') {
    return [...touristTabs, { to: ROUTES.admin, label: 'Admin', icon: ShieldCheck }];
  }
  return touristTabs;
}
