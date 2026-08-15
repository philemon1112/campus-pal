import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopNav } from './TopNav';
import { SiteFooter } from './SiteFooter';
import { AssistantPanel } from '@/modules/assistant/components/AssistantPanel';

// Two genuinely different shells, one component.
//
// **Mobile (< md)** — a phone-width column (`max-w-md`) with the bottom tab
// bar, which carries the raised "Ask CampusPal" button in its centre slot
// (see navTabs.ts/BottomNav.tsx). SRS §4.1 calls for a floating action
// button; putting it in the tab bar keeps it always reachable (FR-3.1)
// without covering page content.
//
// This element must NOT carry a CSS transform. A transformed ancestor
// becomes the containing block for `position: fixed` descendants, so
// BottomNav's `bottom-0` would resolve to the bottom of the *document*
// rather than the viewport, and the tab bar would scroll away on any page
// taller than the screen. BottomNav pins to the viewport and constrains its
// own contents with an inner `max-w-md` wrapper instead.
//
// **Desktop (md+)** — a real full-width web page. Pages own their own
// `max-w-7xl` containers and SiteFooter closes the page; the shell does not
// cap width, so an uncapped grid page will stretch edge to edge.
//
// AssistantPanel is mounted here rather than per-page so the conversation
// survives navigation — following a result the assistant found must not
// unmount the conversation that found it (FR-3.7).
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
      <AssistantPanel />
    </div>
  );
}
