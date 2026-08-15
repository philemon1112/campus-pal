import { AlertCircle } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { navTabsFor } from './navTabs';
import { ROUTES } from '@/lib/routes';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { getInitials } from '@/lib/format';

// Tablet/desktop only (md+) — mobile uses BottomNav instead. No Figma
// desktop reference exists; built consistent with the mobile nav's
// labels, icons, and brand tokens.
export function TopNav() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 hidden border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90 md:block">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-6 lg:px-8">
        <NavLink to={ROUTES.home} className="text-lg font-bold text-ink-900 dark:text-white">
          Voyago
        </NavLink>

        <nav className="flex flex-1 items-center gap-1">
          {navTabsFor(user?.role).map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-700/20 dark:text-brand-500'
                    : 'text-neutral-500 hover:text-ink-900 dark:text-neutral-400 dark:hover:text-white'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <ThemeToggle />

        <NavLink
          to={ROUTES.emergency}
          className="flex items-center gap-1.5 rounded-full bg-danger-500 px-4 py-2 text-sm font-semibold text-white hover:bg-danger-600"
        >
          <AlertCircle className="size-4" /> Emergency
        </NavLink>

        {user ? (
          <NavLink
            to={ROUTES.profile}
            aria-label={user.fullName}
            className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-sm font-semibold text-ink-900 dark:bg-neutral-900 dark:text-white"
          >
            {/* Falls back to initials when there's no photo — and also if the
                photo 404s, since a broken avatar shouldn't leave an empty
                circle in the nav. */}
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="size-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              getInitials(user.fullName)
            )}
          </NavLink>
        ) : (
          <NavLink
            to={ROUTES.auth.login}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Log in
          </NavLink>
        )}
      </div>
    </header>
  );
}
