import {
  Bookmark,
  ChevronRight,
  HelpCircle,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Store,
  User,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { Link, NavLink, useNavigate, useOutlet } from 'react-router-dom';
import { getTokens } from '@/lib/api';
import { SkeletonCircle, SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ROUTES } from '@/lib/routes';
import { PersonalInfoPage } from '@/pages/PersonalInfoPage';

// Account surface (SRS FR-4.2/4.3).
//
// Every row that links somewhere links to a page that exists and works.
// "Help & Support" is the one inert row: SRS 2.6 asks for an in-app help/FAQ
// section, and there is no content or endpoint for one yet, so it renders
// dimmed rather than navigating to an empty page.
interface MenuRow {
  label: string;
  icon: ComponentType<{ className?: string }>;
  to?: string;
  roles?: string[];
}

const menuRows: MenuRow[] = [
  { label: 'Personal Info', icon: User, to: ROUTES.profilePersonalInfo },
  { label: 'Saved Places', icon: Bookmark, to: ROUTES.saved },
  { label: 'Past Conversations', icon: MessageSquare, to: ROUTES.assistantHistory },
  { label: 'My Food Joint', icon: Store, to: ROUTES.vendor, roles: ['VENDOR'] },
  { label: 'Campus Locations', icon: ShieldCheck, to: ROUTES.adminLocations, roles: ['ADMIN'] },
  { label: 'Help & Support', icon: HelpCircle },
];

function LoggedOutPrompt() {
  return (
    <div className="flex flex-col items-center gap-4 px-5 py-16 text-center">
      <User className="size-12 text-neutral-300 dark:text-neutral-700" />
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Log in to save places and keep your conversations. Explore and Food work without an account.
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
  // would duplicate a request the app has already made.
  const { user: profile, signOut } = useAuth();
  // Desktop shows the identity card + settings list and the selected row's
  // detail side by side (a nested route rendered via <Outlet/> in App.tsx);
  // mobile keeps the full-page drill-down feel, so it shows one or the
  // other, never both.
  const outlet = useOutlet();

  function handleLogOut() {
    signOut();
    navigate(ROUTES.explore);
  }

  const initial = profile?.fullName.trim().charAt(0).toUpperCase() || '?';
  const rows = menuRows.filter((row) => !row.roles || (profile && row.roles.includes(profile.role)));

  // The settings menu and Log Out button are entirely static — they render
  // on the first frame and never wait on a fetch. Only the header card's
  // avatar, name and email resolve.
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
                // text-base, h-5 for the email at text-sm) so nothing below
                // moves when these resolve.
                <SkeletonRegion label="Loading profile">
                  <SkeletonLine boxClassName="h-6" className="w-36" />
                  <SkeletonLine className="w-48" />
                </SkeletonRegion>
              )}
            </div>
          </div>

          {/* Desktop gets the icon toggle in TopNav; mobile has no top bar,
              so the full three-way picker lives here. */}
          <div className="mb-4 rounded-card border border-neutral-100 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
            <span className="mb-2 block font-medium text-ink-900 dark:text-white">Appearance</span>
            <ThemeToggle variant="segmented" />
          </div>

          <div className="mb-4 overflow-hidden rounded-card border border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            {rows.map((row, i) => {
              const content = (isActive?: boolean) => (
                <>
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-700/20">
                    <row.icon className="size-5" />
                  </div>
                  <span className="flex-1 font-medium text-ink-900 dark:text-white">
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
                i !== rows.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''
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
                <div
                  key={row.label}
                  title="Not available yet"
                  className={`${baseRowClass} opacity-60`}
                >
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
            // detail pane, defaulting to Personal Info. Hidden on mobile,
            // where hitting /profile should show only the settings list.
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
