import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '@/hooks/useTheme';

// Two presentations of the same control.
//
// `icon` — a single button in the desktop TopNav that flips light/dark.
// `segmented` — a three-way Light/Dark/System picker for the Profile
//   settings list, since mobile has no top navbar to host the icon button.
const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle({ variant = 'icon' }: { variant?: 'icon' | 'segmented' }) {
  const { preference, resolved, setPreference, toggle } = useTheme();

  if (variant === 'segmented') {
    return (
      <div
        role="radiogroup"
        aria-label="Theme"
        className="flex w-full gap-1 rounded-full bg-neutral-100 p-1 dark:bg-neutral-800"
      >
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={preference === value}
            onClick={() => setPreference(value)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold transition ${
              preference === value
                ? 'bg-white text-ink-900 shadow-sm dark:bg-neutral-950 dark:text-white'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            <Icon className="size-3.5 shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // The label states what pressing it does, not what's current — that's
      // the more useful thing for a screen reader on a toggle.
      aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-ink-900 transition hover:bg-neutral-200 dark:bg-neutral-900 dark:text-white dark:hover:bg-neutral-800"
    >
      {resolved === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
