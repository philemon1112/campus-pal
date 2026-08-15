import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopNav } from './TopNav';
import { SiteFooter } from './SiteFooter';

// Two genuinely different shells, one component.
//
// **Mobile (< md)** — a phone-width column (`max-w-md`) with the bottom tab
// bar, which carries a raised SOS button in its old "Bookings" slot (see
// navTabs.ts/BottomNav.tsx) rather than a separate floating button — an
// intentional Figma deviation for a safety-critical, always-reachable
// action (FR-EMRG-08), noted in DEVELOPMENT_LOG.md.
//
// This element used to carry `transform-gpu` to make it the containing block
// for `position: fixed` descendants, so they'd pin to the column's edges
// instead of the viewport's. **That silently broke the bottom nav:** a
// transformed ancestor makes `fixed` resolve against *that element*, and
// since this div grows with the page, `bottom-0` meant "bottom of the
// document" — so the tab bar scrolled away on any page taller than the
// viewport. The transform is gone; BottomNav now pins to the viewport and
// constrains its own contents with an inner `max-w-md` wrapper, which gets
// the column alignment without breaking fixed.
//
// **Desktop (md+)** — a real full-width web page. This used to stay a capped
// `max-w-6xl` column floating on the grey app background, which made every
// screen look like a stretched phone: dead grey gutters either side, and
// content stranded in a narrow strip because pages then applied their own
// caps *inside* that box. Now the shell spans the viewport, pages own their
// own `max-w-7xl` containers, and a real footer closes the page instead of
// it fading into empty space.
export function AppLayout() {
  return (
    <div className="relative mx-auto flex min-h-screen max-w-md flex-col bg-white dark:bg-neutral-950 md:max-w-none">
      <TopNav />
      {/* `md:pb-24` is the breathing room between page content and the
          footer — without it the footer reads as glued to the last section. */}
      <div className="flex-1 pb-20 md:pb-24">
        <Outlet />
      </div>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
