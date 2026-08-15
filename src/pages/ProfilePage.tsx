import {
  Bell,
  ChevronRight,
  CreditCard,
  HelpCircle,
  LogOut,
  MapPin,
  RefreshCw,
  Settings,
  User,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Link, NavLink, useNavigate, useOutlet } from 'react-router-dom';
import { getTokens, usersApi } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { SkeletonChip, SkeletonCircle, SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ROUTES } from '@/lib/routes';
import { PersonalInfoPage } from '@/pages/PersonalInfoPage';

// Built from a user-supplied screenshot of the settings menu ("profile-b");
// no screenshot exists for the header (avatar/name/loyalty), so that part
// is designed from the real data fields (GET /users/me + /users/me/loyalty)
// consistent with the rest of the app. Most menu rows have no backend at
// all (Travel Preferences, Payment Methods, Saved Places, Notifications,
// Help & Support) — left non-interactive per the user's call, matching Figma
// visually without dead-end fake navigation. The two rows that DO have
// backend support link to real pages: Personal Info (PATCH /users/me) and
// Emergency Contacts (GET/PUT /users/me/emergency-contacts).
interface MenuRow {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to?: string;
  danger?: boolean;
}

const menuRows: MenuRow[] = [
  { label: 'Personal Info', icon: User, to: ROUTES.profilePersonalInfo },
  { label: 'Travel Preferences', icon: Settings },
  { label: 'Payment Methods', icon: CreditCard },
  { label: 'Saved Places', icon: MapPin },
  { label: 'Notifications', icon: Bell },
  { label: 'Emergency Contacts', icon: Users, to: ROUTES.profileEmergencyContacts, danger: true },
  { label: 'Help & Support', icon: HelpCircle },
];

function LoggedOutPrompt() {
  return (
    <div className="flex flex-col items-center gap-4 px-5 py-16 text-center">
      <User className="size-12 text-neutral-300 dark:text-neutral-700" />
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Log in to see your profile, bookings, and loyalty points.
      </p>
      <Link
        to={ROUTES.auth.login}
        className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white"
      >
        Log in
      </Link>
    </div>
  );
}

function ProfileContent() {
  const navigate = useNavigate();
  // The profile comes from the shared auth context — fetching it again here
  // would duplicate a request the app has already made. Only loyalty, which
  // nothing else needs, is fetched by this page.
  const { user: profile, signOut } = useAuth();
  const { data: loyalty, status, retry } = useApiResource(() => usersApi.getMyLoyalty$());
  // Desktop shows the identity card + settings list and the selected row's
  // detail side by side (a nested route rendered via <Outlet/> in App.tsx);
  // mobile keeps the old full-page drill-down feel, so it shows one or the
  // other, never both.
  const outlet = useOutlet();

  function handleLogOut() {
    signOut();
    navigate(ROUTES.home);
  }

  const initial = profile?.fullName.trim().charAt(0).toUpperCase() || '?';

  // The settings menu and Log Out button are entirely static — they render
  // on the first frame and never wait on a fetch. Only the header card's
  // avatar, name, email and loyalty pill resolve.
  // Desktop is a two-column layout: identity card + settings list sticky on
  // the left, the selected row's detail on the right. It used to be one
  // ~400px column centred in a full-width page, which left most of the
  // screen empty.
  return (
    <div className="px-5 py-6 md:mx-auto md:max-w-5xl md:px-6 md:py-12 lg:px-8">
      <h1 className="mb-6 hidden text-3xl font-bold text-ink-900 dark:text-white md:block">
        Profile
      </h1>

      <div className="md:grid md:grid-cols-[320px_1fr] md:items-start md:gap-8">
        <div className={`md:sticky md:top-24 md:self-start ${outlet ? 'hidden md:block' : ''}`}>
          <div className="mb-6 flex items-center gap-4 rounded-card border border-neutral-100 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950 md:flex-col md:items-start md:gap-3 md:p-6">
            {profile ? (
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-2xl font-bold text-brand-600 dark:bg-brand-700/20 md:size-20 md:text-3xl">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    className="size-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>
            ) : (
              <SkeletonCircle className="size-16 shrink-0 md:size-20" />
            )}

            <div className="min-w-0 flex-1">
              {profile ? (
                <>
                  <div className="truncate font-bold text-ink-900 dark:text-white">
                    {profile.fullName}
                  </div>
                  <div className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                    {profile.email}
                  </div>
                </>
              ) : (
                // No gap and matched line boxes (h-6 for the bold name at
                // text-base, h-5 for the email at text-sm) so the loyalty pill
                // below doesn't move when these resolve.
                <SkeletonRegion label="Loading profile">
                  <SkeletonLine boxClassName="h-6" className="w-36" />
                  <SkeletonLine className="w-48" />
                </SkeletonRegion>
              )}

              {/* Loyalty resolves independently of the profile — its own small
                  boundary, so the name doesn't wait on it or vice versa. */}
              {loyalty ? (
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2.5 py-0.5 text-xs font-semibold text-accent-500">
                  {loyalty.tier} · {loyalty.points} pts
                </div>
              ) : (
                // h-5 matches the real pill's text-xs + py-0.5 box.
                <SkeletonChip boxClassName="h-5" className="mt-1.5 w-28" />
              )}
            </div>
          </div>

          {status === 'error' && (
            <div className="mb-4 flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              <span>Couldn't load your loyalty points.</span>
              <button
                type="button"
                onClick={retry}
                className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
              >
                <RefreshCw className="size-4" /> Retry
              </button>
            </div>
          )}

          {/* Desktop gets the icon toggle in TopNav; mobile has no top bar,
              so the full three-way picker lives here. */}
          <div className="mb-4 rounded-card border border-neutral-100 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
            <span className="mb-2 block font-medium text-ink-900 dark:text-white">Appearance</span>
            <ThemeToggle variant="segmented" />
          </div>

          <div className="mb-4 overflow-hidden rounded-card border border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            {menuRows.map((row, i) => {
              const content = (isActive?: boolean) => (
                <>
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                      row.danger
                        ? 'bg-danger-500/10 text-danger-500'
                        : 'bg-brand-50 text-brand-600 dark:bg-brand-700/20'
                    }`}
                  >
                    <row.icon className="size-5" />
                  </div>
                  <span
                    className={`flex-1 font-medium ${row.danger ? 'text-danger-500' : 'text-ink-900 dark:text-white'}`}
                  >
                    {row.label}
                  </span>
                  {row.to && (
                    <ChevronRight
                      className={`size-5 ${isActive ? 'text-brand-600 dark:text-brand-500' : 'text-neutral-300 dark:text-neutral-600'}`}
                    />
                  )}
                </>
              );
              const baseRowClass = `flex items-center gap-3 px-4 py-3.5 ${
                i !== menuRows.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''
              }`;
              return row.to ? (
                <NavLink
                  key={row.label}
                  to={row.to}
                  className={({ isActive }) =>
                    `${baseRowClass} ${isActive ? 'bg-brand-50 dark:bg-brand-700/10' : ''}`
                  }
                >
                  {({ isActive }) => content(isActive)}
                </NavLink>
              ) : (
                <div key={row.label} className={`${baseRowClass} opacity-60`}>
                  {content()}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleLogOut}
            className="flex w-full items-center gap-3 rounded-card border border-neutral-100 px-4 py-3.5 text-danger-500 dark:border-neutral-800"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-danger-500/10">
              <LogOut className="size-5" />
            </div>
            <span className="font-medium">Log Out</span>
          </button>
        </div>

        <div className="md:min-w-0">
          {outlet ?? (
            // No child route matched (bare /profile) — desktop still shows a
            // detail pane, defaulting to Personal Info (the one row with a
            // real page) rather than an empty state. Hidden on mobile, where
            // hitting /profile should show only the settings list, matching
            // the drill-down navigation the rest of the page uses there.
            <div className="hidden md:block">
              <PersonalInfoPage />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProfilePage() {
  if (!getTokens()) return <LoggedOutPrompt />;
  return <ProfileContent />;
}
