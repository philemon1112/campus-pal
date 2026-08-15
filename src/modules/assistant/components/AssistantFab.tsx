import { Sparkles } from 'lucide-react';
import { useAssistant } from '@/hooks/useAssistant';

// FR-3.1 — the assistant icon is present on every page.
//
// Two placements, one component:
//   - `variant="raised"` sits in BottomNav's centre slot on mobile, so it
//     never floats over page content or covers a tab.
//   - `variant="inline"` is the desktop TopNav button.
export function AssistantFab({ variant = 'inline' }: { variant?: 'inline' | 'raised' }) {
  const { openPanel } = useAssistant();

  if (variant === 'raised') {
    return (
      <button
        type="button"
        onClick={openPanel}
        aria-label="Ask CampusPal"
        className="-mt-7 flex size-16 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 ring-4 ring-white transition hover:bg-brand-700 dark:ring-neutral-950"
      >
        <Sparkles className="size-6" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openPanel}
      className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
    >
      <Sparkles className="size-4" /> Ask CampusPal
    </button>
  );
}
