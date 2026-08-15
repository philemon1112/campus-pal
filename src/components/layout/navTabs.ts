import {
  Bookmark,
  Compass,
  ShieldCheck,
  Store,
  User,
  Utensils,
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

// Shared between BottomNav (mobile) and TopNav (tablet/desktop).
//
// SRS §4.1 specifies two main tabs — Explore and Food Joints. Saved and
// Profile are the account surface, and the AI assistant is NOT here: it is a
// persistent floating button (FR-3.1) so it stays reachable from every
// screen, including ones that aren't tabs.
//
// The tab count is even on purpose: BottomNav splits this list down the
// middle and puts the assistant button in the gap.
const baseTabs: NavTab[] = [
  { to: ROUTES.explore, label: 'Explore', icon: Compass },
  { to: ROUTES.food, label: 'Food', icon: Utensils },
  { to: ROUTES.saved, label: 'Saved', icon: Bookmark },
  { to: ROUTES.profile, label: 'Profile', icon: User },
];

// Vendor and admin consoles are additive: a student, staff member or signed-
// out visitor sees exactly the four tabs above. This is presentation only —
// the routes are guarded by RoleGate and the API enforces roles server-side.
export function navTabsFor(role?: UserRole): NavTab[] {
  if (role === 'VENDOR') {
    return [...baseTabs, { to: ROUTES.vendor, label: 'My joint', icon: Store }];
  }
  if (role === 'ADMIN') {
    return [...baseTabs, { to: ROUTES.adminLocations, label: 'Admin', icon: ShieldCheck }];
  }
  return baseTabs;
}
