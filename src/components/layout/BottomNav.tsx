import { NavLink } from 'react-router-dom';
import { navTabsFor, type NavTab } from './navTabs';
import { useAuth } from '@/hooks/useAuth';
import { AssistantFab } from '@/modules/assistant/components/AssistantFab';

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

// Mobile only (<md) — tablet/desktop use TopNav instead.
//
// The assistant button sits raised in the middle of the bar rather than
// floating over page content. SRS §4.1 describes a floating action button;
// this placement satisfies the same requirement (FR-3.1: reachable from all
// pages) without permanently obscuring a corner of every screen.
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
          <AssistantFab variant="raised" />
        </div>

        {rightTabs.map((tab) => (
          <TabLink key={tab.to} {...tab} />
        ))}
      </div>
    </nav>
  );
}
