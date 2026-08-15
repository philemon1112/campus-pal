import { NavLink } from 'react-router-dom';
import { navTabsFor, type NavTab } from './navTabs';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/routes';

function TabLink({ to, label, icon: Icon, end }: NavTab) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
          isActive ? 'text-brand-600 dark:text-brand-500' : 'text-neutral-400 dark:text-neutral-500'
        }`
      }
    >
      <Icon className="size-5" strokeWidth={2} />
      {label}
    </NavLink>
  );
}

// Mobile only (<md) — tablet/desktop use TopNav instead. SOS sits raised in
// the tab bar's old "Bookings" slot (see navTabs.ts) rather than floating
// over page content — an intentional Figma deviation for a safety-critical,
// always-reachable action (FR-EMRG-08), noted in DEVELOPMENT_LOG.md.
//
// Pinned to the *viewport*, so it stays put through any amount of scrolling.
// The bar itself spans the full width (it reads as a native app tab bar);
// the inner wrapper keeps the tabs aligned to the same `max-w-md` column the
// page content uses. Don't reintroduce a transform on an ancestor — that
// makes `fixed` resolve against the ancestor and the bar scrolls away.
export function BottomNav() {
  const { user } = useAuth();
  const tabs = navTabsFor(user?.role);
  const half = Math.ceil(tabs.length / 2);
  const leftTabs = tabs.slice(0, half);
  const rightTabs = tabs.slice(half);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 md:hidden">
      <div className="mx-auto flex max-w-md items-stretch">
        {leftTabs.map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}

        <div className="flex flex-1 items-center justify-center">
          <NavLink
            to={ROUTES.emergency}
            aria-label="Emergency SOS"
            className="-mt-7 flex size-16 items-center justify-center rounded-full bg-danger-500 text-xs font-bold text-white shadow-lg shadow-danger-500/30 ring-4 ring-white transition hover:bg-danger-600 dark:ring-neutral-950"
          >
            SOS
          </NavLink>
        </div>

        {rightTabs.map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}
      </div>
    </nav>
  );
}
